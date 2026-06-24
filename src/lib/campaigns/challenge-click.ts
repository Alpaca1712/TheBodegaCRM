import { enrollLeadInCampaign, recordCampaignEvent } from '@/lib/campaigns/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Campaign } from '@/types/campaigns'

type SupabaseAdminClient = ReturnType<typeof createAdminClient>

export async function recordChallengeLinkClick({
  supabase,
  campaign,
  lead,
  leadToken,
  userAgent,
}: {
  supabase: SupabaseAdminClient
  campaign: Campaign
  lead: { id: string; lead_token?: string | null }
  leadToken: string
  userAgent: string | null
}) {
  const metadata = {
    source: 'free_pentest_challenge',
    landing_slug: 'free-pentest-challenge',
    lead_token: leadToken,
    user_agent: userAgent,
  }
  const enrollment = await enrollLeadInCampaign({
    supabase,
    campaign,
    leadId: lead.id,
    userId: campaign.user_id,
    orgId: campaign.org_id,
    stageKey: 'challenge_link_clicked',
    metadata,
  })
  const { data: stages } = await supabase
    .from('campaign_stages')
    .select('stage_key,position')
    .eq('campaign_id', campaign.id)
    .eq('org_id', campaign.org_id)

  const stagePositions = new Map((stages || []).map((stage) => [stage.stage_key, stage.position]))
  const currentPosition = stagePositions.get(enrollment.stage_key)
  const clickedPosition = stagePositions.get('challenge_link_clicked')
  const shouldAdvance =
    enrollment.status !== 'completed' &&
    (
      currentPosition === undefined ||
      clickedPosition === undefined ||
      currentPosition <= clickedPosition
    )
  const event = await recordCampaignEvent({
    supabase,
    campaignId: campaign.id,
    enrollmentId: enrollment.id,
    leadId: lead.id,
    orgId: campaign.org_id,
    userId: campaign.user_id,
    eventType: 'challenge_link_clicked',
    stageKey: 'challenge_link_clicked',
    metadata,
    advance: shouldAdvance,
  })

  await supabase.from('campaign_attribution_events').insert({
    campaign_id: campaign.id,
    lead_id: lead.id,
    campaign_enrollment_id: enrollment.id,
    org_id: campaign.org_id,
    user_id: campaign.user_id,
    event_type: 'email_click',
    landing_slug: 'free-pentest-challenge',
    lead_token: lead.lead_token || leadToken,
    source: 'bodega',
    medium: 'email',
    campaign_slug: campaign.slug,
    user_agent: userAgent,
    metadata: {
      ...metadata,
      campaign_event_id: event.id,
      advanced_stage: shouldAdvance,
    },
  })

  return { enrollment, event, advanced: shouldAdvance }
}
