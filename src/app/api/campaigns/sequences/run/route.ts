import { NextRequest, NextResponse } from 'next/server'
import { runCampaignSequence, GmailTokenExpiredError } from '@/lib/campaigns/sequence-runner'
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

    const results = []
    for (const campaign of campaignKeys.values()) {
      results.push(await runCampaignSequence({
        supabase,
        campaignId: campaign.campaignId,
        orgId: campaign.orgId,
      }))
    }

    return NextResponse.json({ data: results })
  } catch (error) {
    if (error instanceof GmailTokenExpiredError) {
      return NextResponse.json({ error: error.message, code: 'TOKEN_EXPIRED' }, { status: 401 })
    }

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
