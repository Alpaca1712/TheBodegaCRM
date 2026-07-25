import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'

const updateSchema = z.object({
  title: z.string().trim().min(1).max(240).optional(),
  description: z.string().trim().max(2_000).optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
  is_read: z.boolean().optional(),
  is_resolved: z.boolean().optional(),
  resolved_at: z.string().datetime().optional().nullable(),
}).strict()

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

    const validation = updateSchema.safeParse(await request.json())
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid reminder update', details: validation.error.format() }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('reminders')
      .update(validation.data)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (error) {
    console.error('PATCH /api/reminders/[id] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update reminder' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

    const { error, count } = await supabase
      .from('reminders')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) throw error
    if (!count) return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/reminders/[id] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete reminder' },
      { status: 500 },
    )
  }
}
