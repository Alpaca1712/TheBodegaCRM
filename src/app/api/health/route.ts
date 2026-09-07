import { NextResponse } from 'next/server'
import { getServiceHealth } from '@/lib/operations/health'

export const dynamic = 'force-dynamic'

export async function GET() {
  const health = getServiceHealth()
  return NextResponse.json(health, {
    status: health.status === 'unhealthy' ? 503 : 200,
    headers: { 'Cache-Control': 'no-store' },
  })
}
