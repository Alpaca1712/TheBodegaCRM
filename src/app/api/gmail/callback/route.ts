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
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const { data: profile } = await supabase
      .from('profiles')
      .select('active_org_id')
      .eq('user_id', session.user.id)
      .single()

    await supabase.from('email_accounts').upsert({
      user_id: session.user.id,
      org_id: profile?.active_org_id || null,
      provider: 'gmail',
      email_address: tokens.email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt,
      sync_enabled: true,
    }, { onConflict: 'user_id,email_address' })

    return NextResponse.redirect(new URL('/email?connected=true', request.url))
  } catch (err) {
    console.error('Gmail OAuth error:', err)
    return NextResponse.redirect(new URL('/email?error=auth_failed', request.url))
  }
}
