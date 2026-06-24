import { createClient } from '@/lib/supabase/server'
import { ensureOpportunityForCampaignMeeting } from '@/lib/deals/server'
import {
  CAMPAIGN_TEMPLATES,
  DEFAULT_TEMPLATE_BY_CAMPAIGN_TYPE,
  type Campaign,
  type CampaignEventType,
  type CampaignStage,
  type CampaignTemplate,
  type CampaignTemplateKey,
  type CampaignType,
} from '@/types/campaigns'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export function slugifyCampaignName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
}

export function resolveCampaignTemplate(templateKey: CampaignTemplateKey | undefined, campaignType: CampaignType): CampaignTemplate {
  return CAMPAIGN_TEMPLATES[templateKey || DEFAULT_TEMPLATE_BY_CAMPAIGN_TYPE[campaignType]]
}

export function stageForCampaignEvent(templateKey: CampaignTemplateKey | string | null | undefined, eventType: CampaignEventType) {
  const template = templateKey && templateKey in CAMPAIGN_TEMPLATES
    ? CAMPAIGN_TEMPLATES[templateKey as CampaignTemplateKey]
    : null

  const directOffer = template?.key === 'email_outbound_direct_offer'
  const inboundPlaybook = template?.key === 'linkedin_inbound_playbook'
  const conference = template?.key === 'conference_in_person_hormozi'

  const stageKey = (() => {
    switch (eventType) {
      case 'research_completed':
        return conference ? 'pre_event_research' : 'researched'
      case 'email_drafted':
        return directOffer ? 'offer_email_drafted' : 'initial_email_drafted'
      case 'email_sent':
        return conference ? 'pre_event_outreach_sent' : directOffer ? 'offer_email_sent' : 'initial_email_sent'
      case 'pre_event_outreach_sent':
        return 'pre_event_outreach_sent'
      case 'conference_targeted':
        return 'target_account_list'
      case 'meeting_scheduled':
        return 'meeting_scheduled'
      case 'in_person_conversation':
      case 'badge_scanned':
        return 'in_person_conversation'
      case 'diagnostic_offered':
        return 'diagnostic_offered'
      case 'post_event_follow_up_sent':
        return 'post_event_follow_up_sent'
      case 'meeting_booked':
        return conference ? 'discovery_booked' : 'meeting_booked'
      case 'email_replied':
      case 'lead_magnet_requested':
        return conference ? 'meeting_scheduled' : inboundPlaybook ? 'playbook_opt_in' : 'replied_interested'
      case 'lead_magnet_sent':
        return 'lead_magnet_sent'
      case 'challenge_link_clicked':
        return 'challenge_link_clicked'
      case 'application_started':
        return 'application_started'
      case 'application_completed':
        return 'application_completed'
      case 'no_response':
        return 'no_response'
      case 'not_interested':
        return 'not_interested'
      default:
        return null
    }
  })()

  if (!stageKey || !template) return stageKey
  return template.stages.some((stage) => stage.key === stageKey) ? stageKey : null
}

export async function getCampaignByIdOrSlug(
  supabase: SupabaseServerClient,
  orgId: string,
  input: { campaignId?: string | null; campaignSlug?: string | null },
) {
  if (!input.campaignId && !input.campaignSlug) return null

  let query = supabase
    .from('campaigns')
    .select('*')
    .eq('org_id', orgId)
    .limit(1)

  query = input.campaignId
    ? query.eq('id', input.campaignId)
    : query.eq('slug', input.campaignSlug)

  const { data, error } = await query.single()
  if (error || !data) return null
  return data as Campaign
}

export async function getCampaignTemplateKey(supabase: SupabaseServerClient, campaignId: string, orgId: string) {
  const { data } = await supabase
    .from('campaign_pipelines')
    .select('template_key')
    .eq('campaign_id', campaignId)
    .eq('org_id', orgId)
    .single()

  return (data?.template_key || null) as CampaignTemplateKey | null
}

