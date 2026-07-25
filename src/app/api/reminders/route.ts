import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'

const reminderTypes = ['stale_deal', 'stale_contact', 'overdue_activity', 'upcoming_followup'] as const
const entityTypes = ['contact', 'company', 'deal', 'activity', 'investor', 'lead'] as const

const createSchema = z.object({
  type: z.enum(reminderTypes),
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().max(2_000).optional().nullable(),
  entity_type: z.enum(entityTypes),
  entity_id: z.string().uuid(),
  due_date: z.string().datetime().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

    const params = request.nextUrl.searchParams
    const parsedLimit = Number.parseInt(params.get('limit') || '50', 10)
    const limit = Math.min(Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 50, 1), 100)

    let query = supabase
      .from('reminders')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit)

    const isRead = params.get('isRead')
    const isResolved = params.get('isResolved')
    const type = params.get('type')
    const entityType = params.get('entityType')

    if (isRead === 'true' || isRead === 'false') query = query.eq('is_read', isRead === 'true')
    if (isResolved === 'true' || isResolved === 'false') query = query.eq('is_resolved', isResolved === 'true')
    if (type && reminderTypes.includes(type as typeof reminderTypes[number])) query = query.eq('type', type)
    if (entityType && entityTypes.includes(entityType as typeof entityTypes[number])) {
      query = query.eq('entity_type', entityType)
    }

    const { data, error } = await query
    if (error) throw error

    const response = NextResponse.json({ data: data || [] })
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  } catch (error) {
    console.error('GET /api/reminders error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load reminders' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

    const validation = createSchema.safeParse(await request.json())
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid reminder', details: validation.error.format() }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('reminders')
      .insert({
        ...validation.data,
        user_id: user.id,
        org_id: orgId,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('POST /api/reminders error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create reminder' },
      { status: 500 },
    )
  }
}
