import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { enrollLeadInCampaign, recordCampaignEvent } from '@/lib/campaigns/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Campaign, CampaignEventType } from '@/types/campaigns'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const landingLeadSchema = z.object({
  campaign_id: z.string().uuid().optional().nullable(),
  campaign_slug: z.string().optional().nullable(),
  landing_slug: z.string().optional().nullable(),
  lead_token: z.string().optional().nullable(),
  intent: z.enum(['lead_magnet', 'application', 'discovery', 'conference_scan']).default('lead_magnet'),
  contact_name: z.string().min(1),
  contact_email: z.string().email(),
  contact_title: z.string().optional().nullable(),
  company_name: z.string().optional().nullable(),
  company_website: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  referrer: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init)
  for (const [key, value] of Object.entries(corsHeaders)) response.headers.set(key, value)
  return response
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

function campaignEventForIntent(intent: z.infer<typeof landingLeadSchema>['intent']): CampaignEventType {
  if (intent === 'application') return 'application_started'
  if (intent === 'discovery') return 'meeting_booked'
  if (intent === 'conference_scan') return 'badge_scanned'
  return 'lead_magnet_requested'
}

function stageForIntent(intent: z.infer<typeof landingLeadSchema>['intent']) {
  if (intent === 'discovery') return 'meeting_booked'
  if (intent === 'conference_scan') return 'replied'
  return 'researched'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = landingLeadSchema.safeParse(body)
    if (!validation.success) {
      return json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 })
    }

    const input = validation.data
    const supabase = createAdminClient()

    let campaignQuery = supabase.from('campaigns').select('*').limit(1)
    if (input.campaign_id) {
      campaignQuery = campaignQuery.eq('id', input.campaign_id)
    } else if (input.campaign_slug || input.utm_campaign) {
      campaignQuery = campaignQuery.eq('slug', input.campaign_slug || input.utm_campaign)
    } else if (input.landing_slug) {
      campaignQuery = campaignQuery.eq('landing_slug', input.landing_slug)
    } else {
      return json({ error: 'campaign_id, campaign_slug, utm_campaign, or landing_slug is required' }, { status: 400 })
    }

    const { data: campaign, error: campaignError } = await campaignQuery.maybeSingle()
    if (campaignError) throw campaignError
    if (!campaign) return json({ error: 'Campaign not found' }, { status: 404 })

    const resolvedCampaign = campaign as Campaign
    const orgId = resolvedCampaign.org_id
    const userId = resolvedCampaign.user_id
    const normalizedEmail = input.contact_email.toLowerCase().trim()
    const leadToken = input.lead_token || crypto.randomUUID()
    const emailDomain = normalizedEmail.split('@')[1]?.toLowerCase() || null
    const source = input.campaign_slug || resolvedCampaign.slug
    const attributionMetadata = {
      ...input.metadata,
      intent: input.intent,
      campaign_id: resolvedCampaign.id,
      campaign_slug: resolvedCampaign.slug,
      landing_slug: input.landing_slug || resolvedCampaign.landing_slug,
      lead_token: leadToken,
      utm_source: input.utm_source,
      utm_medium: input.utm_medium,
      utm_campaign: input.utm_campaign,
      referrer: input.referrer,
    }

    await supabase.from('campaign_attribution_events').insert({
      campaign_id: resolvedCampaign.id,
      org_id: orgId,
      user_id: userId,
      event_type: input.intent === 'conference_scan' ? 'conference_scan' : 'landing_form_submission',
      landing_slug: input.landing_slug || resolvedCampaign.landing_slug,
      lead_token: leadToken,
      source,
      medium: input.utm_medium || (input.intent === 'conference_scan' ? 'in_person' : 'landing'),
      campaign_slug: resolvedCampaign.slug,
      utm_source: input.utm_source,
      utm_medium: input.utm_medium,
      utm_campaign: input.utm_campaign,
      referrer: input.referrer,
      user_agent: request.headers.get('user-agent'),
      metadata: attributionMetadata,
    })

    const { data: existingLead } = await supabase
      .from('leads')
      .select('*')
      .eq('org_id', orgId)
      .eq('contact_email', normalizedEmail)
      .maybeSingle()

    let lead = existingLead
    let leadWasCreated = false

    if (!lead) {
      const companyName = input.company_name?.trim() || emailDomain || input.contact_name
      const { data: insertedLead, error: insertError } = await supabase
        .from('leads')
        .insert({
          org_id: orgId,
          user_id: userId,
          type: 'customer',
          company_name: companyName,
          contact_name: input.contact_name,
          contact_email: normalizedEmail,
          contact_title: input.contact_title || null,
          company_website: input.company_website || null,
          email_domain: emailDomain,
          stage: stageForIntent(input.intent),
          source_type: input.intent === 'conference_scan' ? 'outreach' : 'website',
          source,
          lead_token: leadToken,
          priority: input.intent === 'discovery' ? 'high' : 'medium',
          notes: input.notes || null,
        })
        .select()
        .single()

      if (insertError) throw insertError
      lead = insertedLead
      leadWasCreated = true
    } else {
      await supabase
        .from('leads')
        .update({
          lead_token: existingLead.lead_token || leadToken,
          source: existingLead.source || source,
          source_type: existingLead.source_type || (input.intent === 'conference_scan' ? 'outreach' : 'website'),
          company_website: existingLead.company_website || input.company_website || null,
          contact_title: existingLead.contact_title || input.contact_title || null,
        })
        .eq('id', existingLead.id)
        .eq('org_id', orgId)
    }

    const enrollment = await enrollLeadInCampaign({
      supabase,
      campaign: resolvedCampaign,
      leadId: lead.id,
      userId,
      orgId,
      metadata: attributionMetadata,
    })

    const campaignEvent = await recordCampaignEvent({
      supabase,
      campaignId: resolvedCampaign.id,
      enrollmentId: enrollment.id,
      leadId: lead.id,
      orgId,
      userId,
      eventType: campaignEventForIntent(input.intent),
      metadata: attributionMetadata,
    })

    await supabase.from('campaign_attribution_events').insert({
      campaign_id: resolvedCampaign.id,
      lead_id: lead.id,
      campaign_enrollment_id: enrollment.id,
      org_id: orgId,
      user_id: userId,
      event_type: leadWasCreated ? 'lead_created' : 'lead_matched',
      landing_slug: input.landing_slug || resolvedCampaign.landing_slug,
      lead_token: lead.lead_token || leadToken,
      source,
      medium: input.utm_medium || (input.intent === 'conference_scan' ? 'in_person' : 'landing'),
      campaign_slug: resolvedCampaign.slug,
      utm_source: input.utm_source,
      utm_medium: input.utm_medium,
      utm_campaign: input.utm_campaign,
      referrer: input.referrer,
      user_agent: request.headers.get('user-agent'),
      metadata: {
        ...attributionMetadata,
        campaign_event_id: campaignEvent.id,
      },
    })

    return json({
      data: {
        lead_id: lead.id,
        campaign_id: resolvedCampaign.id,
        campaign_slug: resolvedCampaign.slug,
        campaign_enrollment_id: enrollment.id,
        lead_token: lead.lead_token || leadToken,
        created: leadWasCreated,
      },
    }, { status: leadWasCreated ? 201 : 200 })
  } catch (error) {
    console.error('POST /api/landing/leads error:', error)
    return json(
      { error: error instanceof Error ? error.message : 'Failed to capture landing lead' },
      { status: 500 },
    )
  }
}
