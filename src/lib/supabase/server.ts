import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { CookieOptions } from '@supabase/ssr'

export const createClient = () => {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          // cookies() returns a Promise, so we need to await it
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
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
