import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getCampaign } from '@/lib/content/service'
import type { LeadUpdateInput } from '@/lib/leads/schemas'
import { createLead, findLeadByEmail, splitName, updateLead } from '@/lib/leads/service'
import { createLeadToken, verifyLeadToken } from '@/lib/leads/tokens'
import { enrollLeads } from '@/lib/sequences/enrollments'
import type { Campaign, Lead, LeadStage } from '@/types'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Webhook-Secret',
}

const schema = z.object({
  campaign_id: z.string().uuid().nullable().optional(),
  campaign_slug: z.string().nullable().optional(),
  sequence_id: z.string().nullable().optional(),
  landing_slug: z.string().nullable().optional(),
  lead_token: z.string().nullable().optional(),
  intent: z.string().default('lead_magnet'),
  contact_name: z.string().min(1),
  contact_email: z.string().email(),
  contact_title: z.string().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  contact_linkedin: z.string().nullable().optional(),
  company_name: z.string().nullable().optional(),
  company_website: z.string().nullable().optional(),
  company_description: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  utm_source: z.string().nullable().optional(),
  utm_medium: z.string().nullable().optional(),
  utm_campaign: z.string().nullable().optional(),
  referrer: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).passthrough()

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init)
  for (const [key, value] of Object.entries(corsHeaders)) response.headers.set(key, value)
  return response
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

function authorized(request: NextRequest) {
  const secret = process.env.LANDING_WEBHOOK_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production'
  const provided = request.headers.get('x-webhook-secret') || /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') || '')?.[1]
  return provided === secret
}

/** Hydrates a known lead from its signed token so the landing page can prefill forms. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('lead_token') || request.nextUrl.searchParams.get('lead') || ''
  const leadId = verifyLeadToken(token)
  if (!leadId) return json({ success: false, error: 'Invalid lead token' }, { status: 400 })
  const { data } = await db().from('leads').select('id, full_name, email, company_name, phone').eq('id', leadId).maybeSingle()
  if (!data) return json({ success: false, error: 'Lead not found' }, { status: 404 })
  return json({ success: true, lead: { name: data.full_name || '', email: data.email, company: data.company_name || '', phone: data.phone || '' } })
}

function stageForIntent(intent: string): LeadStage {
  if (intent === 'discovery' || intent === 'meeting') return 'meeting_booked'
  if (intent === 'conference_scan') return 'replied'
  return 'interested'
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const input = schema.parse(await request.json())

    let campaign: Campaign | null = null
    if (input.campaign_id || input.campaign_slug || input.utm_campaign) {
      try {
        campaign = await getCampaign(input.campaign_id || input.campaign_slug || input.utm_campaign!)
      } catch {
        campaign = null
      }
    }
    if (!campaign) {
      const { data } = await db().from('campaigns').select('*').eq('is_default_landing', true).maybeSingle()
      campaign = (data as Campaign) || null
    }

    const existing = await findLeadByEmail(input.contact_email)
    const names = splitName(input.contact_name)
    const landingCustom = { intent: input.intent, ...(input.metadata || {}), submitted_at: new Date().toISOString() }
    const profile: LeadUpdateInput = {
      full_name: input.contact_name,
      first_name: names.first_name,
      last_name: names.last_name,
      title: input.contact_title ?? undefined,
      phone: input.contact_phone ?? undefined,
      linkedin_url: input.contact_linkedin ?? undefined,
      company_name: input.company_name ?? undefined,
      company_website: input.company_website ?? undefined,
      company_description: input.company_description ?? undefined,
    }

    let lead: Lead
    let createdNew = false
    if (existing) {
      // Landing data fills gaps but never overwrites what's already on the lead.
      const gaps = Object.fromEntries(
        Object.entries(profile).filter(([key, value]) => value != null && !existing[key as keyof Lead]),
      ) as LeadUpdateInput
      const terminal = ['customer', 'lost', 'unsubscribed', 'bounced'].includes(existing.stage)
      lead = await updateLead(existing.id, {
        ...gaps,
        campaign_id: campaign?.id ?? existing.campaign_id,
        custom: { ...existing.custom, landing: landingCustom },
        ...(terminal ? {} : { stage: stageForIntent(input.intent) }),
      })
    } else {
      lead = await createLead({
        ...profile,
        email: input.contact_email,
        stage: stageForIntent(input.intent),
        source: input.landing_slug ? `landing:${input.landing_slug}` : 'landing',
        campaign_id: campaign?.id ?? null,
        notes: input.notes ?? undefined,
        custom: { landing: landingCustom },
      })
      createdNew = true
    }

    if (!lead.lead_token) {
      const token = createLeadToken(lead.id)
      await db().from('leads').update({ lead_token: token }).eq('id', lead.id)
      lead.lead_token = token
    }

    await db().from('attribution_events').insert({
      lead_id: lead.id,
      campaign_id: campaign?.id || null,
      lead_token: lead.lead_token,
      event_type: createdNew ? 'lead_created' : 'lead_matched',
      landing_slug: input.landing_slug || null,
      source: input.utm_source || 'landing',
      medium: input.utm_medium || 'landing',
      campaign_slug: campaign?.slug || input.utm_campaign || null,
      utm_source: input.utm_source || null,
      utm_medium: input.utm_medium || null,
      utm_campaign: input.utm_campaign || null,
      referrer: input.referrer || null,
      user_agent: request.headers.get('user-agent'),
      metadata: { intent: input.intent, ...(input.metadata || {}) },
    })

    let enrollment: unknown = null
    if (input.sequence_id) {
      const result = await enrollLeads(input.sequence_id, { lead_ids: [lead.id], replace_existing: false })
      enrollment = result.enrolled[0] || { skipped: result.skipped }
    }

    return json({ data: { lead_id: lead.id, lead_token: lead.lead_token, campaign_id: campaign?.id || null, created: createdNew, enrollment } }, { status: createdNew ? 201 : 200 })
  } catch (error) {
    if (error instanceof z.ZodError) return json({ error: 'Invalid request', details: error.issues }, { status: 400 })
    console.error('POST /api/landing/leads error:', error)
    return json({ error: error instanceof Error ? error.message : 'Failed to capture landing lead' }, { status: 500 })
  }
}
