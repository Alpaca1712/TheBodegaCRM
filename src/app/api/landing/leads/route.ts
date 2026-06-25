import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { enrollLeadInCampaign, recordCampaignEvent } from '@/lib/campaigns/server'
import {
  buildLeadProfilePatchFromChallenge,
  hasChallengeProfile,
  normalizeLandingChallengeProfile,
  shouldTreatNotesAsChallengeProfile,
} from '@/lib/leads/challenge-profile'
import { createAdminClient } from '@/lib/supabase/admin'
import { isMissingColumn, omitColumn } from '@/lib/supabase/missing-column'
import type { Campaign, CampaignEventType } from '@/types/campaigns'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const landingLeadSchema = z.object({
  campaign_id: z.string().uuid().optional().nullable(),
  campaign_slug: z.string().optional().nullable(),
  landing_slug: z.string().optional().nullable(),
  lead_token: z.string().optional().nullable(),
  intent: z.enum(['lead_magnet', 'application', 'application_completed', 'discovery', 'conference_scan']).default('lead_magnet'),
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
}).passthrough()

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init)
  for (const [key, value] of Object.entries(corsHeaders)) response.headers.set(key, value)
  return response
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  try {
    const token = (
      request.nextUrl.searchParams.get('lead_token') ||
      request.nextUrl.searchParams.get('leadToken') ||
      request.nextUrl.searchParams.get('lead') ||
      ''
    ).trim()
    const campaignId = request.nextUrl.searchParams.get('campaign_id')?.trim() || ''

    if (!token) return json({ success: false, error: 'lead_token is required' }, { status: 400 })

    const supabase = createAdminClient()
    let campaign: Campaign | null = null

    if (campaignId) {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .maybeSingle()

      if (error) throw error
      if (!data) return json({ success: false, error: 'Campaign not found' }, { status: 404 })
      campaign = data as Campaign
    }

    let leadQuery = supabase
      .from('leads')
      .select('id,org_id,contact_name,contact_email,company_name,contact_phone,lead_token')
      .eq('lead_token', token)
      .limit(1)

    if (campaign) leadQuery = leadQuery.eq('org_id', campaign.org_id)

    const { data: lead, error: leadError } = await leadQuery.maybeSingle()

    if (isMissingColumn(leadError, 'lead_token')) {
      return json({ success: false, error: 'Lead tokens are not enabled' }, { status: 500 })
    }
    if (leadError) throw leadError
    if (!lead) return json({ success: false, error: 'Lead not found' }, { status: 404 })

    return json({
      success: true,
      leadToken: lead.lead_token || token,
      lead: {
        name: lead.contact_name || '',
        email: lead.contact_email || '',
        company: lead.company_name || '',
        phone: lead.contact_phone || '',
      },
    })
  } catch (error) {
    console.error('GET /api/landing/leads error:', error)
    return json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to lookup landing lead' },
      { status: 500 },
    )
  }
}

function campaignEventForIntent(intent: z.infer<typeof landingLeadSchema>['intent']): CampaignEventType {
  if (intent === 'application') return 'application_completed'
  if (intent === 'application_completed') return 'application_completed'
  if (intent === 'discovery') return 'meeting_booked'
  if (intent === 'conference_scan') return 'badge_scanned'
  return 'lead_magnet_requested'
}

function stageForIntent(intent: z.infer<typeof landingLeadSchema>['intent']) {
  if (intent === 'discovery') return 'meeting_booked'
  if (intent === 'conference_scan') return 'replied'
  if (intent === 'application' || intent === 'application_completed') return 'follow_up'
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
    } else {
      return json({ error: 'campaign_id, campaign_slug, or utm_campaign is required' }, { status: 400 })
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
    const challengeProfile = normalizeLandingChallengeProfile(input as Record<string, unknown>)
    const hasStructuredChallengeProfile = hasChallengeProfile(challengeProfile)
    const manualNotes = shouldTreatNotesAsChallengeProfile(input.notes) ? null : input.notes || null
    const attributionMetadata = {
      ...input.metadata,
      intent: input.intent,
      campaign_id: resolvedCampaign.id,
      campaign_slug: resolvedCampaign.slug,
      landing_slug: input.landing_slug || null,
      lead_token: leadToken,
      challenge_profile: hasStructuredChallengeProfile ? challengeProfile : null,
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
      landing_slug: input.landing_slug || null,
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
      const challengeLeadPatch = hasStructuredChallengeProfile
        ? buildLeadProfilePatchFromChallenge(challengeProfile)
        : {}
      const leadInsertPayload = {
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
        notes: manualNotes,
        ...challengeLeadPatch,
      }
      if (input.intent === 'discovery') leadInsertPayload.priority = 'high'

      let { data: insertedLead, error: insertError } = await supabase
        .from('leads')
        .insert(leadInsertPayload)
        .select()
        .single()

      if (isMissingColumn(insertError, 'source_type')) {
        const retry = await supabase
          .from('leads')
          .insert(omitColumn(leadInsertPayload, 'source_type'))
          .select()
          .single()
        insertedLead = retry.data
        insertError = retry.error
      }

      if (isMissingColumn(insertError, 'lead_token')) {
        const retry = await supabase
          .from('leads')
          .insert(omitColumn(omitColumn(leadInsertPayload, 'source_type'), 'lead_token'))
          .select()
          .single()
        insertedLead = retry.data
        insertError = retry.error
      }

      if (insertError) throw insertError
      lead = insertedLead
      leadWasCreated = true
    } else {
      const challengeLeadPatch = hasStructuredChallengeProfile
        ? buildLeadProfilePatchFromChallenge(challengeProfile, existingLead)
        : {}
      let leadUpdatePayload: Record<string, unknown> = {
        lead_token: existingLead.lead_token || leadToken,
        source: existingLead.source || source,
        source_type: existingLead.source_type || (input.intent === 'conference_scan' ? 'outreach' : 'website'),
        company_website: existingLead.company_website || input.company_website || null,
        contact_title: existingLead.contact_title || input.contact_title || null,
        ...challengeLeadPatch,
      }
      if (input.intent === 'discovery') leadUpdatePayload.priority = 'high'
      if (manualNotes && !existingLead.notes) leadUpdatePayload.notes = manualNotes
      if (hasStructuredChallengeProfile && !manualNotes && shouldTreatNotesAsChallengeProfile(existingLead.notes)) leadUpdatePayload.notes = null

      let { error: updateError } = await supabase
        .from('leads')
        .update(leadUpdatePayload)
        .eq('id', existingLead.id)
        .eq('org_id', orgId)

      if (isMissingColumn(updateError, 'source_type')) {
        leadUpdatePayload = omitColumn(leadUpdatePayload, 'source_type')
        const retry = await supabase
          .from('leads')
          .update(leadUpdatePayload)
          .eq('id', existingLead.id)
          .eq('org_id', orgId)
        updateError = retry.error
      }

      if (isMissingColumn(updateError, 'lead_token')) {
        leadUpdatePayload = omitColumn(leadUpdatePayload, 'lead_token')
        const retry = await supabase
          .from('leads')
          .update(leadUpdatePayload)
          .eq('id', existingLead.id)
          .eq('org_id', orgId)
        updateError = retry.error
      }

      if (updateError) {
        throw updateError
      }
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
      landing_slug: input.landing_slug || null,
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
