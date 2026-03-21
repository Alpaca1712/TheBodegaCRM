import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { LEAD_TYPES, PIPELINE_STAGES, PRIORITIES } from '@/types/leads'

const updateSchema = z.object({
  type: z.enum(LEAD_TYPES).optional(),
  company_name: z.string().min(1).optional(),
  product_name: z.string().optional().nullable(),
  fund_name: z.string().optional().nullable(),
  contact_name: z.string().min(1).optional(),
  contact_title: z.string().optional().nullable(),
  contact_email: z.string().optional().nullable(),
  contact_twitter: z.string().optional().nullable(),
  contact_linkedin: z.string().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  company_description: z.string().optional().nullable(),
  attack_surface_notes: z.string().optional().nullable(),
  investment_thesis_notes: z.string().optional().nullable(),
  personal_details: z.string().optional().nullable(),
  smykm_hooks: z.array(z.string()).optional(),
  research_sources: z.array(z.object({
    url: z.string(),
    title: z.string(),
    detail: z.string(),
  })).optional(),
  stage: z.enum(PIPELINE_STAGES).optional(),
  source: z.string().optional().nullable(),
  priority: z.enum(PRIORITIES).optional(),
  notes: z.string().optional().nullable(),
  last_contacted_at: z.string().optional().nullable(),
  // Conversation intelligence (updated by AI analysis after interactions)
  conversation_summary: z.string().optional().nullable(),
  conversation_next_step: z.string().optional().nullable(),
  conversation_signals: z.array(z.object({
    type: z.enum(['positive', 'negative', 'neutral', 'action_needed', 'upsell_opportunity']),
    signal: z.string(),
    source: z.string(),
    detected_at: z.string().optional(),
  })).optional(),
  auto_stage_reason: z.string().optional().nullable(),
  // Enrichment
  contact_photo_url: z.string().optional().nullable(),
  company_website: z.string().optional().nullable(),
  company_logo_url: z.string().optional().nullable(),
  org_chart: z.array(z.object({
    name: z.string(),
    title: z.string(),
    department: z.string().nullable().optional(),
    linkedin_url: z.string().nullable().optional(),
    photo_url: z.string().nullable().optional(),
    reports_to: z.string().nullable().optional(),
    lead_id: z.string().nullable().optional(),
  })).optional(),
  // GTM
  icp_score: z.number().optional().nullable(),
  icp_reasons: z.array(z.string()).optional(),
  battle_card: z.record(z.unknown()).optional().nullable(),
  battle_card_generated_at: z.string().optional().nullable(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: emails } = await supabase
      .from('lead_emails')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: true })

    const { data: interactions } = await supabase
      .from('lead_interactions')
      .select('*')
      .eq('lead_id', id)
      .order('occurred_at', { ascending: true })

    // Fetch related leads at the same company (by domain)
    let relatedLeads: Array<{ id: string; contact_name: string; contact_email: string | null; contact_title: string | null; contact_photo_url: string | null; stage: string; type: string }> = []
    const domain = lead.email_domain || (lead.contact_email ? lead.contact_email.split('@')[1] : null)
    if (domain) {
      const { data: related } = await supabase
        .from('leads')
        .select('id, contact_name, contact_email, contact_title, contact_photo_url, stage, type')
        .eq('email_domain', domain)
        .neq('id', id)
        .limit(10)
      relatedLeads = related || []
    }

    return NextResponse.json({ lead, emails: emails || [], interactions: interactions || [], relatedLeads })
  } catch (error) {
    console.error('GET /api/leads/[id] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch lead' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const validation = updateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 })
    }

    const updateData = { ...validation.data } as Record<string, unknown>
    if (typeof updateData.contact_email === 'string' && updateData.contact_email.includes('@')) {
      updateData.email_domain = (updateData.contact_email as string).split('@')[1]?.toLowerCase()
    }

    const { data, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('PATCH /api/leads/[id] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update lead' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/leads/[id] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete lead' },
      { status: 500 }
    )
  }
}
