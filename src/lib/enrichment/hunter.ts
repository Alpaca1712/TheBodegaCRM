import { ApiError } from '@/lib/api/errors'
import type { EmailStatus } from '@/types'

const BASE = 'https://api.hunter.io/v2'

export function hunterConfigured() {
  return Boolean(process.env.HUNTER_API_KEY)
}

async function hunterGet<T>(path: string, params: Record<string, string | undefined>): Promise<T> {
  const key = process.env.HUNTER_API_KEY
  if (!key) throw new ApiError(503, 'HUNTER_API_KEY is not configured')
  const url = new URL(`${BASE}${path}`)
  for (const [name, value] of Object.entries(params)) if (value) url.searchParams.set(name, value)
  url.searchParams.set('api_key', key)

  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  const payload = await response.json().catch(() => ({})) as { data?: T; errors?: { details?: string; id?: string }[] }
  if (!response.ok) {
    const detail = payload.errors?.[0]?.details || payload.errors?.[0]?.id || `Hunter returned ${response.status}`
    throw new ApiError(response.status === 429 ? 429 : 502, `Hunter: ${detail}`)
  }
  return payload.data as T
}

export interface HunterFinderResult {
  email: string | null
  score: number | null
  first_name: string | null
  last_name: string | null
  position: string | null
  company: string | null
  domain: string | null
  linkedin_url: string | null
  twitter: string | null
  phone_number: string | null
  verification: { status: string | null; date: string | null } | null
  sources: { domain: string; uri: string; extracted_on: string }[]
}

export async function findEmail(input: { domain?: string; company?: string; first_name: string; last_name: string }) {
  if (!input.domain && !input.company) throw ApiError.badRequest('Provide a domain or company name')
  const data = await hunterGet<Record<string, unknown>>('/email-finder', {
    domain: input.domain,
    company: input.company,
    first_name: input.first_name,
    last_name: input.last_name,
  })
  return {
    email: (data.email as string) || null,
    score: (data.score as number) ?? null,
    first_name: (data.first_name as string) || null,
    last_name: (data.last_name as string) || null,
    position: (data.position as string) || null,
    company: (data.company as string) || null,
    domain: (data.domain as string) || null,
    linkedin_url: (data.linkedin_url as string) || null,
    twitter: (data.twitter as string) || null,
    phone_number: (data.phone_number as string) || null,
    verification: (data.verification as HunterFinderResult['verification']) || null,
    sources: (data.sources as HunterFinderResult['sources']) || [],
  } satisfies HunterFinderResult
}

export interface HunterVerifyResult {
  email: string
  status: string
  result: 'deliverable' | 'undeliverable' | 'risky' | 'unknown' | string
  score: number | null
  disposable: boolean
  webmail: boolean
  accept_all: boolean
  mx_records: boolean
  smtp_server: boolean
  smtp_check: boolean
  block: boolean
  sources: { domain: string; uri: string; extracted_on: string }[]
}

export async function verifyEmail(email: string): Promise<HunterVerifyResult> {
  const data = await hunterGet<Record<string, unknown>>('/email-verifier', { email })
  return {
    email: (data.email as string) || email,
    status: (data.status as string) || 'unknown',
    result: (data.result as string) || 'unknown',
    score: (data.score as number) ?? null,
    disposable: Boolean(data.disposable),
    webmail: Boolean(data.webmail),
    accept_all: Boolean(data.accept_all),
    mx_records: Boolean(data.mx_records),
    smtp_server: Boolean(data.smtp_server),
    smtp_check: Boolean(data.smtp_check),
    block: Boolean(data.block),
    sources: (data.sources as HunterVerifyResult['sources']) || [],
  }
}

/** Maps Hunter's verifier status onto the lead's `email_status` column. */
export function emailStatusFromHunter(result: HunterVerifyResult): EmailStatus {
  switch (result.status) {
    case 'valid':
      return 'valid'
    case 'invalid':
      return 'invalid'
    case 'accept_all':
      return 'accept_all'
    case 'webmail':
      return 'webmail'
    case 'disposable':
      return 'disposable'
    default:
      return 'unknown'
  }
}
