import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { CookieOptions } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  // if "next" is in param, use it as the redirect URL
  const next = requestUrl.searchParams.get('next') ?? '/'

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

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Successful authentication, redirect to the specified next URL or home
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // If no code or error, redirect to login with error message
  return NextResponse.redirect(new URL(`/login?error=Could not authenticate`, request.url))
}
