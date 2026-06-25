import { createHmac } from 'crypto'
import { isMissingColumn } from '@/lib/supabase/missing-column'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_ROCOTO_LANDING_URL = 'https://www.artoo.love'
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

function getLeadTokenSecret() {
  const secret = process.env.LEAD_TOKEN_SECRET
  if (!secret) {
    throw new Error('Missing LEAD_TOKEN_SECRET server env var. Use the same secret as Rocoto Landing.')
  }
  return secret
}

export function createLeadToken(leadId: string) {
  const signature = createHmac('sha256', getLeadTokenSecret()).update(leadId).digest('hex')
  return `${leadId}.${signature}`
}

export async function ensureLeadToken({
  supabase,
  leadId,
  orgId,
  existingToken,
}: {
  supabase: SupabaseServerClient
  leadId: string
  orgId: string
  existingToken?: string | null
}) {
  if (existingToken) return existingToken

  const leadToken = createLeadToken(leadId)
  const { error } = await supabase
    .from('leads')
    .update({ lead_token: leadToken })
    .eq('id', leadId)
    .eq('org_id', orgId)

  if (isMissingColumn(error, 'lead_token')) return leadToken
  if (error) throw error

  return leadToken
}

export function getRocotoLandingBaseUrl() {
  return (
    process.env.ROCOTO_LANDING_URL ||
    process.env.NEXT_PUBLIC_ROCOTO_LANDING_URL ||
    DEFAULT_ROCOTO_LANDING_URL
  ).replace(/\/$/, '')
}

export function buildChallengeDestinationUrl({
  leadToken,
  campaignId,
}: {
  leadToken: string
  campaignId: string
}) {
  const params = new URLSearchParams({
    lead: leadToken,
    campaign_id: campaignId,
  })

  return `${getRocotoLandingBaseUrl()}/free-pentest-challenge?${params.toString()}#claim`
}

export function buildChallengeTrackingUrl(input: {
  leadToken: string
  campaignId: string
}) {
  return buildChallengeDestinationUrl(input)
}

export function buildCampaignLandingUrl({
  campaignId,
}: {
  campaignId: string
}) {
  const params = new URLSearchParams({
    campaign_id: campaignId,
  })

  return `${getRocotoLandingBaseUrl()}/vertical-saas-ai-playbook?${params.toString()}`
}
