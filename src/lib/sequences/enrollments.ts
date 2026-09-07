import { db } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { leadSendBlockReason } from '@/lib/leads/email-guard'
import { findLeadByEmail, getLead } from '@/lib/leads/service'
import type { EnrollmentStatus, Lead, Sequence, SequenceEnrollment, SequenceStep } from '@/types'
import { nextSendableTime, normalizeSendWindow } from './send-window'
import { listSteps, resolveSequence } from './service'
import type { EnrollInput, EnrollmentAction } from './schemas'

export function firstActiveStep(steps: SequenceStep[], afterPosition = 0) {
  return steps.find((step) => step.active && step.position > afterPosition) || null
}

export function dueAtForStep(sequence: Sequence, step: SequenceStep, from: Date) {
  const raw = new Date(from.getTime() + step.delay_minutes * 60_000)
  return nextSendableTime(normalizeSendWindow(sequence.send_window), raw)
}

export function leadBlockedReason(lead: Lead): string | null {
  return leadSendBlockReason(lead)
}

export async function liveEnrollmentForLead(leadId: string): Promise<SequenceEnrollment | null> {
  const { data, error } = await db()
    .from('sequence_enrollments')
    .select('*')
    .eq('lead_id', leadId)
    .in('status', ['active', 'paused'])
    .maybeSingle()
  if (error) throw error
  return (data as SequenceEnrollment) || null
}

export interface EnrollResult {
  enrolled: SequenceEnrollment[]
  skipped: { lead_id: string | null; email: string | null; reason: string }[]
}

export async function enrollLeads(sequenceIdOrSlug: string, input: EnrollInput): Promise<EnrollResult> {
  const sequence = await resolveSequence(sequenceIdOrSlug)
  if (sequence.status === 'archived') throw ApiError.unprocessable('Cannot enroll into an archived sequence')
  const steps = await listSteps(sequence.id)
  const first = firstActiveStep(steps)
  if (!first) throw ApiError.unprocessable('Sequence has no active steps')

  const result: EnrollResult = { enrolled: [], skipped: [] }
  const startAt = input.start_at ? new Date(input.start_at) : new Date()

  const leads: (Lead | { missing: string })[] = []
  for (const id of input.lead_ids || []) {
    try {
      leads.push(await getLead(id))
    } catch {
      result.skipped.push({ lead_id: id, email: null, reason: 'lead not found' })
    }
  }
  for (const email of input.emails || []) {
    const lead = await findLeadByEmail(email)
    if (lead) leads.push(lead)
    else result.skipped.push({ lead_id: null, email, reason: 'lead not found' })
  }

  for (const lead of leads) {
    if ('missing' in lead) continue
    const blocked = leadBlockedReason(lead)
    if (blocked) {
      result.skipped.push({ lead_id: lead.id, email: lead.email, reason: blocked })
      continue
    }
    const live = await liveEnrollmentForLead(lead.id)
    if (live) {
      if (live.sequence_id === sequence.id) {
        result.skipped.push({ lead_id: lead.id, email: lead.email, reason: 'already enrolled in this sequence' })
        continue
      }
      if (!input.replace_existing) {
        result.skipped.push({ lead_id: lead.id, email: lead.email, reason: `already in another live sequence (${live.sequence_id}); pass replace_existing=true` })
        continue
      }
      await transitionEnrollment(live.id, 'exited', 'Replaced by enrollment in another sequence')
    }

    const { data, error } = await db()
      .from('sequence_enrollments')
      .insert({
        sequence_id: sequence.id,
        lead_id: lead.id,
        status: 'active',
        steps_sent: 0,
        next_step_id: first.id,
        next_step_due_at: dueAtForStep(sequence, first, startAt).toISOString(),
        enrolled_at: startAt.toISOString(),
      })
      .select('*')
      .single()
    if (error) {
      result.skipped.push({ lead_id: lead.id, email: lead.email, reason: error.message })
      continue
    }
    result.enrolled.push(data as SequenceEnrollment)
  }
  return result
}

