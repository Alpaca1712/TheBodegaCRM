import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'
import {
  campaignMetricsFromRows,
  resolveCampaignTemplate,
  slugifyCampaignName,
} from '@/lib/campaigns/server'
import {
  CAMPAIGN_TEMPLATES,
  CAMPAIGN_TYPES,
  type Campaign,
  type CampaignEventType,
  type CampaignListItem,
  type CampaignTemplateKey,
} from '@/types/campaigns'

const createCampaignSchema = z.object({
  name: z.string().min(2),
  slug: z.string().optional().nullable(),
  campaign_type: z.enum(CAMPAIGN_TYPES),
  template_key: z.enum(Object.keys(CAMPAIGN_TEMPLATES) as [CampaignTemplateKey, ...CampaignTemplateKey[]]).optional(),
  description: z.string().optional().nullable(),
  lead_magnet_name: z.string().optional().nullable(),
})

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

export async function GET() {
  try {
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false })

    if (error) throw error

    const ids = (campaigns || []).map((campaign: Campaign) => campaign.id)
    if (ids.length === 0) return NextResponse.json({ data: [] })

    const [pipelinesRes, enrollmentsRes, eventsRes] = await Promise.all([
      supabase
        .from('campaign_pipelines')
        .select('campaign_id,template_key')
        .in('campaign_id', ids)
        .eq('org_id', orgId),
      supabase
        .from('campaign_enrollments')
        .select('campaign_id,stage_key')
        .in('campaign_id', ids)
        .eq('org_id', orgId),
      supabase
        .from('campaign_events')
        .select('campaign_id,event_type')
        .in('campaign_id', ids)
        .eq('org_id', orgId),
    ])

    if (pipelinesRes.error) throw pipelinesRes.error
    if (enrollmentsRes.error) throw enrollmentsRes.error
    if (eventsRes.error) throw eventsRes.error

    const templateByCampaign = new Map<string, CampaignTemplateKey>()
    for (const pipeline of pipelinesRes.data || []) {
      templateByCampaign.set(pipeline.campaign_id, pipeline.template_key as CampaignTemplateKey)
    }

    const enrollments = enrollmentsRes.data || []
    const events = (eventsRes.data || []) as Array<{ campaign_id: string; event_type: CampaignEventType }>

    const data: CampaignListItem[] = ((campaigns || []) as Campaign[]).map((campaign) => ({
      ...campaign,
      template_key: templateByCampaign.get(campaign.id) || null,
      metrics: campaignMetricsFromRows(enrollments, events, campaign.id),
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error('GET /api/campaigns failed', error)
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to load campaigns') }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const body = await request.json()
    const validation = createCampaignSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 })
    }

    const template = resolveCampaignTemplate(validation.data.template_key, validation.data.campaign_type)
    const baseSlug = slugifyCampaignName(validation.data.slug || validation.data.name)
    const slug = baseSlug || `campaign-${crypto.randomUUID().slice(0, 8)}`

    const { data: existing } = await supabase
      .from('campaigns')
      .select('id')
      .eq('org_id', orgId)
      .eq('slug', slug)
      .maybeSingle()

    const finalSlug = existing ? `${slug}-${crypto.randomUUID().slice(0, 4)}` : slug

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        org_id: orgId,
        user_id: user.id,
        name: validation.data.name,
        slug: finalSlug,
        campaign_type: validation.data.campaign_type,
        status: 'active',
        description: validation.data.description || template.description,
        lead_magnet_name: validation.data.lead_magnet_name || null,
      })
      .select()
      .single()

    if (campaignError) throw campaignError

    const { data: pipeline, error: pipelineError } = await supabase
      .from('campaign_pipelines')
      .insert({
        campaign_id: campaign.id,
        org_id: orgId,
        template_key: template.key,
        name: template.name,
        description: template.description,
      })
      .select()
      .single()

    if (pipelineError) throw pipelineError

    const { error: stagesError } = await supabase
      .from('campaign_stages')
      .insert(template.stages.map((stage, index) => ({
        campaign_id: campaign.id,
        pipeline_id: pipeline.id,
        org_id: orgId,
        stage_key: stage.key,
        label: stage.label,
        position: index,
        is_terminal: Boolean(stage.terminal),
        is_goal: Boolean(stage.goal),
      })))

    if (stagesError) throw stagesError

    return NextResponse.json({ data: campaign }, { status: 201 })
  } catch (error) {
    console.error('POST /api/campaigns failed', error)
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to create campaign') }, { status: 500 })
  }
}
