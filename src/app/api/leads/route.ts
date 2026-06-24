import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isMissingColumn, omitColumn } from '@/lib/supabase/missing-column'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'
import { enrollLeadInCampaign, getCampaignByIdOrSlug, recordCampaignEvent } from '@/lib/campaigns/server'
import { LEAD_SOURCE_TYPES, LEAD_TYPES, PIPELINE_STAGES, PRIORITIES } from '@/types/leads'

const createSchema = z.object({
  type: z.enum(LEAD_TYPES),
  company_name: z.string().min(1),
  product_name: z.string().optional().nullable(),
  fund_name: z.string().optional().nullable(),
  contact_name: z.string().min(1),
  contact_title: z.string().optional().nullable(),
  contact_email: z.string().email().optional().nullable().or(z.literal('')),
  contact_twitter: z.string().optional().nullable(),
  contact_linkedin: z.string().optional().nullable(),
  company_description: z.string().optional().nullable(),
  attack_surface_notes: z.string().optional().nullable(),
  investment_thesis_notes: z.string().optional().nullable(),
  personal_details: z.string().optional().nullable(),
  smykm_hooks: z.array(z.string()).optional().default([]),
  stage: z.enum(PIPELINE_STAGES).optional().default('researched'),
  source_type: z.enum(LEAD_SOURCE_TYPES).optional().default('manual'),
  source: z.string().optional().nullable(),
  lead_token: z.string().optional().nullable(),
  campaign_id: z.string().uuid().optional().nullable(),
  campaign_slug: z.string().optional().nullable(),
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  priority: z.enum(PRIORITIES).optional().default('medium'),
  notes: z.string().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  research_sources: z.array(z.object({ url: z.string(), title: z.string(), detail: z.string() })).optional().default([]),
  contact_photo_url: z.string().optional().nullable(),
  company_website: z.string().optional().nullable(),
  company_logo_url: z.string().optional().nullable(),
  org_chart: z.array(z.object({
    name: z.string(), title: z.string(),
    department: z.string().nullable().optional(),
    linkedin_url: z.string().nullable().optional(),
    photo_url: z.string().nullable().optional(),
    reports_to: z.string().nullable().optional(),
    lead_id: z.string().nullable().optional(),
  })).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const url = new URL(request.url)
    const type = url.searchParams.get('type')
    const stage = url.searchParams.get('stage')
    const priority = url.searchParams.get('priority')
    const search = url.searchParams.get('search')
    const view = url.searchParams.get('view')
    const parsedLimit = parseInt(url.searchParams.get('limit') || '50')
    const limit = Math.min(Math.max(isNaN(parsedLimit) ? 50 : parsedLimit, 1), 200)
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const selectColumns = view === 'pipeline'
      ? 'id,type,company_name,contact_name,stage,priority,last_contacted_at,smykm_hooks,conversation_next_step,battle_card,updated_at'
      : '*'

    let query = supabase
      .from('leads')
      .select(selectColumns, { count: 'exact' })
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false })

    if (type) query = query.eq('type', type)
    if (stage) query = query.eq('stage', stage)
    if (priority) query = query.eq('priority', priority)
    if (search) {
      const sanitized = search.replace(/[.,]/g, '')
      query = query.or(
        `contact_name.ilike.%${sanitized}%,company_name.ilike.%${sanitized}%,contact_email.ilike.%${sanitized}%`
      )
    }
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    const response = NextResponse.json({ data, count })
    response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30')
    return response
  } catch (error) {
    console.error('GET /api/leads error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch leads' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const body = await request.json()
    const validation = createSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 })
    }

    const {
      campaign_id,
      campaign_slug,
      utm_source,
      utm_medium,
      utm_campaign,
      ...leadPayload
    } = validation.data
    const resolvedCampaignSlug = campaign_slug || utm_campaign || null
    const campaign = await getCampaignByIdOrSlug(supabase, orgId, {
      campaignId: campaign_id,
      campaignSlug: resolvedCampaignSlug,
    })

    // Duplicate lead detection by contact_email
    const contactEmail = validation.data.contact_email
    if (contactEmail && contactEmail !== '') {
      const { data: existing } = await supabase
        .from('leads')
        .select('*')
        .eq('org_id', orgId)
        .eq('contact_email', contactEmail)
        .limit(1)
        .single()
      if (existing) {
        if (campaign) {
          await enrollLeadInCampaign({
            supabase,
            campaign,
            leadId: existing.id,
            userId: user.id,
            orgId,
            metadata: {
              source: validation.data.source || resolvedCampaignSlug,
              utm_source,
              utm_medium,
              utm_campaign,
            },
          })

          if (validation.data.source_type === 'website') {
            await recordCampaignEvent({
              supabase,
              campaignId: campaign.id,
              leadId: existing.id,
              orgId,
              userId: user.id,
              eventType: 'lead_magnet_requested',
              metadata: { source: validation.data.source || resolvedCampaignSlug, utm_source, utm_medium, utm_campaign },
            })
          }

          return NextResponse.json(existing)
        }

        return NextResponse.json(
          { error: 'A lead with this email already exists', existing_id: existing.id },
          { status: 409 }
        )
      }
    }

    const insertData = { ...leadPayload, user_id: user.id, org_id: orgId } as Record<string, unknown>
    if (campaign && !insertData.source) insertData.source = campaign.slug
    if (typeof insertData.contact_email === 'string' && insertData.contact_email.includes('@')) {
      insertData.email_domain = (insertData.contact_email as string).split('@')[1]?.toLowerCase()
    }

    let { data, error } = await supabase
      .from('leads')
      .insert(insertData)
      .select()
      .single()

    if (isMissingColumn(error, 'lead_token')) {
      const retry = await supabase
        .from('leads')
        .insert(omitColumn(insertData, 'lead_token'))
        .select()
        .single()
      data = retry.data
      error = retry.error
    }

    if (isMissingColumn(error, 'source_type')) {
      const retry = await supabase
        .from('leads')
        .insert(omitColumn(insertData, 'source_type'))
        .select()
        .single()
      data = retry.data
      error = retry.error
    }

    if (error) throw error
    if (campaign && data?.id) {
      await enrollLeadInCampaign({
        supabase,
        campaign,
        leadId: data.id,
        userId: user.id,
        orgId,
        metadata: {
          source: insertData.source,
          utm_source,
          utm_medium,
          utm_campaign,
        },
      })

      if (insertData.source_type === 'website') {
        await recordCampaignEvent({
          supabase,
          campaignId: campaign.id,
          leadId: data.id,
          orgId,
          userId: user.id,
          eventType: 'lead_magnet_requested',
          metadata: { source: insertData.source, utm_source, utm_medium, utm_campaign },
        })
      }
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('POST /api/leads error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create lead' },
      { status: 500 }
    )
  }
}
