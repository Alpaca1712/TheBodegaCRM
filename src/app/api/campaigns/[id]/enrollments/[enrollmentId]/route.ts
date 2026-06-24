import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'
import { recordCampaignEvent } from '@/lib/campaigns/server'
import { CAMPAIGN_EVENT_TYPES, type CampaignEventType } from '@/types/campaigns'

const updateEnrollmentSchema = z.object({
  stage_key: z.string().min(1),
  event_type: z.enum(CAMPAIGN_EVENT_TYPES).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

function defaultEventForStage(stageKey: string): CampaignEventType {
  if (stageKey === 'meeting_booked') return 'meeting_booked'
  if (stageKey === 'discovery_booked') return 'meeting_booked'
  if (stageKey === 'application_completed') return 'application_completed'
  if (stageKey === 'application_started') return 'application_started'
  if (stageKey === 'lead_magnet_sent') return 'lead_magnet_sent'
  if (stageKey === 'target_account_list') return 'conference_targeted'
  if (stageKey === 'pre_event_research') return 'research_completed'
  if (stageKey === 'pre_event_outreach_sent') return 'pre_event_outreach_sent'
  if (stageKey === 'meeting_scheduled') return 'meeting_scheduled'
  if (stageKey === 'in_person_conversation') return 'in_person_conversation'
  if (stageKey === 'diagnostic_offered') return 'diagnostic_offered'
  if (stageKey === 'post_event_follow_up_sent') return 'post_event_follow_up_sent'
  if (stageKey === 'no_response') return 'no_response'
  if (stageKey === 'not_a_fit') return 'not_interested'
  if (stageKey === 'not_interested') return 'not_interested'
  return 'stage_changed'
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; enrollmentId: string }> },
) {
  try {
    const { id, enrollmentId } = await params
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const body = await request.json()
    const validation = updateEnrollmentSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 })
    }

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('campaign_enrollments')
      .select('*')
      .eq('id', enrollmentId)
      .eq('campaign_id', id)
      .eq('org_id', orgId)
      .single()

    if (enrollmentError || !enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })

    const { data: stage } = await supabase
      .from('campaign_stages')
      .select('stage_key,is_goal')
      .eq('campaign_id', id)
      .eq('org_id', orgId)
      .eq('stage_key', validation.data.stage_key)
      .maybeSingle()

    if (!stage) return NextResponse.json({ error: 'Unknown campaign stage' }, { status: 400 })

    await recordCampaignEvent({
      supabase,
      campaignId: id,
      enrollmentId,
      leadId: enrollment.lead_id,
      orgId,
      userId: user.id,
      eventType: validation.data.event_type || defaultEventForStage(validation.data.stage_key),
      stageKey: validation.data.stage_key,
      metadata: validation.data.metadata,
    })

    if (stage.is_goal) {
      await supabase
        .from('leads')
        .update({ stage: 'meeting_booked' })
        .eq('id', enrollment.lead_id)
        .eq('org_id', orgId)
    }

    const { data: updated, error: updatedError } = await supabase
      .from('campaign_enrollments')
      .select(`
        *,
        lead:leads (
          id,
          contact_name,
          company_name,
          contact_email,
          contact_title,
          stage,
          source,
          source_type,
          lead_token,
          icp_score,
          last_contacted_at,
          last_outbound_at,
          updated_at
        )
      `)
      .eq('id', enrollmentId)
      .eq('org_id', orgId)
      .single()

    if (updatedError) throw updatedError

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('PATCH /api/campaigns/[id]/enrollments/[enrollmentId] failed', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update enrollment' }, { status: 500 })
  }
}
