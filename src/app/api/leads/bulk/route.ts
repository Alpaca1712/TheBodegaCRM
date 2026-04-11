import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { LEAD_TYPES, PIPELINE_STAGES, PRIORITIES } from '@/types/leads'

const MAX_BULK = 500

const bulkSchema = z.object({
  action: z.enum(['delete', 'update']),
  ids: z.array(z.string().uuid()).min(1).max(MAX_BULK),
  updates: z
    .object({
      stage: z.enum(PIPELINE_STAGES).optional(),
      priority: z.enum(PRIORITIES).optional(),
      type: z.enum(LEAD_TYPES).optional(),
    })
    .optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const validation = bulkSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 },
      )
    }

    const { action, ids, updates } = validation.data

    if (action === 'delete') {
      const { error, count } = await supabase
        .from('leads')
        .delete({ count: 'exact' })
        .in('id', ids)
        .eq('user_id', user.id)
      if (error) throw error
      return NextResponse.json({ success: true, affected: count ?? 0 })
    }

    // update
    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    const patch: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() }
    const { error, count } = await supabase
      .from('leads')
      .update(patch, { count: 'exact' })
      .in('id', ids)
      .eq('user_id', user.id)

    if (error) throw error
    return NextResponse.json({ success: true, affected: count ?? 0 })
  } catch (error) {
    console.error('POST /api/leads/bulk error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bulk operation failed' },
      { status: 500 },
    )
  }
}
