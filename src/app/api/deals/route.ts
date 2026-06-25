import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getErrorMessage, hydrateOpportunityRelations, recordOpportunityEvent, statusForDealStage } from '@/lib/deals/server'
import { isMissingRelation } from '@/lib/supabase/missing-column'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'
import { DEAL_STAGE_PROBABILITY, DEAL_STAGES, type DealStage, type Opportunity } from '@/types/deals'

const createDealSchema = z.object({
  lead_id: z.string().uuid(),
  campaign_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1).optional().nullable(),
  stage: z.enum(DEAL_STAGES).default('discovery_booked'),
  estimated_value: z.number().nonnegative().optional().nullable(),
  discovery_booked_at: z.string().optional().nullable(),
  expected_close_date: z.string().optional().nullable(),
  next_step: z.string().optional().nullable(),
  next_step_due_at: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  attribution: z.record(z.string(), z.unknown()).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const stage = request.nextUrl.searchParams.get('stage')
    const status = request.nextUrl.searchParams.get('status')
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') || '100'), 1), 200)

    let query = supabase
      .from('opportunities')
      .select('*')
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (stage) query = query.eq('stage', stage)
    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error && isMissingRelation(error, 'opportunities')) {
      return NextResponse.json({ data: [], setup_required: true })
    }
    if (error) throw error

    const deals = await hydrateOpportunityRelations({
      supabase,
      orgId,
      opportunities: (data || []) as Opportunity[],
    })

    return NextResponse.json({ data: deals })
  } catch (error) {
    console.error('GET /api/deals error:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to load deals') },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const body = await request.json()
    const validation = createDealSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 })
    }

    const input = validation.data
    const { data: lead } = await supabase
      .from('leads')
      .select('id,contact_name,company_name,source,lead_token')
      .eq('id', input.lead_id)
      .eq('org_id', orgId)
      .single()

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    if (input.campaign_id) {
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('id')
        .eq('id', input.campaign_id)
        .eq('org_id', orgId)
        .single()
      if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const stage = input.stage as DealStage
    const { data, error } = await supabase
      .from('opportunities')
      .insert({
        org_id: orgId,
        user_id: user.id,
        lead_id: input.lead_id,
        campaign_id: input.campaign_id || null,
        name: input.name || `${lead.company_name || lead.contact_name} Deal`,
        stage,
        status: statusForDealStage(stage),
        estimated_value: input.estimated_value ?? null,
        probability: DEAL_STAGE_PROBABILITY[stage],
        discovery_booked_at: input.discovery_booked_at || (stage === 'discovery_booked' ? new Date().toISOString() : null),
        expected_close_date: input.expected_close_date || null,
        next_step: input.next_step || null,
        next_step_due_at: input.next_step_due_at || null,
        source: input.source || lead.source || 'manual',
        attribution: {
          lead_token: lead.lead_token,
          ...(input.attribution || {}),
        },
      })
      .select()
      .single()

    if (error) throw error

    await recordOpportunityEvent({
      supabase,
      opportunityId: data.id,
      orgId,
      userId: user.id,
      eventType: 'created',
      newStage: stage,
      metadata: { source: input.source || 'manual' },
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('POST /api/deals error:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to create deal') },
      { status: 500 },
    )
  }
}
