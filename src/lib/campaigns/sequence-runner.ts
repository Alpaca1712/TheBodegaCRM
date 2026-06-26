import type { SupabaseClient } from '@supabase/supabase-js'
import { GmailTokenExpiredError, refreshAccessToken, sendGmailMessage } from '@/lib/api/gmail'
import { recordCampaignEvent } from '@/lib/campaigns/server'
import { renderCampaignTemplate } from '@/lib/campaigns/automation'
import { buildChallengeTrackingUrl, ensureLeadToken } from '@/lib/landing-links/server'
import { isMissingColumn, isMissingRelation, omitColumn } from '@/lib/supabase/missing-column'
import type { Campaign, CampaignAutomationStep, CampaignEventType } from '@/types/campaigns'
import type { Lead } from '@/types/leads'

type SequenceLead = Pick<
  Lead,
  'id' | 'contact_name' | 'company_name' | 'contact_email' | 'contact_title' | 'lead_token' | 'stage'
>

interface SequenceEnrollment {
  id: string
  campaign_id: string
  lead_id: string
  org_id: string
  user_id: string
  stage_key: string
  status: 'active' | 'completed' | 'exited'
  enrolled_at: string
  updated_at: string
  last_event_at: string | null
  lead: SequenceLead | null
}

interface RawSequenceEnrollment extends Omit<SequenceEnrollment, 'lead'> {
  lead: SequenceLead | SequenceLead[] | null
}

interface SequenceEvent {
  id: string
  enrollment_id: string | null
  lead_id: string | null
  event_type: CampaignEventType
  stage_key: string | null
  occurred_at: string
}

interface SequenceExecution {
  id: string
  campaign_sequence_step_id: string
  campaign_enrollment_id: string
  status: 'scheduled' | 'sent' | 'skipped' | 'failed'
  due_at: string
  error_message: string | null
}

interface EmailAccount {
  id: string
  user_id: string
  email_address: string
  access_token: string
  refresh_token: string
  token_expires_at: string
}

interface LeadThread {
  lead_id: string
  gmail_thread_id: string | null
  created_at: string
}

export interface CampaignSequenceRunResult {
  campaign_id: string
  due: number
  sent: number
  skipped: number
  failed: number
  errors: Array<{ lead_id?: string; step_id?: string; message: string }>
}

function campaignEventForEmail(emailType: CampaignAutomationStep['email_type']): CampaignEventType {
  if (emailType === 'lead_magnet') return 'lead_magnet_sent'
  return 'email_sent'
}

function addMinutes(value: string, minutes: number) {
  return new Date(new Date(value).getTime() + minutes * 60_000)
}

function campaignStepAttachments(step: CampaignAutomationStep) {
  const attachments = step.metadata?.attachments
  if (!Array.isArray(attachments)) return []

  return attachments.filter((attachment): attachment is NonNullable<CampaignAutomationStep['metadata']['attachments']>[number] => {
    return typeof attachment?.name === 'string' && (typeof attachment?.url === 'string' || typeof attachment?.data === 'string')
  })
}

function appendAttachmentLinks({
  body,
  step,
  lead,
  challengeLink,
  leadMagnetName,
}: {
  body: string
  step: CampaignAutomationStep
  lead: SequenceLead
  challengeLink: string
  leadMagnetName: string
}) {
  const renderedAttachments = campaignStepAttachments(step)
    .filter((attachment) => attachment.url)
    .map((attachment) => {
      const name = renderCampaignTemplate({
        template: attachment.name,
        lead,
        challengeLink,
        leadMagnetName,
      }).trim()
      const url = renderCampaignTemplate({
        template: attachment.url || '',
        lead,
        challengeLink,
        leadMagnetName,
      }).trim()
      return name && url ? { name, url } : null
    })
    .filter((attachment): attachment is { name: string; url: string } => Boolean(attachment))

  if (renderedAttachments.length === 0) return body

  const links = renderedAttachments.map((attachment) => `- ${attachment.name}: ${attachment.url}`).join('\n')
  return `${body.trim()}\n\nAttachments:\n${links}`
}

