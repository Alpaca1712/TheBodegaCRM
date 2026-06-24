import { NextRequest, NextResponse } from 'next/server'
import { recordChallengeLinkClick } from '@/lib/campaigns/challenge-click'
import { buildChallengeDestinationUrl, getRocotoLandingBaseUrl } from '@/lib/landing-links/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isMissingColumn } from '@/lib/supabase/missing-column'
import type { Campaign } from '@/types/campaigns'

export async function GET(request: NextRequest) {
  const leadToken = (
    request.nextUrl.searchParams.get('lead') ||
    request.nextUrl.searchParams.get('lead_token') ||
    request.nextUrl.searchParams.get('leadToken') ||
    ''
  ).trim()
  const campaignId = request.nextUrl.searchParams.get('campaign_id')?.trim() || ''
  const destination = leadToken && campaignId
    ? buildChallengeDestinationUrl({ leadToken, campaignId })
    : `${getRocotoLandingBaseUrl()}/free-pentest-challenge#claim`

  if (!leadToken || !campaignId) {
    return NextResponse.redirect(destination)
  }

  try {
    const supabase = createAdminClient()
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .maybeSingle()

    if (campaignError) throw campaignError
    if (!campaign) return NextResponse.redirect(destination)

    const resolvedCampaign = campaign as Campaign
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id,org_id,lead_token')
      .eq('org_id', resolvedCampaign.org_id)
      .eq('lead_token', leadToken)
      .maybeSingle()

    if (isMissingColumn(leadError, 'lead_token')) return NextResponse.redirect(destination)
    if (leadError) throw leadError

    if (lead) {
      await recordChallengeLinkClick({
        supabase,
        campaign: resolvedCampaign,
        lead,
        leadToken,
        userAgent: request.headers.get('user-agent'),
      })
    }
  } catch (error) {
    console.error('GET /api/landing/challenge-click failed', error)
  }

  return NextResponse.redirect(destination)
}
