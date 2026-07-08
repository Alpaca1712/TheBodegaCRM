import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'
import { campaignMetricsFromRows } from '@/lib/campaigns/server'
import { buildCampaignLandingUrl } from '@/lib/landing-links/server'
import { isMissingRelation } from '@/lib/supabase/missing-column'
import type {
  Campaign,
  CampaignLeadMagnet,
  CampaignSequenceExecution,
  CampaignAutomationStep,
  CampaignDetail,
  CampaignEnrollmentWithLead,
  CampaignEvent,
  CampaignEventType,
  CampaignPipeline,
  CampaignStage,
  CampaignStatus,
  CampaignTemplateKey,
  LeadTag,
} from '@/types/campaigns'

const updateCampaignSchema = z.object({
  name: z.string().min(2).optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'archived']).optional(),
  description: z.string().optional().nullable(),
  lead_magnet_name: z.string().optional().nullable(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (campaignError || !campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    const [pipelineRes, stagesRes, enrollmentsRes, eventsRes, sequenceStepsRes, sequenceExecutionsRes, leadMagnetsRes] = await Promise.all([
      supabase
        .from('campaign_pipelines')
        .select('*')
        .eq('campaign_id', id)
        .eq('org_id', orgId)
        .maybeSingle(),
      supabase
        .from('campaign_stages')
        .select('*')
        .eq('campaign_id', id)
        .eq('org_id', orgId)
        .order('position', { ascending: true }),
      supabase
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
            last_contacted_at,
            updated_at
          )
        `)
        .eq('campaign_id', id)
        .eq('org_id', orgId)
        .order('updated_at', { ascending: false }),
      supabase
        .from('campaign_events')
        .select('*')
        .eq('campaign_id', id)
        .eq('org_id', orgId)
        .order('occurred_at', { ascending: false })
        .limit(100),
      supabase
        .from('campaign_sequence_steps')
        .select('*')
        .eq('campaign_id', id)
        .eq('org_id', orgId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('campaign_sequence_executions')
        .select('*')
        .eq('campaign_id', id)
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('campaign_lead_magnets')
        .select('*')
        .eq('campaign_id', id)
        .eq('org_id', orgId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true }),
    ])

    if (pipelineRes.error) throw pipelineRes.error
    if (stagesRes.error) throw stagesRes.error
    if (enrollmentsRes.error) throw enrollmentsRes.error
    if (eventsRes.error) throw eventsRes.error
    if (sequenceStepsRes.error && !isMissingRelation(sequenceStepsRes.error, 'campaign_sequence_steps')) {
      throw sequenceStepsRes.error
    }
    if (sequenceExecutionsRes.error && !isMissingRelation(sequenceExecutionsRes.error, 'campaign_sequence_executions')) {
      throw sequenceExecutionsRes.error
    }
    if (leadMagnetsRes.error && !isMissingRelation(leadMagnetsRes.error, 'campaign_lead_magnets')) {
      throw leadMagnetsRes.error
    }

    let enrollments = (enrollmentsRes.data || []) as CampaignEnrollmentWithLead[]
    const events = (eventsRes.data || []) as CampaignEvent[]
    const enrollmentLeadIds = enrollments
      .map((enrollment) => enrollment.lead_id)
      .filter((leadId): leadId is string => Boolean(leadId))

    if (enrollmentLeadIds.length > 0) {
      const { data: leadTags, error: leadTagsError } = await supabase
        .from('lead_tags')
        .select('id,lead_id,name,color,source,created_at')
        .eq('org_id', orgId)
        .in('lead_id', enrollmentLeadIds)
        .order('created_at', { ascending: true })

      if (leadTagsError && !isMissingRelation(leadTagsError, 'lead_tags')) {
        throw leadTagsError
      }

      const tagsByLead = new Map<string, LeadTag[]>()
      for (const tag of (leadTagsError ? [] : leadTags || []) as LeadTag[]) {
        tagsByLead.set(tag.lead_id, [...(tagsByLead.get(tag.lead_id) || []), tag])
      }

      enrollments = enrollments.map((enrollment) => ({
        ...enrollment,
        lead: enrollment.lead
          ? {
              ...enrollment.lead,
              lead_tags: tagsByLead.get(enrollment.lead_id) || [],
            }
          : enrollment.lead,
      }))
    }

    const templateKey = (pipelineRes.data?.template_key || null) as CampaignTemplateKey | null
    const detail: CampaignDetail = {
      ...(campaign as Campaign),
      template_key: templateKey,
      landing_url: templateKey ? buildCampaignLandingUrl({ campaignId: id }) : null,
      pipeline: (pipelineRes.data || null) as CampaignPipeline | null,
      stages: (stagesRes.data || []) as CampaignStage[],
      enrollments,
      events,
      sequence_steps: (sequenceStepsRes.error ? [] : sequenceStepsRes.data || []) as CampaignAutomationStep[],
      sequence_executions: (sequenceExecutionsRes.error ? [] : sequenceExecutionsRes.data || []) as CampaignSequenceExecution[],
      lead_magnets: (leadMagnetsRes.error ? [] : leadMagnetsRes.data || []) as CampaignLeadMagnet[],
      metrics: campaignMetricsFromRows(
        enrollments.map((row) => ({ campaign_id: row.campaign_id, stage_key: row.stage_key })),
        events.map((event) => ({
          campaign_id: event.campaign_id,
          event_type: event.event_type as CampaignEventType,
          lead_id: event.lead_id,
          enrollment_id: event.enrollment_id,
        })),
        id,
      ),
    }

    return NextResponse.json({ data: detail })
  } catch (error) {
    console.error('GET /api/campaigns/[id] failed', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load campaign' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const body = await request.json()
    const validation = updateCampaignSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('campaigns')
      .update(validation.data)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data: { ...(data as Campaign), status: data.status as CampaignStatus } })
  } catch (error) {
    console.error('PATCH /api/campaigns/[id] failed', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update campaign' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const { error, count } = await supabase
      .from('campaigns')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) throw error
    if (count === 0) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    return NextResponse.json({ data: { id }, success: true })
  } catch (error) {
    console.error('DELETE /api/campaigns/[id] failed', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete campaign' }, { status: 500 })
  }
}
