import { describe, expect, it } from 'vitest'
import { buildCampaignRevenueAttribution } from './attribution'

describe('buildCampaignRevenueAttribution', () => {
  it('rolls pipeline and won revenue up to the originating campaign', () => {
    const result = buildCampaignRevenueAttribution({
      campaigns: [
        { id: 'campaign-1', name: 'Outbound founders', campaign_type: 'email_outbound' },
      ],
      enrollments: [
        { campaign_id: 'campaign-1', status: 'active' },
        { campaign_id: 'campaign-1', status: 'completed' },
      ],
      opportunities: [
        { campaign_id: 'campaign-1', status: 'open', estimated_value: 20_000, probability: 50 },
        { campaign_id: 'campaign-1', status: 'won', estimated_value: 15_000, probability: 100 },
      ],
    })

    expect(result.campaigns[0]).toMatchObject({
      enrolled_leads: 2,
      opportunities: 2,
      open_deals: 1,
      won_deals: 1,
      pipeline_value: 20_000,
      weighted_pipeline: 10_000,
      won_revenue: 15_000,
      lead_to_deal_rate: 100,
      win_rate: 50,
    })
  })

  it('keeps deals without a campaign visible as unattributed', () => {
    const result = buildCampaignRevenueAttribution({
      campaigns: [],
      enrollments: [],
      opportunities: [
        { campaign_id: null, status: 'open', estimated_value: 5_000, probability: 20 },
      ],
    })

    expect(result.campaigns[0]).toMatchObject({
      campaign_id: null,
      campaign_name: 'Unattributed',
      opportunities: 1,
      pipeline_value: 5_000,
    })
  })
})
