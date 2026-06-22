import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'

const updateSchema = z.object({
  subject: z.string().optional(),
  body: z.string().optional(),
  sent_at: z.string().nullable().optional(),
  email_type: z.string().optional(),
  cta_type: z.enum(['mckenna', 'hormozi']).optional().nullable(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const body = await request.json()
    const validation = updateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 })
    }

    // Verify email ownership before updating
    const { data: email, error: fetchError } = await supabase
      .from('lead_emails')
      .select('id, org_id')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (fetchError || !email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('lead_emails')
      .update(validation.data)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('PATCH /api/lead-emails/[id] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update email' },
      { status: 500 }
    )
  }
}
