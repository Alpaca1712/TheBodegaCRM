import { NextResponse } from 'next/server'
import { getGoogleAuthUrl } from '@/lib/api/gmail'
import { requireUser } from '@/lib/api/auth-guard'

export async function GET() {
  // Must be signed in: otherwise an unauthenticated visitor could initiate
  // an OAuth flow that ends up linking a Google account to whichever session
  // happens to exist on the callback, or simply burn our OAuth quota.
  const guard = await requireUser()
  if (guard instanceof NextResponse) return guard

  const url = getGoogleAuthUrl()
  return NextResponse.redirect(url)
}
