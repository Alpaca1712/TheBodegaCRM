import { type NextRequest, NextResponse } from 'next/server'
import { getSafeInternalRedirect } from './lib/auth/redirects'
import { createMiddlewareClient } from './lib/supabase/middleware'

// Pages that never need a session. Every /api/* route authenticates itself
// (API key or session) so agents can call the API without cookies.
const PUBLIC_PATHS = ['/login', '/']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path)
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    applySecurityHeaders(response)
    return response
  }

  const { supabase, response } = createMiddlewareClient(request)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectedFrom', `${pathname}${search}`)
    return NextResponse.redirect(loginUrl)
  }

  if (user && (pathname === '/login' || pathname === '/')) {
    const redirectedFrom = getSafeInternalRedirect(request.nextUrl.searchParams.get('redirectedFrom'))
    return NextResponse.redirect(new URL(redirectedFrom || '/leads', request.url))
  }

  applySecurityHeaders(response)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
