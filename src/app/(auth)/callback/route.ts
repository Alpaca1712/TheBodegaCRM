import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { CookieOptions } from '@supabase/ssr'

async function acceptPendingInvite(userId: string, userEmail: string, inviteToken?: string | null) {
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  if (inviteToken) {
    const { data: invite } = await service
      .from('org_invites')
      .select('*')
      .eq('token', inviteToken)
      .is('accepted_at', null)
      .single()

    if (invite && new Date(invite.expires_at) > new Date()) {
      await service.from('org_members').upsert(
        { org_id: invite.org_id, user_id: userId, role: invite.role, invited_by: invite.invited_by },
        { onConflict: 'org_id,user_id' }
      )
      await service.from('org_invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)
      await service.from('profiles').update({ active_org_id: invite.org_id }).eq('user_id', userId)
      return
    }
  }

  const { data: pendingInvites } = await service
    .from('org_invites')
    .select('id, org_id, role, invited_by, expires_at')
    .eq('email', userEmail)
    .is('accepted_at', null)

  if (pendingInvites?.length) {
    for (const invite of pendingInvites) {
      if (new Date(invite.expires_at) > new Date()) {
        await service.from('org_members').upsert(
          { org_id: invite.org_id, user_id: userId, role: invite.role, invited_by: invite.invited_by },
          { onConflict: 'org_id,user_id' }
        )
        await service.from('org_invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)
        await service.from('profiles').update({ active_org_id: invite.org_id }).eq('user_id', userId)
      }
    }
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const inviteToken = requestUrl.searchParams.get('invite_token')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async getAll() {
            const cookieStoreResolved = await cookieStore
            const allCookies = []
            for (const cookie of cookieStoreResolved.getAll()) {
              allCookies.push({
                name: cookie.name,
                value: cookie.value
              })
            }
            return allCookies
          },
          async setAll(cookiesToSet: Array<{ name: string, value: string, options: CookieOptions }>) {
            try {
              const cookieStoreResolved = await cookieStore
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStoreResolved.set(name, value, options)
              )
            } catch {
              // Ignore if called from Server Component
            }
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        await acceptPendingInvite(user.id, user.email, inviteToken)
      }

      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  return NextResponse.redirect(new URL(`/login?error=Could not authenticate`, request.url))
}
