import { type NextRequest, NextResponse } from 'next/server'
import { getSafeInternalRedirect } from './lib/auth/redirects'
import { createMiddlewareClient } from './lib/supabase/middleware'

// Routes accessible without authentication
const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/callback',
  '/invite',
  '/',
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?')
  )
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  )
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
}

function isSelfAuthenticatingApiRoute(request: NextRequest): boolean {
  return request.method === 'GET' && /^\/api\/leads\/[0-9a-fA-F-]{36}$/.test(request.nextUrl.pathname)
}

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)

  if (isSelfAuthenticatingApiRoute(request)) {
    applySecurityHeaders(response)
    return response
  }

  // Authenticate the cookie-backed session against Supabase Auth.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, search } = request.nextUrl

  // Auth enforcement: redirect unauthenticated users away from protected routes
  if (!user && !isPublicPath(pathname)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectedFrom', `${pathname}${search}`)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from login/signup
  if (user && (pathname === '/login' || pathname.startsWith('/signup'))) {
    const redirectedFrom = getSafeInternalRedirect(request.nextUrl.searchParams.get('redirectedFrom'))
    if (redirectedFrom) {
      return NextResponse.redirect(new URL(redirectedFrom, request.url))
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Security headers (applied to all responses)
  applySecurityHeaders(response)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
