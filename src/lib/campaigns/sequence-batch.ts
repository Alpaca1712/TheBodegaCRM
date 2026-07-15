import {
  GmailTokenExpiredError,
  type CampaignSequenceRunResult,
} from '@/lib/campaigns/sequence-runner'

export interface CampaignSequenceBatchTarget {
  campaignId: string
  orgId: string
}

export interface CampaignSequenceBatchOutcome {
  campaign_id: string
  org_id: string
  ok: boolean
  result?: CampaignSequenceRunResult
  error?: string
  code?: 'TOKEN_EXPIRED' | 'CAMPAIGN_FAILED'
}

export interface CampaignSequenceBatchResult {
  ok: boolean
  summary: {
    campaigns: number
    succeeded: number
    failed: number
    due: number
    sent: number
    skipped: number
    step_failures: number
  }
  outcomes: CampaignSequenceBatchOutcome[]
}

export async function runCampaignSequenceBatch({
  campaigns,
  runCampaign,
  onCampaignError,
}: {
  campaigns: CampaignSequenceBatchTarget[]
  runCampaign: (campaign: CampaignSequenceBatchTarget) => Promise<CampaignSequenceRunResult>
  onCampaignError?: (outcome: CampaignSequenceBatchOutcome, error: unknown) => void
}): Promise<CampaignSequenceBatchResult> {
  const outcomes: CampaignSequenceBatchOutcome[] = []

  // Keep execution sequential to avoid bursts against Gmail and Supabase, but
  // isolate failures so one broken account cannot block unrelated campaigns.
  for (const campaign of campaigns) {
    try {
      const result = await runCampaign(campaign)
      outcomes.push({
        campaign_id: campaign.campaignId,
        org_id: campaign.orgId,
        ok: true,
        result,
      })
    } catch (error) {
      const outcome: CampaignSequenceBatchOutcome = {
        campaign_id: campaign.campaignId,
        org_id: campaign.orgId,
        ok: false,
        error: error instanceof Error ? error.message : 'Campaign sequence failed',
        code: error instanceof GmailTokenExpiredError ? 'TOKEN_EXPIRED' : 'CAMPAIGN_FAILED',
      }
      outcomes.push(outcome)
      onCampaignError?.(outcome, error)
    }
  }

  const successfulResults = outcomes.flatMap((outcome) => outcome.result ? [outcome.result] : [])
  const failed = outcomes.filter((outcome) => !outcome.ok).length

  return {
    ok: failed === 0,
    summary: {
      campaigns: outcomes.length,
      succeeded: outcomes.length - failed,
      failed,
      due: successfulResults.reduce((total, result) => total + result.due, 0),
      sent: successfulResults.reduce((total, result) => total + result.sent, 0),
      skipped: successfulResults.reduce((total, result) => total + result.skipped, 0),
      step_failures: successfulResults.reduce((total, result) => total + result.failed, 0),
    },
    outcomes,
  }
}