export async function transitionEnrollment(id: string, status: EnrollmentStatus, reason?: string | null) {
  const terminal = ['completed', 'replied', 'bounced', 'unsubscribed', 'exited'].includes(status)
  const { data, error } = await db()
    .from('sequence_enrollments')
    .update({
      status,
      exit_reason: reason ?? null,
      ...(terminal ? { exited_at: new Date().toISOString(), next_step_due_at: null } : {}),
      ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as SequenceEnrollment
}

/** Ends every live enrollment for a lead (reply, bounce, unsubscribe, complaint). */
export async function stopEnrollmentsForLead(leadId: string, status: 'replied' | 'bounced' | 'unsubscribed' | 'exited', reason: string) {
  const { data, error } = await db()
    .from('sequence_enrollments')
    .select('id, sequence_id, sequences!inner(stop_on_reply)')
    .eq('lead_id', leadId)
    .in('status', ['active', 'paused'])
  if (error) throw error
  for (const row of (data || []) as unknown as { id: string; sequences: { stop_on_reply: boolean } | { stop_on_reply: boolean }[] }[]) {
    const sequence = Array.isArray(row.sequences) ? row.sequences[0] : row.sequences
    if (status === 'replied' && sequence && !sequence.stop_on_reply) continue
    await transitionEnrollment(row.id, status, reason)
  }
}

export async function getEnrollment(id: string): Promise<SequenceEnrollment> {
  const { data, error } = await db().from('sequence_enrollments').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) throw ApiError.notFound('Enrollment not found')
  return data as SequenceEnrollment
}

export async function listEnrollments(sequenceId: string, query: { status?: string; limit: number; offset: number }) {
  let builder = db()
    .from('sequence_enrollments')
    .select('*, lead:leads(id, email, full_name, company_name, stage)', { count: 'exact' })
    .eq('sequence_id', sequenceId)
  if (query.status) builder = builder.eq('status', query.status)
  const { data, error, count } = await builder
    .order('enrolled_at', { ascending: false })
    .range(query.offset, query.offset + query.limit - 1)
  if (error) throw error
  return { data: (data || []) as (SequenceEnrollment & { lead: Pick<Lead, 'id' | 'email' | 'full_name' | 'company_name' | 'stage'> | null })[], total: count ?? 0 }
}

export async function applyEnrollmentAction(id: string, action: EnrollmentAction): Promise<SequenceEnrollment> {
  const enrollment = await getEnrollment(id)
  const live = enrollment.status === 'active' || enrollment.status === 'paused'

  switch (action.action) {
    case 'pause':
      if (enrollment.status !== 'active') throw ApiError.unprocessable('Only active enrollments can be paused')
      return transitionEnrollment(id, 'paused', action.reason || 'Paused')
    case 'resume': {
      if (enrollment.status !== 'paused') throw ApiError.unprocessable('Only paused enrollments can be resumed')
      const sequence = await resolveSequence(enrollment.sequence_id)
      const steps = await listSteps(sequence.id)
      const step = steps.find((candidate) => candidate.id === enrollment.next_step_id) || firstActiveStep(steps, await lastSentPosition(enrollment))
      if (!step) return transitionEnrollment(id, 'completed', 'No remaining steps')
      const due = dueAtForStep(sequence, step, new Date())
      const { data, error } = await db()
        .from('sequence_enrollments')
        .update({ status: 'active', exit_reason: null, next_step_id: step.id, next_step_due_at: due.toISOString() })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data as SequenceEnrollment
    }
    case 'exit':
      if (!live) throw ApiError.unprocessable('Enrollment is already finished')
      return transitionEnrollment(id, 'exited', action.reason || 'Exited manually')
    case 'skip_step': {
      if (!live) throw ApiError.unprocessable('Enrollment is already finished')
      const sequence = await resolveSequence(enrollment.sequence_id)
      const steps = await listSteps(sequence.id)
      const current = steps.find((candidate) => candidate.id === enrollment.next_step_id)
      if (current) {
        await db().from('step_executions').upsert({
          enrollment_id: id,
          step_id: current.id,
          sequence_id: sequence.id,
          lead_id: enrollment.lead_id,
          status: 'skipped',
          skip_reason: action.reason || 'Skipped manually',
        }, { onConflict: 'enrollment_id,step_id' })
      }
      return advanceEnrollment(enrollment, sequence, steps, current?.position ?? (await lastSentPosition(enrollment)))
    }
    case 'reschedule': {
      if (!live) throw ApiError.unprocessable('Enrollment is already finished')
      if (!action.next_step_due_at) throw ApiError.badRequest('next_step_due_at is required')
      const { data, error } = await db()
        .from('sequence_enrollments')
        .update({ next_step_due_at: action.next_step_due_at })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data as SequenceEnrollment
    }
    default:
      throw ApiError.badRequest('Unknown action')
  }
}

async function lastSentPosition(enrollment: SequenceEnrollment) {
  const { data } = await db()
    .from('step_executions')
    .select('step_id, sequence_steps!inner(position)')
    .eq('enrollment_id', enrollment.id)
    .order('executed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const step = (data as unknown as { sequence_steps?: { position: number } | { position: number }[] } | null)?.sequence_steps
  if (!step) return 0
  return Array.isArray(step) ? step[0]?.position ?? 0 : step.position
}

/** Moves the enrollment to the next active step after `afterPosition`, or completes it. */
export async function advanceEnrollment(
  enrollment: SequenceEnrollment,
  sequence: Sequence,
  steps: SequenceStep[],
  afterPosition: number,
  from = new Date(),
): Promise<SequenceEnrollment> {
  const next = firstActiveStep(steps, afterPosition)
  if (!next) return transitionEnrollment(enrollment.id, 'completed', null)
  const { data, error } = await db()
    .from('sequence_enrollments')
    .update({ next_step_id: next.id, next_step_due_at: dueAtForStep(sequence, next, from).toISOString() })
    .eq('id', enrollment.id)
    .select('*')
    .single()
  if (error) throw error
  return data as SequenceEnrollment
}
