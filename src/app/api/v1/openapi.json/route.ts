import { NextResponse, type NextRequest } from 'next/server'
import { buildOpenApiSpec } from '@/lib/openapi'
import { appBaseUrl } from '@/lib/leads/tokens'

export const dynamic = 'force-dynamic'

/** Public: the spec contains no secrets and helps agents discover the API. */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('x-forwarded-host')
    ? `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('x-forwarded-host')}`
    : appBaseUrl()
  return NextResponse.json(buildOpenApiSpec(origin), { headers: { 'Cache-Control': 'public, max-age=300' } })
}
