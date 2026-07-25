import type { CampaignType } from '@/types/campaigns'
import type { DealStatus } from '@/types/deals'

export interface AttributionCampaignInput {
  id: string
  name: string
  campaign_type: CampaignType
}

export interface AttributionEnrollmentInput {
  campaign_id: string
  status: 'active' | 'completed' | 'exited'
}

export interface AttributionOpportunityInput {
  campaign_id: string | null
  status: DealStatus
  estimated_value: number | null
  probability: number
}

export interface CampaignRevenueAttributionRow {
  campaign_id: string | null
  campaign_name: string
  campaign_type: CampaignType | null
  enrolled_leads: number
  opportunities: number
  open_deals: number
  won_deals: number
  pipeline_value: number
  weighted_pipeline: number
  won_revenue: number
  lead_to_deal_rate: number
  win_rate: number
}

export interface CampaignRevenueAttribution {
  campaigns: CampaignRevenueAttributionRow[]
  totals: Omit<CampaignRevenueAttributionRow, 'campaign_id' | 'campaign_name' | 'campaign_type'>
}

function percentage(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0
}

export function buildCampaignRevenueAttribution({
  campaigns,
  enrollments,
  opportunities,
}: {
  campaigns: AttributionCampaignInput[]
  enrollments: AttributionEnrollmentInput[]
  opportunities: AttributionOpportunityInput[]
}): CampaignRevenueAttribution {
  const rows = new Map<string, CampaignRevenueAttributionRow>()

  for (const campaign of campaigns) {
    rows.set(campaign.id, {
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      campaign_type: campaign.campaign_type,
      enrolled_leads: 0,
      opportunities: 0,
      open_deals: 0,
      won_deals: 0,
      pipeline_value: 0,
      weighted_pipeline: 0,
      won_revenue: 0,
      lead_to_deal_rate: 0,
      win_rate: 0,
    })
  }

  const ensureUnattributed = () => {
    const key = 'unattributed'
    if (!rows.has(key)) {
      rows.set(key, {
        campaign_id: null,
        campaign_name: 'Unattributed',
        campaign_type: null,
        enrolled_leads: 0,
        opportunities: 0,
        open_deals: 0,
        won_deals: 0,
        pipeline_value: 0,
        weighted_pipeline: 0,
        won_revenue: 0,
        lead_to_deal_rate: 0,
        win_rate: 0,
      })
    }
    return rows.get(key)!
  }

  for (const enrollment of enrollments) {
    const row = rows.get(enrollment.campaign_id)
    if (row) row.enrolled_leads += 1
  }

  for (const opportunity of opportunities) {
    const row = opportunity.campaign_id
      ? rows.get(opportunity.campaign_id) || ensureUnattributed()
      : ensureUnattributed()
    const value = Number(opportunity.estimated_value || 0)
    row.opportunities += 1
    if (opportunity.status === 'open') {
      row.open_deals += 1
      row.pipeline_value += value
      row.weighted_pipeline += value * (opportunity.probability / 100)
    }
    if (opportunity.status === 'won') {
      row.won_deals += 1
      row.won_revenue += value
    }
  }

  const campaignRows = Array.from(rows.values())
    .filter((row) => row.enrolled_leads > 0 || row.opportunities > 0)
    .map((row) => ({
      ...row,
      lead_to_deal_rate: percentage(row.opportunities, row.enrolled_leads),
      win_rate: percentage(row.won_deals, row.opportunities),
    }))
    .sort((a, b) => b.won_revenue - a.won_revenue || b.pipeline_value - a.pipeline_value || a.campaign_name.localeCompare(b.campaign_name))

  const totals = campaignRows.reduce(
    (result, row) => ({
      enrolled_leads: result.enrolled_leads + row.enrolled_leads,
      opportunities: result.opportunities + row.opportunities,
      open_deals: result.open_deals + row.open_deals,
      won_deals: result.won_deals + row.won_deals,
      pipeline_value: result.pipeline_value + row.pipeline_value,
      weighted_pipeline: result.weighted_pipeline + row.weighted_pipeline,
      won_revenue: result.won_revenue + row.won_revenue,
      lead_to_deal_rate: 0,
      win_rate: 0,
    }),
    {
      enrolled_leads: 0,
      opportunities: 0,
      open_deals: 0,
      won_deals: 0,
      pipeline_value: 0,
      weighted_pipeline: 0,
      won_revenue: 0,
      lead_to_deal_rate: 0,
      win_rate: 0,
    },
  )

  totals.lead_to_deal_rate = percentage(totals.opportunities, totals.enrolled_leads)
  totals.win_rate = percentage(totals.won_deals, totals.opportunities)

  return { campaigns: campaignRows, totals }
}
