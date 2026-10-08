import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { formatAddress, resend, resendConfigured } from '@/lib/email/resend'
import { escapeHtml } from '@/lib/email/render'
import { getSetting } from '@/lib/settings'
import type { Lead } from '@/types'
import { isPartnershipLead } from './channels'
import { isReferralLead } from './referral'
import { getLead } from './service'

const CODE_MAX = 32
const CODE_MIN = 3

type ReferralProgramCustom = {
  code?: string
  issued_at?: string
  emailed_at?: string | null
}

export function landingBaseUrl() {
  return (
    process.env.LANDING_BASE_URL ||
    process.env.NEXT_PUBLIC_LANDING_SITE_URL ||
    'https://pigeonlabs.ai'
  ).replace(/\/$/, '')
}

export function referralLinkForCode(code: string) {
  return `${landingBaseUrl()}/?ref=${encodeURIComponent(code)}`
}

export function isEligibleReferrer(
  lead: Pick<Lead, 'source' | 'tags'> & { custom?: Lead['custom'] | null },
): boolean {
  return isReferralLead(lead) || isPartnershipLead(lead)
}

export function normalizeReferralCode(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, CODE_MAX)
}

/** Prefer first-class column when migration 0010 is applied; else custom.referral_program.code. */
export function getReferralCode(lead: Pick<Lead, 'referral_code' | 'custom'>): string | null {
  if (lead.referral_code) return normalizeReferralCode(lead.referral_code) || null
  const block = lead.custom?.referral_program
  if (!block || typeof block !== 'object') return null
  const code = (block as ReferralProgramCustom).code
  return typeof code === 'string' ? normalizeReferralCode(code) || null : null
}

export function getReferredByLeadId(lead: Pick<Lead, 'referred_by_lead_id' | 'custom'>): string | null {
  if (lead.referred_by_lead_id) return lead.referred_by_lead_id
  const attr = lead.custom?.attribution
  if (!attr || typeof attr !== 'object') return null
  const id = (attr as { referred_by_lead_id?: unknown }).referred_by_lead_id
  return typeof id === 'string' && id.length > 0 ? id : null
}

function seedFromLead(lead: Pick<Lead, 'company_name' | 'first_name' | 'full_name' | 'email'>): string {
  const base =
    lead.company_name ||
    lead.first_name ||
    (lead.full_name || '').split(/\s+/)[0] ||
    (lead.email || '').split('@')[0] ||
    'partner'
  const normalized = normalizeReferralCode(base)
  return normalized.length >= CODE_MIN ? normalized : `coo-${normalized || 'partner'}`
}

function randomSuffix(bytes = 2) {
  return randomBytes(bytes).toString('hex')
}

export async function findLeadByReferralCode(code: string): Promise<Lead | null> {
  const normalized = normalizeReferralCode(code)
  if (normalized.length < CODE_MIN) return null

  // Column path (after 0010)
  const byColumn = await db()
    .from('leads')
    .select('*')
    .ilike('referral_code', normalized)
    .maybeSingle()
  if (!byColumn.error && byColumn.data) return byColumn.data as Lead

  // custom.referral_program.code fallback (works before migration)
  const { data, error } = await db()
    .from('leads')
    .select('*')
    .filter('custom->referral_program->>code', 'eq', normalized)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as Lead) || null
}