function renderFileAttachments({
  step,
  lead,
  challengeLink,
  leadMagnetName,
}: {
  step: CampaignAutomationStep
  lead: SequenceLead
  challengeLink: string
  leadMagnetName: string
}) {
  return campaignStepAttachments(step)
    .filter((attachment) => attachment.data)
    .map((attachment) => {
      const filename = renderCampaignTemplate({
        template: attachment.name,
        lead,
        challengeLink,
        leadMagnetName,
      }).trim()

      return filename && attachment.data
        ? {
            filename,
            contentType: attachment.mime_type || 'application/octet-stream',
            data: attachment.data,
          }
        : null
    })
    .filter((attachment): attachment is { filename: string; contentType: string; data: string } => Boolean(attachment))
}

function executionKey(stepId: string, enrollmentId: string) {
  return `${stepId}:${enrollmentId}`
}

function eventOwnerKey(event: Pick<SequenceEvent, 'enrollment_id' | 'lead_id'>) {
  return event.enrollment_id || event.lead_id || ''
}

function firstStageEventByOwner(events: SequenceEvent[]) {
  const byOwnerAndStage = new Map<string, SequenceEvent>()

  for (const event of events) {
    if (!event.stage_key) continue
    const owner = eventOwnerKey(event)
    if (!owner) continue
    const key = `${owner}:${event.stage_key}`
    if (!byOwnerAndStage.has(key)) byOwnerAndStage.set(key, event)
  }

  return byOwnerAndStage
}

function repliedOwners(events: SequenceEvent[]) {
  const owners = new Set<string>()
  for (const event of events) {
    if (event.event_type !== 'email_replied') continue
    if (event.enrollment_id) owners.add(event.enrollment_id)
    if (event.lead_id) owners.add(event.lead_id)
  }
  return owners
}

function normalizeEnrollment(row: RawSequenceEnrollment): SequenceEnrollment {
  return {
    ...row,
    lead: Array.isArray(row.lead) ? row.lead[0] || null : row.lead,
  }
}

