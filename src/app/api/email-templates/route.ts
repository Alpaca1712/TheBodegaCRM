import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'

const categories = ['general', 'follow_up', 'intro', 'pitch', 'meeting_followup', 'deal_update', 'newsletter'] as const

const templateSchema = z.object({
  name: z.string().trim().min(1).max(255),
  subject: z.string().trim().min(1).max(255),
  body: z.string().trim().min(1).max(50_000),
  category: z.enum(categories).default('general'),
  is_shared: z.boolean().default(false),
  tags: z.array(z.string().trim().min(1).max(80)).max(30).optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

    const params = request.nextUrl.searchParams
    const category = params.get('category')
    const isShared = params.get('isShared')
    const popular = params.get('popular') === 'true'
    const parsedLimit = Number.parseInt(params.get('limit') || '50', 10)
    const limit = Math.min(Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 50, 1), 100)

    let query = supabase
      .from('email_templates')
      .select('*')
      .eq('org_id', orgId)
      .limit(limit)

    if (category && categories.includes(category as typeof categories[number])) query = query.eq('category', category)
    if (isShared === 'true' || isShared === 'false') query = query.eq('is_shared', isShared === 'true')
    query = popular
      ? query.order('usage_count', { ascending: false })
      : query.order('name', { ascending: true })

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('GET /api/email-templates error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load email templates' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

    const validation = templateSchema.safeParse(await request.json())
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid email template', details: validation.error.format() }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        ...validation.data,
        user_id: user.id,
        org_id: orgId,
        usage_count: 0,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('POST /api/email-templates error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create email template' },
      { status: 500 },
    )
  }
}
