import { NextRequest, NextResponse } from 'next/server'
import { runCampaignSequence } from '@/lib/campaigns/sequence-runner'
import { runCampaignSequenceBatch } from '@/lib/campaigns/sequence-batch'
import { createAdminClient } from '@/lib/supabase/admin'
import { isMissingRelation } from '@/lib/supabase/missing-column'

function authorizeCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production'
  return request.headers.get('authorization') === `Bearer ${secret}`
}

async function runSequences(request: NextRequest) {
  try {
    if (!authorizeCron(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { data: activeSteps, error } = await supabase
      .from('campaign_sequence_steps')
      .select('campaign_id,org_id')
      .eq('active', true)
      .limit(250)

    if (error && isMissingRelation(error, 'campaign_sequence_steps')) {
      return NextResponse.json({ data: [] })
    }
    if (error) throw error

    const campaignKeys = new Map<string, { campaignId: string; orgId: string }>()
    for (const step of activeSteps || []) {
      const row = step as { campaign_id: string; org_id: string }
      campaignKeys.set(`${row.org_id}:${row.campaign_id}`, {
        campaignId: row.campaign_id,
        orgId: row.org_id,
      })
    }

    const batch = await runCampaignSequenceBatch({
      campaigns: Array.from(campaignKeys.values()),
      runCampaign: (campaign) => runCampaignSequence({
        supabase,
        campaignId: campaign.campaignId,
        orgId: campaign.orgId,
      }),
      onCampaignError: (outcome, error) => {
        console.error('Campaign sequence batch item failed', {
          campaignId: outcome.campaign_id,
          orgId: outcome.org_id,
          code: outcome.code,
          error,
        })
      },
    })

    const response = NextResponse.json({ data: batch })
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    console.error('POST /api/campaigns/sequences/run failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run campaign sequences' },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  return runSequences(request)
}

export async function POST(request: NextRequest) {
  return runSequences(request)
}