export async function listReferredLeads(referrerId: string): Promise<Lead[]> {
  const byColumn = await db()
    .from('leads')
    .select('id, email, full_name, company_name, source, stage, tags, created_at, referral_code, referred_by_lead_id, custom')
    .eq('referred_by_lead_id', referrerId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (!byColumn.error) return (byColumn.data || []) as Lead[]

  const { data, error } = await db()
    .from('leads')
    .select('id, email, full_name, company_name, source, stage, tags, created_at, custom')
    .filter('custom->attribution->>referred_by_lead_id', 'eq', referrerId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data || []) as Lead[]
}

async function allocateUniqueCode(lead: Lead): Promise<string> {
  const seed = seedFromLead(lead)
  const candidates = [seed, `${seed}-${randomSuffix(2)}`, `${seed}-${randomSuffix(3)}`, `coo-${randomSuffix(4)}`]
  for (const candidate of candidates) {
    const code = normalizeReferralCode(candidate)
    if (code.length < CODE_MIN) continue
    const existing = await findLeadByReferralCode(code)
    if (!existing || existing.id === lead.id) return code
  }
  throw ApiError.conflict('Could not allocate a unique referral code')
}

async function persistReferralCode(lead: Lead, code: string): Promise<Lead> {
  const custom = {
    ...(lead.custom || {}),
    referral_program: {
      ...((lead.custom?.referral_program as ReferralProgramCustom) || {}),
      code,
      issued_at: new Date().toISOString(),
    },
  }

  // Try first-class column + custom; if column missing, write custom only.
  const withColumn = await db()
    .from('leads')
    .update({ referral_code: code, custom })
    .eq('id', lead.id)
    .select('*')
    .single()

  if (!withColumn.error && withColumn.data) return withColumn.data as Lead

  const { data, error } = await db()
    .from('leads')
    .update({ custom })
    .eq('id', lead.id)
    .select('*')
    .single()
  if (error) throw error
  return data as Lead
}

export type ReferralSummary = {
  eligible: boolean
  code: string | null
  link: string | null
  referred_count: number
  referrals: Array<Pick<Lead, 'id' | 'email' | 'full_name' | 'company_name' | 'stage' | 'source' | 'created_at'>>
  referred_by: Pick<Lead, 'id' | 'email' | 'full_name' | 'company_name' | 'referral_code'> | null
}

export async function referralSummaryForLead(lead: Lead): Promise<ReferralSummary> {
  const code = getReferralCode(lead)
  const referrals = code || isEligibleReferrer(lead) ? await listReferredLeads(lead.id) : []
  let referredBy: ReferralSummary['referred_by'] = null
  const referredById = getReferredByLeadId(lead)
  if (referredById) {
    const { data } = await db()
      .from('leads')
      .select('id, email, full_name, company_name, referral_code, custom')
      .eq('id', referredById)
      .maybeSingle()
    if (data) {
      referredBy = {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        company_name: data.company_name,
        referral_code: getReferralCode(data as Lead),
      }
    }
  }
  return {
    eligible: isEligibleReferrer(lead),
    code,
    link: code ? referralLinkForCode(code) : null,
    referred_count: referrals.length,
    referrals: referrals.map((row) => ({
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      company_name: row.company_name,
      stage: row.stage,
      source: row.source,
      created_at: row.created_at,
    })),
    referred_by: referredBy,
  }
}

export async function issueReferralCode(
  leadId: string,
  options: { email?: boolean; forceNew?: boolean } = {},
): Promise<{ lead: Lead; code: string; link: string; emailed: boolean }> {
  const lead = await getLead(leadId)
  if (!isEligibleReferrer(lead)) {
    throw ApiError.unprocessable(
      'Only Coo Crew affiliates / influencers / event-goers and partnership leads can receive a referral code',
    )
  }

  let next = lead
  const existingCode = getReferralCode(lead)
  if (!existingCode || options.forceNew) {
    const code = await allocateUniqueCode(lead)
    next = await persistReferralCode(lead, code)
  }

  const code = getReferralCode(next)!
  const link = referralLinkForCode(code)
  let emailed = false
  if (options.email) {
    emailed = await sendReferralCodeEmail(next, { code, link })
  }
  return { lead: next, code, link, emailed }
}

/** Soft send: skips Hunter verification so unverified partners can still get their code. */
export async function sendReferralCodeEmail(
  lead: Lead,
  opts?: { code?: string; link?: string },
): Promise<boolean> {
  if (lead.do_not_contact || lead.unsubscribed_at || lead.bounced_at) {
    throw ApiError.unprocessable(`${lead.email} cannot receive email`)
  }
  if (lead.email_status === 'invalid' || lead.email_status === 'disposable') {
    throw ApiError.unprocessable(`${lead.email} is not deliverable`)
  }
  if (!resendConfigured()) {
    console.warn('[referral] skipped email: RESEND_API_KEY missing')
    return false
  }

  const code = opts?.code || getReferralCode(lead)
  if (!code) throw ApiError.badRequest('Lead has no referral code')
  const link = opts?.link || referralLinkForCode(code)
  const sender = await getSetting('sender')
  const name = lead.first_name || lead.full_name?.split(/\s+/)[0] || 'there'
  const subject = 'Your Pigeon Labs referral link'
  const text = [
    `Hi ${name},`,
    '',
    'You are set up with a Pigeon Labs referral link.',
    '',
    `Code: ${code}`,
    `Link: ${link}`,
    '',
    'Share that link. When someone signs up on pigeonlabs.ai through it, we credit the referral to you.',
    '',
    'Questions? Reply to this email.',
    '',
    '- Pigeon Labs',
  ].join('\n')
  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#111;">
<p>Hi ${escapeHtml(name)},</p>
<p>You are set up with a Pigeon Labs referral link.</p>
<p><strong>Code:</strong> ${escapeHtml(code)}<br/>
<strong>Link:</strong> <a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>
<p>Share that link. When someone signs up on pigeonlabs.ai through it, we credit the referral to you.</p>
<p>Questions? Reply to this email.</p>
<p>- Pigeon Labs</p>
</div>`

  const { data, error } = await resend().emails.send({
    from: formatAddress(sender.from_name || 'Daniel Chalco', sender.from_email),
    to: [lead.email],
    replyTo: sender.reply_to || undefined,
    subject,
    text,
    html,
    tags: [
      { name: 'kind', value: 'referral_code' },
      { name: 'lead_id', value: lead.id },
    ],
  })
  if (error) {
    console.warn('[referral] resend error', error.message)
    throw ApiError.badRequest(`Failed to email referral code: ${error.message}`)
  }

  try {
    await db().from('emails').insert({
      lead_id: lead.id,
      direction: 'outbound',
      status: 'sent',
      source: 'notification',
      from_email: sender.from_email,
      from_name: sender.from_name || 'Daniel Chalco',
      to_email: lead.email,
      subject,
      text_body: text,
      html_body: html,
      resend_id: data?.id || null,
      sent_at: new Date().toISOString(),
    })
    const program = {
      ...((lead.custom?.referral_program as ReferralProgramCustom) || {}),
      code,
      emailed_at: new Date().toISOString(),
    }
    await db()
      .from('leads')
      .update({
        last_outbound_at: new Date().toISOString(),
        last_contacted_at: new Date().toISOString(),
        custom: { ...(lead.custom || {}), referral_program: program },
      })
      .eq('id', lead.id)
  } catch (logError) {
    console.warn('[referral] email log failed', logError)
  }

  return true
}

/**
 * Attribute a newly captured lead to a referrer by code.
 * No-ops when code is missing/invalid, self-referral, or already attributed.
 */
export async function attributeLeadToReferralCode(
  leadId: string,
  rawCode: string | null | undefined,
): Promise<Lead | null> {
  if (!rawCode) return null
  const code = normalizeReferralCode(rawCode)
  if (code.length < CODE_MIN) return null

  const [lead, referrer] = await Promise.all([getLead(leadId), findLeadByReferralCode(code)])
  if (!referrer) return null
  if (referrer.id === lead.id) return null
  if (getReferredByLeadId(lead)) return lead
  if (normalizeEmail(lead.email) === normalizeEmail(referrer.email)) return null

  const tags = Array.from(new Set([...(lead.tags || []), 'referred']))
  const custom = {
    ...(lead.custom || {}),
    attribution: {
      referral_code: getReferralCode(referrer) || code,
      referred_by_lead_id: referrer.id,
      captured_at: new Date().toISOString(),
    },
  }

  const withColumn = await db()
    .from('leads')
    .update({
      referred_by_lead_id: referrer.id,
      tags,
      custom,
    })
    .eq('id', lead.id)
    .select('*')
    .single()
  if (!withColumn.error && withColumn.data) return withColumn.data as Lead

  const { data, error } = await db()
    .from('leads')
    .update({ tags, custom })
    .eq('id', lead.id)
    .select('*')
    .single()
  if (error) throw error
  return data as Lead
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}
