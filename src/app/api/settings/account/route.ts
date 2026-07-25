import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const preferencesSchema = z.object({
  email_notifications: z.boolean(),
  deal_alerts: z.boolean(),
  weekly_reports: z.boolean(),
})

const updateSchema = z.object({
  name: z.string().trim().max(120).optional().nullable(),
  notification_preferences: preferencesSchema.optional(),
}).strict()

function accountPayload(user: {
  id: string
  email?: string
  user_metadata: Record<string, unknown>
}) {
  return {
    id: user.id,
    name: typeof user.user_metadata.name === 'string' ? user.user_metadata.name : null,
    email: user.email || '',
    avatar_url: typeof user.user_metadata.avatar_url === 'string' ? user.user_metadata.avatar_url : null,
    notification_preferences: preferencesSchema.catch({
      email_notifications: true,
      deal_alerts: true,
      weekly_reports: false,
    }).parse(user.user_metadata.notification_preferences),
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json(accountPayload(user))
  } catch (error) {
    console.error('GET /api/settings/account error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load account' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const validation = updateSchema.safeParse(await request.json())
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid account update', details: validation.error.format() }, { status: 400 })
    }

    const metadata = {
      ...user.user_metadata,
      ...(validation.data.name !== undefined ? { name: validation.data.name } : {}),
      ...(validation.data.notification_preferences
        ? { notification_preferences: validation.data.notification_preferences }
        : {}),
    }
    const { data, error } = await supabase.auth.updateUser({ data: metadata })
    if (error) throw error
    if (!data.user) throw new Error('Account update did not return a user')
    return NextResponse.json(accountPayload(data.user))
  } catch (error) {
    console.error('PATCH /api/settings/account error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update account' },
      { status: 500 },
    )
  }
}
