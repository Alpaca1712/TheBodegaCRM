import { NextResponse } from 'next/server'
import { getGoogleAuthUrl } from '@/lib/api/gmail'

export async function GET() {
  const url = getGoogleAuthUrl()
  return NextResponse.redirect(url)
}
