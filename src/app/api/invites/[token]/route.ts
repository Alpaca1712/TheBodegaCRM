import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const service = getServiceClient()

    const { data: invite, error } = await service
      .from('org_invites')
      .select('id, org_id, email, role, expires_at, accepted_at')
      .eq('token', token)
      .single()

    if (error || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    if (invite.accepted_at) {
      return NextResponse.json({ error: 'Invite already accepted' }, { status: 410 })
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 410 })
    }

    const { data: org } = await service
      .from('organizations')
      .select('id, name')
      .eq('id', invite.org_id)
      .single()

    return NextResponse.json({
      email: invite.email,
      role: invite.role,
      orgName: org?.name || 'Unknown',
      orgId: invite.org_id,
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const service = getServiceClient()

    const { data: invite, error: findErr } = await service
      .from('org_invites')
      .select('*')
      .eq('token', token)
      .is('accepted_at', null)
      .single()

    if (findErr || !invite) {
      return NextResponse.json({ error: 'Invite not found or already accepted' }, { status: 404 })
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 410 })
    }

    if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json(
        { error: `This invite was sent to ${invite.email}. You are logged in as ${user.email}.` },
        { status: 403 }
      )
    }

    const { error: memberErr } = await service
      .from('org_members')
      .upsert(
        {
          org_id: invite.org_id,
          user_id: user.id,
          role: invite.role,
          invited_by: invite.invited_by,
        },
        { onConflict: 'org_id,user_id' }
      )

    if (memberErr) {
      return NextResponse.json({ error: memberErr.message }, { status: 500 })
    }

    await service
      .from('org_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    await service
      .from('profiles')
      .update({ active_org_id: invite.org_id })
      .eq('user_id', user.id)

    return NextResponse.json({ success: true, orgId: invite.org_id })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
