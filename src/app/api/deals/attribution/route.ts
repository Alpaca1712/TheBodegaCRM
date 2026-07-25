import { NextResponse } from 'next/server'
import { buildCampaignRevenueAttribution } from '@/lib/deals/attribution'
import { getErrorMessage } from '@/lib/deals/server'
import { isMissingRelation } from '@/lib/supabase/missing-column'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'
import type { CampaignType } from '@/types/campaigns'
import type { DealStatus } from '@/types/deals'

export async function GET() {
  try {
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const [campaignsRes, enrollmentsRes, opportunitiesRes] = await Promise.all([
      supabase
        .from('campaigns')
        .select('id,name,campaign_type')
        .eq('org_id', orgId),
      supabase
        .from('campaign_enrollments')
        .select('campaign_id,status')
        .eq('org_id', orgId),
      supabase
        .from('opportunities')
        .select('campaign_id,status,estimated_value,probability')
        .eq('org_id', orgId),
    ])

    if (opportunitiesRes.error && isMissingRelation(opportunitiesRes.error, 'opportunities')) {
      return NextResponse.json({
        data: buildCampaignRevenueAttribution({ campaigns: [], enrollments: [], opportunities: [] }),
        setup_required: true,
      })
    }
    if (campaignsRes.error) throw campaignsRes.error
    if (enrollmentsRes.error) throw enrollmentsRes.error
    if (opportunitiesRes.error) throw opportunitiesRes.error

    const data = buildCampaignRevenueAttribution({
      campaigns: (campaignsRes.data || []).map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        campaign_type: campaign.campaign_type as CampaignType,
      })),
      enrollments: (enrollmentsRes.data || []).map((enrollment) => ({
        campaign_id: enrollment.campaign_id,
        status: enrollment.status as 'active' | 'completed' | 'exited',
      })),
      opportunities: (opportunitiesRes.data || []).map((opportunity) => ({
        campaign_id: opportunity.campaign_id,
        status: opportunity.status as DealStatus,
        estimated_value: opportunity.estimated_value == null ? null : Number(opportunity.estimated_value),
        probability: Number(opportunity.probability || 0),
      })),
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error('GET /api/deals/attribution error:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to load revenue attribution') },
      { status: 500 },
    )
  }
}
