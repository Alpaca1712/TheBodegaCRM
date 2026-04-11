import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { LEAD_TYPES, PIPELINE_STAGES, PRIORITIES } from '@/types/leads'

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
  source: z.string().optional().nullable(),
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(request.url)
    const type = url.searchParams.get('type')
    const stage = url.searchParams.get('stage')
    const priority = url.searchParams.get('priority')
    const search = url.searchParams.get('search')
    const parsedLimit = parseInt(url.searchParams.get('limit') || '50')
    const limit = Math.min(Math.max(isNaN(parsedLimit) ? 50 : parsedLimit, 1), 200)
    const offset = parseInt(url.searchParams.get('offset') || '0')

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
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

    return NextResponse.json({ data, count })
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const validation = createSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('active_org_id')
      .eq('user_id', user.id)
      .single()

    const orgId = profile?.active_org_id
    if (!orgId) {
      return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })
    }

    // Duplicate lead detection by contact_email
    const contactEmail = validation.data.contact_email
    if (contactEmail && contactEmail !== '') {
      const { data: existing } = await supabase
        .from('leads')
        .select('id')
        .eq('user_id', user.id)
        .eq('contact_email', contactEmail)
        .limit(1)
        .single()
      if (existing) {
        return NextResponse.json(
          { error: 'A lead with this email already exists', existing_id: existing.id },
          { status: 409 }
        )
      }
    }

    const insertData = { ...validation.data, user_id: user.id, org_id: orgId } as Record<string, unknown>
    if (typeof insertData.contact_email === 'string' && insertData.contact_email.includes('@')) {
      insertData.email_domain = (insertData.contact_email as string).split('@')[1]?.toLowerCase()
    }

    const { data, error } = await supabase
      .from('leads')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('POST /api/leads error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create lead' },
      { status: 500 }
    )
  }
}
