import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createSchema = z.object({
  lead_id: z.string().uuid(),
  email_type: z.enum(['initial', 'follow_up_1', 'follow_up_2', 'follow_up_3', 'reply_response', 'meeting_request', 'lead_magnet']),
  cta_type: z.enum(['mckenna', 'hormozi']).optional().nullable(),
  subject: z.string(),
  body: z.string(),
  direction: z.enum(['inbound', 'outbound']).default('outbound'),
})

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

    const { data, error } = await supabase
      .from('lead_emails')
      .insert({
        ...validation.data,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('POST /api/lead-emails error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save email' },
      { status: 500 }
    )
  }
}