export async function enrollLeadInCampaign({
  supabase,
  campaign,
  leadId,
  userId,
  orgId,
  stageKey,
  metadata,
}: {
  supabase: SupabaseServerClient
  campaign: Campaign
  leadId: string
  userId: string
  orgId: string
  stageKey?: string | null
  metadata?: Record<string, unknown>
}) {
  const { data: existing } = await supabase
    .from('campaign_enrollments')
    .select('*')
    .eq('campaign_id', campaign.id)
    .eq('lead_id', leadId)
    .eq('org_id', orgId)
    .maybeSingle()

  if (existing) return existing

  const { data: firstStage } = await supabase
    .from('campaign_stages')
    .select('stage_key')
    .eq('campaign_id', campaign.id)
    .eq('org_id', orgId)
    .order('position', { ascending: true })
    .limit(1)
    .single()

  const insert = {
    campaign_id: campaign.id,
    lead_id: leadId,
    org_id: orgId,
    user_id: userId,
    stage_key: stageKey || firstStage?.stage_key || 'research_needed',
    metadata: metadata || {},
    last_event_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('campaign_enrollments')
    .insert(insert)
    .select()
    .single()

  if (error) throw error

  await recordCampaignEvent({
    supabase,
    campaignId: campaign.id,
    enrollmentId: data.id,
    leadId,
    orgId,
    userId,
    eventType: 'lead_added',
    stageKey: insert.stage_key,
    metadata,
    advance: false,
  })

  return data
}

export async function recordCampaignEvent({
  supabase,
  campaignId,
  enrollmentId,
  leadId,
  orgId,
  userId,
  eventType,
  stageKey,
  metadata,
  advance = true,
}: {
  supabase: SupabaseServerClient
  campaignId: string
  enrollmentId?: string | null
  leadId?: string | null
  orgId: string
  userId: string
  eventType: CampaignEventType
  stageKey?: string | null
  metadata?: Record<string, unknown>
  advance?: boolean
}) {
  const templateKey = await getCampaignTemplateKey(supabase, campaignId, orgId)
  const now = new Date().toISOString()

  let resolvedEnrollmentId = enrollmentId || null
  let lockedStageKey: string | null = null

  if (resolvedEnrollmentId) {
    const { data: enrollment } = await supabase
      .from('campaign_enrollments')
      .select('id,status,stage_key')
      .eq('id', resolvedEnrollmentId)
      .eq('campaign_id', campaignId)
      .eq('org_id', orgId)
      .maybeSingle()

    if (enrollment?.status === 'completed') lockedStageKey = enrollment.stage_key
  }

  if (!resolvedEnrollmentId && leadId) {
    const { data: enrollment } = await supabase
      .from('campaign_enrollments')
      .select('id,status,stage_key')
      .eq('campaign_id', campaignId)
      .eq('lead_id', leadId)
      .eq('org_id', orgId)
      .maybeSingle()
    resolvedEnrollmentId = enrollment?.id || null
    if (enrollment?.status === 'completed') lockedStageKey = enrollment.stage_key
  }

  const nextStageKey = lockedStageKey || stageKey || stageForCampaignEvent(templateKey, eventType)

  if (advance && !lockedStageKey && resolvedEnrollmentId && nextStageKey) {
    const { data: stage } = await supabase
      .from('campaign_stages')
      .select('stage_key,is_terminal,is_goal')
      .eq('campaign_id', campaignId)
      .eq('org_id', orgId)
      .eq('stage_key', nextStageKey)
      .maybeSingle()

    if (stage) {
      const status = stage.is_goal
        ? 'completed'
        : stage.is_terminal
          ? 'exited'
          : 'active'

      await supabase
        .from('campaign_enrollments')
        .update({
          stage_key: nextStageKey,
          status,
          completed_at: stage.is_goal ? now : null,
          last_event_at: now,
        })
        .eq('id', resolvedEnrollmentId)
        .eq('org_id', orgId)
    }
  }

  const { data, error } = await supabase
    .from('campaign_events')
    .insert({
      campaign_id: campaignId,
      enrollment_id: resolvedEnrollmentId,
      lead_id: leadId || null,
      org_id: orgId,
      user_id: userId,
      event_type: eventType,
      stage_key: nextStageKey,
      metadata: metadata || {},
    })
    .select()
    .single()

  if (error) throw error
  if (
    leadId &&
    resolvedEnrollmentId &&
    (eventType === 'meeting_booked' || nextStageKey === 'meeting_booked' || nextStageKey === 'discovery_booked')
  ) {
    await supabase
      .from('leads')
      .update({ stage: 'meeting_booked' })
      .eq('id', leadId)
      .eq('org_id', orgId)
      .not('stage', 'in', '(closed_won,closed_lost)')

    await ensureOpportunityForCampaignMeeting({
      supabase,
      orgId,
      userId,
      leadId,
      campaignId,
      campaignEnrollmentId: resolvedEnrollmentId,
      metadata: {
        campaign_event_id: data.id,
        campaign_stage_key: nextStageKey,
        ...metadata,
      },
    })
  }
  return data
}

export function emptyCampaignMetrics() {
  return {
    leads_enrolled: 0,
    initial_emails_sent: 0,
    replies: 0,
    lead_magnets_sent: 0,
    applications_completed: 0,
    meetings_booked: 0,
  }
}

export function campaignMetricsFromRows(
  enrollments: Array<{ campaign_id: string; stage_key?: string | null }>,
  events: Array<{ campaign_id: string; event_type: CampaignEventType | string }>,
  campaignId: string,
) {
  const metrics = emptyCampaignMetrics()
  const campaignEnrollments = enrollments.filter((row) => row.campaign_id === campaignId)
  metrics.leads_enrolled = campaignEnrollments.length
  metrics.meetings_booked = campaignEnrollments.filter((row) => row.stage_key === 'meeting_booked' || row.stage_key === 'discovery_booked').length

  for (const event of events) {
    if (event.campaign_id !== campaignId) continue
    if (event.event_type === 'email_sent' || event.event_type === 'pre_event_outreach_sent') metrics.initial_emails_sent += 1
    if (event.event_type === 'email_replied') metrics.replies += 1
    if (event.event_type === 'lead_magnet_sent') metrics.lead_magnets_sent += 1
    if (event.event_type === 'application_completed') metrics.applications_completed += 1
  }

  return metrics
}

export function isGoalStage(stage: Pick<CampaignStage, 'is_goal'> | null | undefined) {
  return Boolean(stage?.is_goal)
}
