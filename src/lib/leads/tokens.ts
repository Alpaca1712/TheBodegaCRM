import { createHmac, timingSafeEqual } from 'crypto'
import { db } from '@/lib/db'

function secret() {
  const value = process.env.LEAD_TOKEN_SECRET
  if (value) return value
  if (process.env.NODE_ENV !== 'production') return 'bodega-dev-lead-token-secret'
  throw new Error('Missing LEAD_TOKEN_SECRET. Use the same value as the landing site.')
}

function sign(leadId: string) {
  return createHmac('sha256', secret()).update(leadId).digest('hex')
}

/** `{leadId}.{hmac}` — shared with the landing site so it can hydrate a known lead. */
export function createLeadToken(leadId: string) {
  return `${leadId}.${sign(leadId)}`
}

export function verifyLeadToken(token: string | null | undefined): string | null {
  if (!token) return null
  const [leadId, signature] = token.split('.')
  if (!leadId || !signature) return null
  const expected = Buffer.from(sign(leadId))
  const provided = Buffer.from(signature)
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null
  return leadId
}

export async function ensureLeadToken(lead: { id: string; lead_token: string | null }) {
  if (lead.lead_token) return lead.lead_token
  const token = createLeadToken(lead.id)
  const { error } = await db().from('leads').update({ lead_token: token }).eq('id', lead.id)
  if (error) throw error
  return token
}

export function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
}

export function unsubscribeUrl(leadToken: string) {
  return `${appBaseUrl()}/api/unsubscribe?token=${encodeURIComponent(leadToken)}`
}
