import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/api/gmail'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(new URL('/email?error=no_code', request.url))
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[Gmail Callback] Auth failed:', authError?.message)
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const { data: profile } = await supabase
      .from('profiles')
      .select('active_org_id')
      .eq('user_id', user.id)
      .single()

    const { error: upsertError } = await supabase.from('email_accounts').upsert({
      user_id: user.id,
      org_id: profile?.active_org_id || null,
      provider: 'gmail',
      email_address: tokens.email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt,
      sync_enabled: true,
    }, { onConflict: 'user_id,email_address' })

    if (upsertError) {
      console.error('[Gmail Callback] Upsert error:', upsertError)
      return NextResponse.redirect(new URL('/email?error=db_failed', request.url))
    }

    console.log('[Gmail Callback] Connected:', tokens.email, 'for user:', user.id)
    return NextResponse.redirect(new URL('/email?connected=true', request.url))
  } catch (err) {
    console.error('[Gmail Callback] OAuth error:', err)
    return NextResponse.redirect(new URL('/email?error=auth_failed', request.url))
  }
}
