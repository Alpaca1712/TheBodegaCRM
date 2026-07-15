import { describe, expect, it, vi } from 'vitest'
import { GmailTokenExpiredError } from '@/lib/campaigns/sequence-runner'
import { runCampaignSequenceBatch } from './sequence-batch'

const targets = [
  { campaignId: 'campaign-a', orgId: 'org-a' },
  { campaignId: 'campaign-b', orgId: 'org-b' },
  { campaignId: 'campaign-c', orgId: 'org-c' },
]

describe('runCampaignSequenceBatch', () => {
  it('continues after a campaign failure and summarizes successful work', async () => {
    const onCampaignError = vi.fn()
    const runCampaign = vi.fn(async ({ campaignId }: { campaignId: string }) => {
      if (campaignId === 'campaign-b') throw new Error('database unavailable')
      return {
        campaign_id: campaignId,
        due: 2,
        sent: 1,
        skipped: 1,
        failed: 0,
        errors: [],
      }
    })

    const result = await runCampaignSequenceBatch({ campaigns: targets, runCampaign, onCampaignError })

    expect(runCampaign).toHaveBeenCalledTimes(3)
    expect(result.ok).toBe(false)
    expect(result.summary).toEqual({
      campaigns: 3,
      succeeded: 2,
      failed: 1,
      due: 4,
      sent: 2,
      skipped: 2,
      step_failures: 0,
    })
    expect(result.outcomes[1]).toMatchObject({
      campaign_id: 'campaign-b',
      ok: false,
      code: 'CAMPAIGN_FAILED',
      error: 'database unavailable',
    })
    expect(onCampaignError).toHaveBeenCalledOnce()
  })

  it('labels expired Gmail credentials without stopping later campaigns', async () => {
    const runCampaign = vi.fn(async ({ campaignId }: { campaignId: string }) => {
      if (campaignId === 'campaign-a') throw new GmailTokenExpiredError('Reconnect Gmail')
      return {
        campaign_id: campaignId,
        due: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        errors: [],
      }
    })

    const result = await runCampaignSequenceBatch({ campaigns: targets, runCampaign })

    expect(runCampaign).toHaveBeenCalledTimes(3)
    expect(result.outcomes[0]).toMatchObject({
      campaign_id: 'campaign-a',
      ok: false,
      code: 'TOKEN_EXPIRED',
    })
    expect(result.outcomes[2]).toMatchObject({ campaign_id: 'campaign-c', ok: true })
  })
})
