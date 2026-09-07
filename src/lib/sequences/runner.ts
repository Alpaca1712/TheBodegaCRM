import { db } from '@/lib/db'
import { evaluateStepCondition } from '@/lib/ai/conditions'
import { EmailSendError, latestEmailForLead, sendEmail, type OutboundAttachment } from '@/lib/email/send'
import { renderLeadMagnetPdf } from '@/lib/magnets/pdf'
import type { Email, Lead, LeadMagnet, Sequence, SequenceEnrollment, SequenceStep } from '@/types'
import { advanceEnrollment, leadBlockedReason, transitionEnrollment } from './enrollments'
import { isWithinSendWindow, nextSendableTime, normalizeSendWindow } from './send-window'
import { listSteps } from './service'
import { findUnresolvedTokens, leadTemplateVars, renderTemplate } from './templating'

export interface RunOptions {
  sequence_id?: string
  limit?: number
  now?: Date
  /** Skip the send-window check (manual runs). */
  ignore_window?: boolean
}

export interface RunOutcome {
  enrollment_id: string
  lead_id: string
  step_id: string | null
  result: 'sent' | 'skipped' | 'deferred' | 'exited' | 'completed' | 'failed'
  detail?: string
  email_id?: string | null
}

export interface RunSummary {
  processed: number
  sent: number
  skipped: number
  deferred: number
  exited: number
  failed: number
  outcomes: RunOutcome[]
}

const TERMINAL_LEAD_STAGES = new Set(['customer', 'lost', 'meeting_booked', 'interested', 'not_interested', 'unsubscribed', 'bounced'])

async function recordExecution(input: {
  enrollment: SequenceEnrollment
  step: SequenceStep
  status: 'sent' | 'skipped' | 'failed'
  email_id?: string | null
  skip_reason?: string | null
  error?: string | null
  condition_result?: Record<string, unknown> | null
}) {
  const { error } = await db().from('step_executions').upsert({
    enrollment_id: input.enrollment.id,
    step_id: input.step.id,
    sequence_id: input.enrollment.sequence_id,
    lead_id: input.enrollment.lead_id,
    status: input.status,
    email_id: input.email_id ?? null,
    skip_reason: input.skip_reason ?? null,
    error: input.error ?? null,
    condition_result: input.condition_result ?? null,
    executed_at: new Date().toISOString(),
  }, { onConflict: 'enrollment_id,step_id' })
  if (error) throw error
}

async function defer(enrollment: SequenceEnrollment, until: Date) {
  const { error } = await db().from('sequence_enrollments').update({ next_step_due_at: until.toISOString() }).eq('id', enrollment.id)
  if (error) throw error
}

async function sentTodayCount(sequence: Sequence, now: Date) {
  const start = new Date(now)
  start.setUTCHours(0, 0, 0, 0)
  const { count, error } = await db()
    .from('emails')
    .select('id', { count: 'exact', head: true })
    .eq('sequence_id', sequence.id)
    .eq('direction', 'outbound')
    .gte('sent_at', start.toISOString())
  if (error) throw error
  return count ?? 0
}

async function threadForLead(leadId: string): Promise<Email[]> {
  const { data, error } = await db()
    .from('emails')
    .select('*')
    .eq('lead_id', leadId)
    .in('status', ['sent', 'delivered', 'delivery_delayed', 'received'])
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []) as Email[]
}

async function loadMagnet(id: string | null): Promise<LeadMagnet | null> {
  if (!id) return null
  const { data } = await db().from('lead_magnets').select('*').eq('id', id).maybeSingle()
  return (data as LeadMagnet) || null
}

export interface RenderedStep {
  step_id: string
  position: number
  subject: string
  text: string
  threaded: boolean
  attachment: string | null
  unresolved_tokens: string[]
}

export function renderStepForLead(step: SequenceStep, lead: Lead, previousSubject: string | null, magnet: LeadMagnet | null): RenderedStep {
  const vars = leadTemplateVars(lead)
  const threaded = step.thread_with_previous && Boolean(previousSubject)
  const subjectTemplate = step.subject?.trim() || ''
  const subject = subjectTemplate
    ? renderTemplate(subjectTemplate, vars)
    : threaded && previousSubject
      ? (/^re:/i.test(previousSubject) ? previousSubject : `Re: ${previousSubject}`)
      : ''
  return {
    step_id: step.id,
    position: step.position,
    subject,
    text: renderTemplate(step.body, vars),
    threaded,
    attachment: magnet ? magnet.name : null,
    unresolved_tokens: [...new Set([...findUnresolvedTokens(step.body, vars), ...findUnresolvedTokens(subjectTemplate, vars)])],
  }
}