async function getSendingAccount(supabase: SupabaseClient, userId: string) {
  const { data: account, error } = await supabase
    .from('email_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('sync_enabled', true)
    .order('last_synced_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!account) return null

  const typedAccount = account as EmailAccount
  let accessToken = typedAccount.access_token
  const expiresAt = new Date(typedAccount.token_expires_at)

  if (expiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
    const newTokens = await refreshAccessToken(typedAccount.refresh_token)
    accessToken = newTokens.access_token
    await supabase
      .from('email_accounts')
      .update({
        access_token: newTokens.access_token,
        token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
      })
      .eq('id', typedAccount.id)
      .eq('user_id', userId)
  }

  return { account: typedAccount, accessToken }
}

async function insertSentLeadEmail({
  supabase,
  campaignId,
  orgId,
  userId,
  leadId,
  step,
  subject,
  body,
  sentAt,
  sent,
  account,
  toAddress,
}: {
  supabase: SupabaseClient
  campaignId: string
  orgId: string
  userId: string
  leadId: string
  step: CampaignAutomationStep
  subject: string
  body: string
  sentAt: string
  sent: { id: string; threadId: string }
  account: EmailAccount
  toAddress: string
}) {
  const insertPayload = {
    lead_id: leadId,
    user_id: userId,
    org_id: orgId,
    campaign_id: campaignId,
    email_type: step.email_type,
    cta_type: null,
    subject,
    body,
    direction: 'outbound',
    sent_at: sentAt,
    gmail_message_id: sent.id,
    gmail_thread_id: sent.threadId,
    from_address: account.email_address,
    to_address: toAddress,
    sent_via: 'gmail',
  }

  let inserted = await supabase
    .from('lead_emails')
    .insert(insertPayload)
    .select()
    .single()

  if (isMissingColumn(inserted.error, 'sent_via')) {
    inserted = await supabase
      .from('lead_emails')
      .insert(omitColumn(insertPayload, 'sent_via'))
      .select()
      .single()
  }

  if (isMissingColumn(inserted.error, 'campaign_id')) {
    inserted = await supabase
      .from('lead_emails')
      .insert(omitColumn(omitColumn(insertPayload, 'campaign_id'), 'sent_via'))
      .select()
      .single()
  }

  if (inserted.error) throw inserted.error
  return inserted.data as { id: string }
}

async function updateExecution(
  supabase: SupabaseClient,
  executionId: string,
  updates: Record<string, unknown>,
) {
  const { error } = await supabase
    .from('campaign_sequence_executions')
    .update({ ...updates, executed_at: new Date().toISOString() })
    .eq('id', executionId)

  if (error) throw error
}

async function scheduleExecution({
  supabase,
  existingExecution,
  campaignId,
  step,
  enrollment,
  orgId,
  userId,
  dueAt,
}: {
  supabase: SupabaseClient
  existingExecution?: SequenceExecution
  campaignId: string
  step: CampaignAutomationStep
  enrollment: SequenceEnrollment
  orgId: string
  userId: string
  dueAt: Date
}) {
  const payload = {
    campaign_id: campaignId,
    campaign_sequence_step_id: step.id,
    campaign_enrollment_id: enrollment.id,
    lead_id: enrollment.lead_id,
    org_id: orgId,
    user_id: userId,
    status: 'scheduled',
    due_at: dueAt.toISOString(),
    executed_at: null,
    error_message: null,
    metadata: { stage_key: step.trigger_stage_key },
  }

  if (existingExecution) {
    const { data, error } = await supabase
      .from('campaign_sequence_executions')
      .update(payload)
      .eq('id', existingExecution.id)
      .select('id')
      .single()

    if (error) throw error
    return data as { id: string }
  }

  const { data, error } = await supabase
    .from('campaign_sequence_executions')
    .insert(payload)
    .select('id')
    .single()

  if (error) throw error
  return data as { id: string }
}

async function markSkippedExecution({
  supabase,
  existingExecution,
  campaignId,
  step,
  enrollment,
  orgId,
  userId,
  dueAt,
  now,
  metadata,
}: {
  supabase: SupabaseClient
  existingExecution?: SequenceExecution
  campaignId: string
  step: CampaignAutomationStep
  enrollment: SequenceEnrollment
  orgId: string
  userId: string
  dueAt: Date
  now: Date
  metadata: Record<string, unknown>
}) {
  const payload = {
    campaign_id: campaignId,
    campaign_sequence_step_id: step.id,
    campaign_enrollment_id: enrollment.id,
    lead_id: enrollment.lead_id,
    org_id: orgId,
    user_id: userId,
    status: 'skipped',
    due_at: dueAt.toISOString(),
    executed_at: now.toISOString(),
    error_message: null,
    metadata,
  }

  if (existingExecution) {
    const { data, error } = await supabase
      .from('campaign_sequence_executions')
      .update(payload)
      .eq('id', existingExecution.id)
      .select('id')
      .single()

    if (error) throw error
    return data as { id: string }
  }

  const { data, error } = await supabase
    .from('campaign_sequence_executions')
    .insert(payload)
    .select('id')
    .single()

  if (error) throw error
  return data as { id: string }
}

export async function runCampaignSequence({
  supabase,
  campaignId,
  orgId,
  now = new Date(),
  limit = 50,
}: {
  supabase: SupabaseClient
  campaignId: string
  orgId: string
  now?: Date
  limit?: number
}): Promise<CampaignSequenceRunResult> {
  const result: CampaignSequenceRunResult = {
    campaign_id: campaignId,
    due: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  }

  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('org_id', orgId)
    .single()

  if (campaignError || !campaign) throw campaignError || new Error('Campaign not found')
  const typedCampaign = campaign as Campaign
  if (typedCampaign.status !== 'active') return result

  const { data: steps, error: stepsError } = await supabase
    .from('campaign_sequence_steps')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('org_id', orgId)
    .eq('active', true)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })

  if (stepsError && isMissingRelation(stepsError, 'campaign_sequence_steps')) return result
  if (stepsError) throw stepsError
  const activeSteps = (steps || []) as CampaignAutomationStep[]
  if (activeSteps.length === 0) return result

  const triggerStages = Array.from(new Set(activeSteps.map((step) => step.trigger_stage_key)))
  const { data: enrollments, error: enrollmentsError } = await supabase
    .from('campaign_enrollments')
    .select(`
      id,
      campaign_id,
      lead_id,
      org_id,
      user_id,
      stage_key,
      status,
      enrolled_at,
      updated_at,
      last_event_at,
      lead:leads (
        id,
        contact_name,
        company_name,
        contact_email,
        contact_title,
        lead_token,
        stage
      )
    `)
    .eq('campaign_id', campaignId)
    .eq('org_id', orgId)
    .eq('status', 'active')
    .in('stage_key', triggerStages)

  if (enrollmentsError) throw enrollmentsError
  const activeEnrollments = ((enrollments || []) as unknown as RawSequenceEnrollment[]).map(normalizeEnrollment)
  if (activeEnrollments.length === 0) return result

  const leadIds = activeEnrollments.map((enrollment) => enrollment.lead_id)
  const [{ data: executions, error: executionsError }, { data: events, error: eventsError }, { data: threadRows, error: threadsError }] =
    await Promise.all([
      supabase
        .from('campaign_sequence_executions')
        .select('id,campaign_sequence_step_id,campaign_enrollment_id,status,due_at,error_message')
        .eq('campaign_id', campaignId)
        .eq('org_id', orgId),
      supabase
        .from('campaign_events')
        .select('id,enrollment_id,lead_id,event_type,stage_key,occurred_at')
        .eq('campaign_id', campaignId)
        .eq('org_id', orgId)
        .order('occurred_at', { ascending: true }),
      supabase
        .from('lead_emails')
        .select('lead_id,gmail_thread_id,created_at')
        .eq('org_id', orgId)
        .in('lead_id', leadIds)
        .not('gmail_thread_id', 'is', null)
        .order('created_at', { ascending: false }),
    ])

  if (executionsError) throw executionsError
  if (eventsError) throw eventsError
  if (threadsError) throw threadsError

  const executionByKey = new Map(
    ((executions || []) as SequenceExecution[]).map((execution) => [
      executionKey(execution.campaign_sequence_step_id, execution.campaign_enrollment_id),
      execution,
    ]),
  )
  const eventRows = (events || []) as SequenceEvent[]
  const stageEvents = firstStageEventByOwner(eventRows)
  const ownersWithReplies = repliedOwners(eventRows)
  const latestThreadByLead = new Map<string, string>()
  for (const thread of (threadRows || []) as LeadThread[]) {
    if (thread.gmail_thread_id && !latestThreadByLead.has(thread.lead_id)) {
      latestThreadByLead.set(thread.lead_id, thread.gmail_thread_id)
    }
  }

  let sendingContext: Awaited<ReturnType<typeof getSendingAccount>> | undefined

  for (const step of activeSteps) {
    for (const enrollment of activeEnrollments) {
      if (result.due >= limit) return result
      if (enrollment.stage_key !== step.trigger_stage_key) continue
      const existingExecution = executionByKey.get(executionKey(step.id, enrollment.id))
      if (existingExecution && ['sent', 'skipped'].includes(existingExecution.status)) continue

      const lead = enrollment.lead
      const exactStageEvent = stageEvents.get(`${enrollment.id}:${step.trigger_stage_key}`)
      const leadStageEvent = stageEvents.get(`${enrollment.lead_id}:${step.trigger_stage_key}`)
      const stageStartedAt =
        exactStageEvent?.occurred_at ||
        leadStageEvent?.occurred_at ||
        enrollment.last_event_at ||
        enrollment.updated_at ||
        enrollment.enrolled_at
      const dueAt = addMinutes(stageStartedAt, step.wait_minutes)
      if (dueAt > now) continue

      if (step.stop_on_reply && (ownersWithReplies.has(enrollment.id) || ownersWithReplies.has(enrollment.lead_id))) {
        await markSkippedExecution({
          supabase,
          existingExecution,
          campaignId,
          step,
          enrollment,
          orgId,
          userId: typedCampaign.user_id,
          dueAt,
          now,
          metadata: { reason: 'lead_replied' },
        })
        result.due += 1
        result.skipped += 1
        continue
      }

      if (!lead?.contact_email) {
        result.due += 1
        result.skipped += 1
        result.errors.push({ lead_id: enrollment.lead_id, step_id: step.id, message: 'Lead has no email address' })
        continue
      }

      if (step.channel !== 'email') {
        await markSkippedExecution({
          supabase,
          existingExecution,
          campaignId,
          step,
          enrollment,
          orgId,
          userId: typedCampaign.user_id,
          dueAt,
          now,
          metadata: { reason: 'non_email_channel', channel: step.channel },
        })
        result.due += 1
        result.skipped += 1
        continue
      }

      if (sendingContext === undefined) {
        sendingContext = await getSendingAccount(supabase, typedCampaign.user_id)
      }

      if (!sendingContext) {
        throw Object.assign(
          new Error('No Gmail account connected. Connect Gmail before enabling email sequence steps.'),
          { code: 'NO_GMAIL_ACCOUNT' },
        )
      }

      const execution = await scheduleExecution({
        supabase,
        existingExecution,
        campaignId,
        step,
        enrollment,
        orgId,
        userId: typedCampaign.user_id,
        dueAt,
      })

      result.due += 1

      try {
        const leadToken = await ensureLeadToken({
          supabase,
          leadId: enrollment.lead_id,
          orgId,
          existingToken: lead.lead_token,
        })
        const challengeLink = buildChallengeTrackingUrl({ leadToken, campaignId })
        const leadMagnetName = typedCampaign.lead_magnet_name || 'Free Pentest Challenge'
        const subject = renderCampaignTemplate({
          template: step.subject_template,
          lead,
          challengeLink,
          leadMagnetName,
        }).trim() || leadMagnetName
        const body = renderCampaignTemplate({
          template: step.body_template,
          lead,
          challengeLink,
          leadMagnetName,
        }).trim()
        const bodyWithAttachments = appendAttachmentLinks({
          body,
          step,
          lead,
          challengeLink,
          leadMagnetName,
        })
        const gmailAttachments = renderFileAttachments({
          step,
          lead,
          challengeLink,
          leadMagnetName,
        })

        if (!bodyWithAttachments) throw new Error('Sequence step has no email body')
        if (!sendingContext) throw new Error('No Gmail account connected')

        const sent = await sendGmailMessage(sendingContext.accessToken, {
          from: sendingContext.account.email_address,
          to: lead.contact_email,
          subject,
          body: bodyWithAttachments,
          threadId: latestThreadByLead.get(enrollment.lead_id) || null,
          attachments: gmailAttachments,
        })
        const sentAt = new Date().toISOString()
        const email = await insertSentLeadEmail({
          supabase,
          campaignId,
          orgId,
          userId: typedCampaign.user_id,
          leadId: enrollment.lead_id,
          step,
          subject,
          body: bodyWithAttachments,
          sentAt,
          sent,
          account: sendingContext.account,
          toAddress: lead.contact_email,
        })

        await recordCampaignEvent({
          supabase,
          campaignId,
          enrollmentId: enrollment.id,
          leadId: enrollment.lead_id,
          orgId,
          userId: typedCampaign.user_id,
          eventType: campaignEventForEmail(step.email_type),
          stageKey: step.move_to_stage_key || undefined,
          metadata: {
            source: 'campaign_sequence',
            sequence_step_id: step.id,
            sequence_execution_id: execution.id,
            lead_email_id: email.id,
            email_type: step.email_type,
            gmail_message_id: sent.id,
            gmail_thread_id: sent.threadId,
          },
        })

        const leadStage = step.move_to_stage_key === 'nurture_lost' ? 'no_response' : 'email_sent'
        if (!['replied', 'meeting_booked', 'meeting_held', 'closed_won', 'closed_lost'].includes(lead.stage)) {
          await supabase
            .from('leads')
            .update({ stage: leadStage, last_outbound_at: sentAt, last_contacted_at: sentAt })
            .eq('id', enrollment.lead_id)
            .eq('org_id', orgId)
        }

        await updateExecution(supabase, execution.id, {
          status: 'sent',
          lead_email_id: email.id,
          metadata: { stage_key: step.trigger_stage_key, moved_to_stage_key: step.move_to_stage_key },
        })
        executionByKey.set(executionKey(step.id, enrollment.id), {
          id: execution.id,
          campaign_sequence_step_id: step.id,
          campaign_enrollment_id: enrollment.id,
          status: 'sent',
          due_at: dueAt.toISOString(),
          error_message: null,
        })
        result.sent += 1
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to run sequence step'
        await updateExecution(supabase, execution.id, {
          status: 'failed',
          error_message: message,
          metadata: { stage_key: step.trigger_stage_key },
        })
        result.failed += 1
        result.errors.push({ lead_id: enrollment.lead_id, step_id: step.id, message })
      }
    }
  }

  return result
}

export { GmailTokenExpiredError }
