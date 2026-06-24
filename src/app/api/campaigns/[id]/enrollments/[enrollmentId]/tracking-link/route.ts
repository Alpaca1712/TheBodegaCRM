import { NextRequest, NextResponse } from 'next/server'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'
import { buildChallengeTrackingUrl, ensureLeadToken } from '@/lib/landing-links/server'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; enrollmentId: string }> },
) {
  try {
    const { id, enrollmentId } = await params
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id,slug,org_id')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (campaignError || !campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('campaign_enrollments')
      .select('id,lead_id')
      .eq('id', enrollmentId)
      .eq('campaign_id', id)
      .eq('org_id', orgId)
      .single()

    if (enrollmentError || !enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id,lead_token')
      .eq('id', enrollment.lead_id)
      .eq('org_id', orgId)
      .single()

    if (leadError || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const leadToken = await ensureLeadToken({
      supabase,
      leadId: lead.id,
      orgId,
      existingToken: lead.lead_token,
    })

    const url = buildChallengeTrackingUrl({
      leadToken,
      campaignId: campaign.id,
      campaignSlug: campaign.slug,
    })

    return NextResponse.json({ data: { url, lead_token: leadToken } })
  } catch (error) {
    console.error('POST /api/campaigns/[id]/enrollments/[enrollmentId]/tracking-link failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create tracking link' },
      { status: 500 },
    )
  }
}
