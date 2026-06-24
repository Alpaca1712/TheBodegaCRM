import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'
import { campaignMetricsFromRows } from '@/lib/campaigns/server'
import type {
  Campaign,
  CampaignAsset,
  CampaignDetail,
  CampaignEnrollmentWithLead,
  CampaignEvent,
  CampaignEventType,
  CampaignPipeline,
  CampaignStage,
  CampaignStatus,
  CampaignTemplateKey,
} from '@/types/campaigns'

const updateCampaignSchema = z.object({
  name: z.string().min(2).optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'archived']).optional(),
  description: z.string().optional().nullable(),
  target_channel: z.string().optional().nullable(),
  lead_magnet_name: z.string().optional().nullable(),
  landing_slug: z.string().optional().nullable(),
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

    const [pipelineRes, stagesRes, enrollmentsRes, eventsRes, assetsRes] = await Promise.all([
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
            source_type,
            lead_token,
            icp_score,
            last_contacted_at,
            last_outbound_at,
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
        .from('campaign_assets')
        .select('*')
        .eq('campaign_id', id)
        .eq('org_id', orgId)
        .order('created_at', { ascending: false }),
    ])

    if (pipelineRes.error) throw pipelineRes.error
    if (stagesRes.error) throw stagesRes.error
    if (enrollmentsRes.error) throw enrollmentsRes.error
    if (eventsRes.error) throw eventsRes.error
    if (assetsRes.error) throw assetsRes.error

    const enrollments = (enrollmentsRes.data || []) as CampaignEnrollmentWithLead[]
    const events = (eventsRes.data || []) as CampaignEvent[]
    const detail: CampaignDetail = {
      ...(campaign as Campaign),
      template_key: (pipelineRes.data?.template_key || null) as CampaignTemplateKey | null,
      pipeline: (pipelineRes.data || null) as CampaignPipeline | null,
      stages: (stagesRes.data || []) as CampaignStage[],
      enrollments,
      events,
      assets: (assetsRes.data || []) as CampaignAsset[],
      metrics: campaignMetricsFromRows(
        enrollments.map((row) => ({ campaign_id: row.campaign_id, stage_key: row.stage_key })),
        events.map((event) => ({ campaign_id: event.campaign_id, event_type: event.event_type as CampaignEventType })),
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