async function processEnrollment(enrollment: SequenceEnrollment, sequence: Sequence, options: RunOptions): Promise<RunOutcome> {
  const now = options.now ?? new Date()
  const base = { enrollment_id: enrollment.id, lead_id: enrollment.lead_id, step_id: enrollment.next_step_id }

  const { data: leadRow } = await db().from('leads').select('*').eq('id', enrollment.lead_id).maybeSingle()
  const lead = leadRow as Lead | null
  if (!lead) {
    await transitionEnrollment(enrollment.id, 'exited', 'Lead deleted')
    return { ...base, result: 'exited', detail: 'lead deleted' }
  }

  const blocked = leadBlockedReason(lead)
  if (blocked) {
    const status =
      blocked === 'bounced' || blocked === 'invalid_email' || blocked === 'disposable_email'
        ? 'bounced'
        : blocked === 'unverified_email'
          ? 'exited'
          : 'unsubscribed'
    await transitionEnrollment(enrollment.id, status, blocked)
    return { ...base, result: 'exited', detail: blocked }
  }
  if (TERMINAL_LEAD_STAGES.has(lead.stage)) {
    await transitionEnrollment(enrollment.id, lead.stage === 'bounced' ? 'bounced' : 'exited', `Lead stage is ${lead.stage}`)
    return { ...base, result: 'exited', detail: `stage ${lead.stage}` }
  }
  if (sequence.stop_on_reply && lead.last_inbound_at && new Date(lead.last_inbound_at) > new Date(enrollment.enrolled_at)) {
    await transitionEnrollment(enrollment.id, 'replied', 'Lead replied')
    return { ...base, result: 'exited', detail: 'replied' }
  }

  const steps = await listSteps(sequence.id)
  const step = steps.find((candidate) => candidate.id === enrollment.next_step_id && candidate.active)
  if (!step) {
    const { data: lastExecution } = await db()
      .from('step_executions')
      .select('step_id')
      .eq('enrollment_id', enrollment.id)
      .order('executed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const lastPosition = steps.find((candidate) => candidate.id === lastExecution?.step_id)?.position ?? 0
    const advanced = await advanceEnrollment(enrollment, sequence, steps, lastPosition, now)
    return { ...base, result: advanced.status === 'completed' ? 'completed' : 'deferred', detail: 'step missing or inactive; re-planned' }
  }

  const window = normalizeSendWindow(sequence.send_window)
  if (!options.ignore_window && !isWithinSendWindow(window, now)) {
    const until = nextSendableTime(window, now)
    await defer(enrollment, until)
    return { ...base, result: 'deferred', detail: `outside send window until ${until.toISOString()}` }
  }
  if (sequence.daily_send_limit && (await sentTodayCount(sequence, now)) >= sequence.daily_send_limit) {
    const until = new Date(now.getTime() + 60 * 60_000)
    await defer(enrollment, until)
    return { ...base, result: 'deferred', detail: 'daily send limit reached' }
  }

  const thread = await threadForLead(lead.id)

  if (step.condition_prompt?.trim()) {
    const verdict = await evaluateStepCondition(step, lead, thread)
    if (!verdict.should_send) {
      await recordExecution({ enrollment, step, status: 'skipped', skip_reason: verdict.reason, condition_result: verdict as unknown as Record<string, unknown> })
      const advanced = await advanceEnrollment(enrollment, sequence, steps, step.position, now)
      return { ...base, result: advanced.status === 'completed' ? 'completed' : 'skipped', detail: `condition false: ${verdict.reason}` }
    }
  }

  const previous = step.thread_with_previous
    ? (await latestEmailForLead(lead.id, { threadId: thread.find((email) => email.enrollment_id === enrollment.id)?.thread_id || null }))
      || (thread.length ? thread[thread.length - 1] : null)
    : null
  const magnet = await loadMagnet(step.lead_magnet_id)
  const rendered = renderStepForLead(step, lead, previous?.subject || null, magnet)

  const attachments: OutboundAttachment[] = []
  if (magnet) {
    const pdf = await renderLeadMagnetPdf(magnet, lead)
    attachments.push({ filename: pdf.filename, content: pdf.content, contentType: 'application/pdf', lead_magnet_id: magnet.id })
  }

  try {
    const email = await sendEmail({
      lead,
      subject: rendered.subject,
      body: rendered.text,
      body_format: step.body_format,
      from_name: sequence.from_name,
      from_email: sequence.from_email,
      reply_to: sequence.reply_to,
      in_reply_to_email: step.thread_with_previous ? previous : null,
      attachments,
      source: 'sequence',
      sequence_id: sequence.id,
      step_id: step.id,
      enrollment_id: enrollment.id,
    })
    await recordExecution({ enrollment, step, status: 'sent', email_id: email.id })
    await db().from('sequence_enrollments').update({ steps_sent: enrollment.steps_sent + 1 }).eq('id', enrollment.id)
    const advanced = await advanceEnrollment({ ...enrollment, steps_sent: enrollment.steps_sent + 1 }, sequence, steps, step.position, now)
    return { ...base, step_id: step.id, result: 'sent', email_id: email.id, detail: advanced.status === 'completed' ? 'sequence completed' : undefined }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'send failed'
    await recordExecution({ enrollment, step, status: 'failed', error: message, email_id: error instanceof EmailSendError ? error.email.id : null })
    if (error instanceof EmailSendError) {
      await defer(enrollment, new Date(now.getTime() + 30 * 60_000))
      return { ...base, step_id: step.id, result: 'failed', detail: `${message}; retrying in 30 minutes` }
    }
    await transitionEnrollment(enrollment.id, 'exited', message)
    return { ...base, step_id: step.id, result: 'exited', detail: message }
  }
}

/**
 * Sends every due step across active sequences. Enrollments are processed one
 * at a time so a single failure never blocks the batch.
 */
export async function runDueSteps(options: RunOptions = {}): Promise<RunSummary> {
  const now = options.now ?? new Date()
  const limit = options.limit ?? 50

  let query = db()
    .from('sequence_enrollments')
    .select('*, sequence:sequences!inner(*)')
    .eq('status', 'active')
    .eq('sequences.status', 'active')
    .lte('next_step_due_at', now.toISOString())
    .order('next_step_due_at', { ascending: true })
    .limit(limit)
  if (options.sequence_id) query = query.eq('sequence_id', options.sequence_id)

  const { data, error } = await query
  if (error) throw error

  const summary: RunSummary = { processed: 0, sent: 0, skipped: 0, deferred: 0, exited: 0, failed: 0, outcomes: [] }
  for (const row of (data || []) as (SequenceEnrollment & { sequence: Sequence | Sequence[] })[]) {
    const { sequence: rawSequence, ...enrollment } = row
    const sequence = Array.isArray(rawSequence) ? rawSequence[0] : rawSequence
    summary.processed += 1
    try {
      const outcome = await processEnrollment(enrollment as SequenceEnrollment, sequence, { ...options, now })
      summary.outcomes.push(outcome)
      if (outcome.result === 'sent') summary.sent += 1
      else if (outcome.result === 'skipped') summary.skipped += 1
      else if (outcome.result === 'deferred') summary.deferred += 1
      else if (outcome.result === 'failed') summary.failed += 1
      else summary.exited += 1
    } catch (error) {
      summary.failed += 1
      summary.outcomes.push({
        enrollment_id: enrollment.id,
        lead_id: enrollment.lead_id,
        step_id: enrollment.next_step_id,
        result: 'failed',
        detail: error instanceof Error ? error.message : 'unknown error',
      })
      console.error('[sequence-runner] enrollment failed', enrollment.id, error)
    }
  }
  return summary
}

/** Renders every active step for a lead so an agent can proofread before enrolling. */
export async function previewSequenceForLead(sequence: Sequence, lead: Lead) {
  const steps = (await listSteps(sequence.id)).filter((step) => step.active)
  const window = normalizeSendWindow(sequence.send_window)
  const out: (RenderedStep & { scheduled_for: string; delay_minutes: number; condition_prompt: string | null })[] = []
  let cursor = new Date()
  let previousSubject: string | null = null
  for (const step of steps) {
    cursor = nextSendableTime(window, new Date(cursor.getTime() + step.delay_minutes * 60_000))
    const magnet = await loadMagnet(step.lead_magnet_id)
    const rendered = renderStepForLead(step, lead, previousSubject, magnet)
    previousSubject = rendered.subject || previousSubject
    out.push({ ...rendered, scheduled_for: cursor.toISOString(), delay_minutes: step.delay_minutes, condition_prompt: step.condition_prompt })
  }
  return out
}
