import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'
import { enrollLeadInCampaign } from '@/lib/campaigns/server'
import { isActiveCampaignConflictError } from '@/lib/campaigns/enrollment-policy'
import type { Campaign } from '@/types/campaigns'

const enrollSchema = z.object({
  lead_ids: z.array(z.string().uuid()).min(1),
  stage_key: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const body = await request.json()
    const validation = enrollSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 })
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (campaignError || !campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    if (validation.data.stage_key) {
      const { data: stage } = await supabase
        .from('campaign_stages')
        .select('stage_key')
        .eq('campaign_id', id)
        .eq('org_id', orgId)
        .eq('stage_key', validation.data.stage_key)
        .maybeSingle()
      if (!stage) return NextResponse.json({ error: 'Unknown campaign stage' }, { status: 400 })
    }

    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id')
      .eq('org_id', orgId)
      .in('id', validation.data.lead_ids)

    if (leadsError) throw leadsError

    const leadIds = new Set((leads || []).map((lead: { id: string }) => lead.id))
    const missing = validation.data.lead_ids.filter((leadId) => !leadIds.has(leadId))
    if (missing.length > 0) {
      return NextResponse.json({ error: 'One or more leads are not available to this organization' }, { status: 404 })
    }

    const { data: activeElsewhere, error: activeElsewhereError } = await supabase
      .from('campaign_enrollments')
      .select('lead_id,campaign_id,stage_key,campaign:campaigns(name)')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .in('lead_id', validation.data.lead_ids)
      .neq('campaign_id', id)

    if (activeElsewhereError) throw activeElsewhereError
    if (activeElsewhere && activeElsewhere.length > 0) {
      return NextResponse.json({
        error: 'One or more leads are already active in another campaign. Move them to Nurture / Lost before enrolling them here.',
        conflicts: activeElsewhere.map((enrollment) => ({
          lead_id: enrollment.lead_id,
          campaign_id: enrollment.campaign_id,
          campaign_name: (Array.isArray(enrollment.campaign) ? enrollment.campaign[0] : enrollment.campaign)?.name || 'Another campaign',
          stage_key: enrollment.stage_key,
        })),
      }, { status: 409 })
    }

    const enrollments = []
    for (const leadId of validation.data.lead_ids) {
      const enrollment = await enrollLeadInCampaign({
        supabase,
        campaign: campaign as Campaign,
        leadId,
        userId: user.id,
        orgId,
        stageKey: validation.data.stage_key,
        metadata: validation.data.metadata,
      })
      enrollments.push(enrollment)
    }

    return NextResponse.json({ data: enrollments }, { status: 201 })
  } catch (error) {
    console.error('POST /api/campaigns/[id]/enrollments failed', error)
    if (isActiveCampaignConflictError(error)) {
      return NextResponse.json({ error: error.message, conflict: error.conflict }, { status: 409 })
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to enroll leads' }, { status: 500 })
  }
}
