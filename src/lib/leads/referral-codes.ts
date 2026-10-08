import { randomBytes, randomUUID } from 'crypto'
import { db } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { formatAddress, resend, resendConfigured } from '@/lib/email/resend'
import { escapeHtml } from '@/lib/email/render'
import { getSetting } from '@/lib/settings'
import type { Lead } from '@/types'
import { isPartnershipLead } from './channels'
import { isCreditableReferralSource } from './referral-credit'
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
  return `${landingBaseUrl()}/pentest?ref=${encodeURIComponent(code)}`
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

export function referrerSignupEmailCopy(input: {
  firstName: string
  link: string
}) {
  const subject = 'Congrats - someone used your Pigeon Labs referral link'
  const text = [
    `Hi ${input.firstName},`,
    '',
    'Congrats! Someone just signed up using your Pigeon Labs referral link.',
    '',
    "We'll keep an eye on it. If it turns into a closed deal, we'll let you know.",
    '',
    'Keep sharing your link:',
    input.link,
    '',
    'Questions? Reply to this email.',
    '',
    '- Pigeon Labs',
  ].join('\n')
  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#111;">
<p>Hi ${escapeHtml(input.firstName)},</p>
<p>Congrats! Someone just signed up using your Pigeon Labs referral link.</p>
<p>We'll keep an eye on it. If it turns into a closed deal, we'll let you know.</p>
<p>Keep sharing your link:<br/><a href="${escapeHtml(input.link)}">${escapeHtml(input.link)}</a></p>
<p>Questions? Reply to this email.</p>
<p>- Pigeon Labs</p>
</div>`
  return { subject, text, html }
}

/**
 * Congrats email when a lead is attributed via ?ref=.
 * Does not share referee identity. Soft-fails when Resend is missing.
 */
export async function notifyReferrerOfSignup(
  referrer: Lead,
  opts?: { code?: string; link?: string },
): Promise<boolean> {
  if (referrer.do_not_contact || referrer.unsubscribed_at || referrer.bounced_at) {
    console.warn('[referral] skip signup notify: referrer cannot receive email')
    return false
  }
  if (referrer.email_status === 'invalid' || referrer.email_status === 'disposable') {
    console.warn('[referral] skip signup notify: referrer email not deliverable')
    return false
  }
  if (!resendConfigured()) {
    console.warn('[referral] skipped signup notify: RESEND_API_KEY missing')
    return false
  }

  const code = opts?.code || getReferralCode(referrer)
  if (!code) {
    console.warn('[referral] skip signup notify: missing code')
    return false
  }
  const link = opts?.link || referralLinkForCode(code)
  const sender = await getSetting('sender')
  const firstName = referrer.first_name || referrer.full_name?.split(/\s+/)[0] || 'there'
  const { subject, text, html } = referrerSignupEmailCopy({ firstName, link })

  const { data, error } = await resend().emails.send({
    from: formatAddress(sender.from_name || 'Daniel Chalco', sender.from_email),
    to: [referrer.email],
    replyTo: sender.reply_to || undefined,
    subject,
    text,
    html,
    tags: [
      { name: 'kind', value: 'referral_signup' },
      { name: 'lead_id', value: referrer.id },
    ],
  })
  if (error) {
    console.warn('[referral] signup notify resend error', error.message)
    return false
  }

  try {
    const emailId = randomUUID()
    const sentAt = new Date().toISOString()
    const { error: logError } = await db().from('emails').insert({
      id: emailId,
      lead_id: referrer.id,
      thread_id: emailId,
      direction: 'outbound',
      status: 'sent',
      source: 'notification',
      from_address: sender.from_email,
      to_addresses: [referrer.email],
      reply_to: sender.reply_to || null,
      subject,
      text_body: text,
      html_body: html,
      resend_id: data?.id || null,
      sent_at: sentAt,
    })
    if (logError) throw logError
  } catch (logError) {
    console.warn('[referral] signup notify log failed', logError)
  }

  return true
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
    'Share that link. When someone applies for a pentest through it, we credit the referral to you.',
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
<p>Share that link. When someone applies for a pentest through it, we credit the referral to you.</p>
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
    const emailId = randomUUID()
    const sentAt = new Date().toISOString()
    const { error: logError } = await db().from('emails').insert({
      id: emailId,
      lead_id: lead.id,
      thread_id: emailId,
      direction: 'outbound',
      status: 'sent',
      source: 'notification',
      from_address: sender.from_email,
      to_addresses: [lead.email],
      reply_to: sender.reply_to || null,
      subject,
      text_body: text,
      html_body: html,
      resend_id: data?.id || null,
      sent_at: sentAt,
    })
    if (logError) throw logError
    const program = {
      ...((lead.custom?.referral_program as ReferralProgramCustom) || {}),
      code,
      emailed_at: sentAt,
    }
    await db()
      .from('leads')
      .update({
        last_outbound_at: sentAt,
        last_contacted_at: sentAt,
        custom: { ...(lead.custom || {}), referral_program: program },
      })
      .eq('id', lead.id)
  } catch (logError) {
    console.warn('[referral] email log failed', logError)
  }

  return true
}

/**
 * Attribute a newly captured customer lead to a referrer by code.
 * No credit for existing Bodega emails, blog / Coo Crew / partnership, or self-referral.
 */
export async function attributeLeadToReferralCode(
  leadId: string,
  rawCode: string | null | undefined,
  options: { isNewLead?: boolean } = {},
): Promise<Lead | null> {
  if (!rawCode) return null
  if (options.isNewLead === false) return null
  const code = normalizeReferralCode(rawCode)
  if (code.length < CODE_MIN) return null

  const lead = await getLead(leadId)
  if (!isCreditableReferralSource(lead.source)) return null
  if (getReferredByLeadId(lead)) return lead

  const email = normalizeEmail(lead.email)
  const prior = await db()
    .from('leads')
    .select('id')
    .ilike('email', email)
    .neq('id', lead.id)
    .limit(1)
    .maybeSingle()
  if (!prior.error && prior.data) return null

  // Default: only brand-new rows (created in the last few minutes) get credit
  // unless the caller explicitly passes isNewLead: true.
  if (options.isNewLead !== true) {
    const createdMs = lead.created_at ? new Date(lead.created_at).getTime() : 0
    if (!createdMs || Date.now() - createdMs > 5 * 60 * 1000) return null
  }

  const referrer = await findLeadByReferralCode(code)
  if (!referrer) return null
  if (referrer.id === lead.id) return null
  if (email === normalizeEmail(referrer.email)) return null

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

  const attributed = !withColumn.error && withColumn.data
    ? (withColumn.data as Lead)
    : null

  if (!attributed) {
    const { data, error } = await db()
      .from('leads')
      .update({ tags, custom })
      .eq('id', lead.id)
      .select('*')
      .single()
    if (error) throw error
    void notifyReferrerOfSignup(referrer, { code }).catch((err) =>
      console.warn('[referral] signup notify failed', err),
    )
    return data as Lead
  }

  void notifyReferrerOfSignup(referrer, { code }).catch((err) =>
    console.warn('[referral] signup notify failed', err),
  )
  return attributed
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}
