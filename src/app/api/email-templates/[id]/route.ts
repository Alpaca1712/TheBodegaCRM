import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'

const categories = ['general', 'follow_up', 'intro', 'pitch', 'meeting_followup', 'deal_update', 'newsletter'] as const
const updateSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  subject: z.string().trim().min(1).max(255).optional(),
  body: z.string().trim().min(1).max(50_000).optional(),
  category: z.enum(categories).optional(),
  is_shared: z.boolean().optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(30).optional().nullable(),
  increment_usage: z.boolean().optional(),
}).strict()

async function ownedTemplate(
  id: string,
  orgId: string,
  userId: string,
  supabase: Awaited<ReturnType<typeof getOrgScopedClient>>['supabase'],
) {
  return supabase
    .from('email_templates')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle()
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/email-templates/[id] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load email template' },
      { status: 500 },
    )
  }
}

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
      return NextResponse.json({ error: 'Invalid email template update', details: validation.error.format() }, { status: 400 })
    }

    const current = await ownedTemplate(id, orgId, user.id, supabase)
    if (current.error) throw current.error
    if (!current.data) return NextResponse.json({ error: 'Template not found or not editable' }, { status: 404 })

    const { increment_usage, ...updates } = validation.data
    const payload = increment_usage
      ? {
          ...updates,
          usage_count: (current.data.usage_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        }
      : updates

    const { data, error } = await supabase
      .from('email_templates')
      .update(payload)
      .eq('id', id)
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('PATCH /api/email-templates/[id] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update email template' },
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
      .from('email_templates')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('org_id', orgId)
      .eq('user_id', user.id)

    if (error) throw error
    if (!count) return NextResponse.json({ error: 'Template not found or not editable' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/email-templates/[id] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete email template' },
      { status: 500 },
    )
  }
}
