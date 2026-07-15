import { NextResponse } from 'next/server'
import { getServiceHealth } from '@/lib/operations/health'

export const dynamic = 'force-dynamic'

export async function GET() {
  const health = getServiceHealth()
  const response = NextResponse.json(health, {
    status: health.status === 'unhealthy' ? 503 : 200,
  })
  response.headers.set('Cache-Control', 'no-store')
  return response
}
