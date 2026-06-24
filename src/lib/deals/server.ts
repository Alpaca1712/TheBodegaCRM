import { createClient } from '@/lib/supabase/server'
import { DEAL_STAGE_PROBABILITY, type DealStage, type Opportunity } from '@/types/deals'

export type DealSupabaseClient = Awaited<ReturnType<typeof createClient>>

export function statusForDealStage(stage: DealStage) {
  if (stage === 'closed_won') return 'won'
  if (stage === 'closed_lost') return 'lost'
  if (stage === 'no_show_nurture') return 'nurture'
  return 'open'
}

export async function recordOpportunityEvent({
  supabase,
  opportunityId,
  orgId,
  userId,
  eventType,
  oldStage,
  newStage,
  metadata,
}: {
  supabase: DealSupabaseClient
  opportunityId: string
  orgId: string
  userId: string
  eventType: 'created' | 'stage_changed' | 'next_step_updated' | 'gmail_sent' | 'meeting_held' | 'closed_won' | 'closed_lost' | 'note'
  oldStage?: DealStage | null
  newStage?: DealStage | null
  metadata?: Record<string, unknown>
}) {
  await supabase.from('opportunity_events').insert({
    opportunity_id: opportunityId,
    org_id: orgId,
    user_id: userId,
    event_type: eventType,
    old_stage: oldStage || null,
    new_stage: newStage || null,
    metadata: metadata || {},
  })
}

export async function ensureOpportunityForCampaignMeeting({
  supabase,
  orgId,
  userId,
  leadId,
  campaignId,
  campaignEnrollmentId,
  metadata,
}: {
  supabase: DealSupabaseClient
  orgId: string
  userId: string
  leadId: string
  campaignId: string
  campaignEnrollmentId?: string | null
  metadata?: Record<string, unknown>
}) {
  if (campaignEnrollmentId) {
    const { data: existing } = await supabase
      .from('opportunities')
      .select('*')
      .eq('campaign_enrollment_id', campaignEnrollmentId)
      .eq('org_id', orgId)
      .maybeSingle()

    if (existing) return existing as Opportunity
  }

  const { data: existingForLead } = await supabase
    .from('opportunities')
    .select('*')
    .eq('lead_id', leadId)
    .eq('campaign_id', campaignId)
    .eq('org_id', orgId)
    .neq('status', 'lost')
    .maybeSingle()

  if (existingForLead) return existingForLead as Opportunity

  const [{ data: lead }, { data: campaign }] = await Promise.all([
    supabase
      .from('leads')
      .select('id,contact_name,company_name,contact_email,lead_token,source')
      .eq('id', leadId)
      .eq('org_id', orgId)
      .single(),
    supabase
      .from('campaigns')
      .select('id,name,slug,campaign_type')
      .eq('id', campaignId)
      .eq('org_id', orgId)
      .single(),
  ])

  const bookedAt = typeof metadata?.occurred_at === 'string' ? metadata.occurred_at : new Date().toISOString()
  const attribution = {
    campaign_id: campaignId,
    campaign_slug: campaign?.slug,
    campaign_type: campaign?.campaign_type,
    campaign_enrollment_id: campaignEnrollmentId,
    lead_token: lead?.lead_token,
    ...metadata,
  }

  const { data, error } = await supabase
    .from('opportunities')
    .insert({
      org_id: orgId,
      user_id: userId,
      lead_id: leadId,
      campaign_id: campaignId,
      campaign_enrollment_id: campaignEnrollmentId || null,
      name: `${lead?.company_name || lead?.contact_name || 'Lead'} Discovery`,
      stage: 'discovery_booked',
      status: 'open',
      probability: DEAL_STAGE_PROBABILITY.discovery_booked,
      discovery_booked_at: bookedAt,
      source: campaign?.slug || lead?.source || 'campaign',
      attribution,
      next_step: 'Hold discovery call and qualify challenge fit.',
    })
    .select()
    .single()

  if (error) throw error

  await recordOpportunityEvent({
    supabase,
    opportunityId: data.id,
    orgId,
    userId,
    eventType: 'created',
    newStage: 'discovery_booked',
    metadata: attribution,
  })

  return data as Opportunity
}
