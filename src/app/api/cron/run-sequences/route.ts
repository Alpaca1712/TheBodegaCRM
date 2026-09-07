import { NextResponse, type NextRequest } from 'next/server'
import { requireSharedSecret } from '@/lib/auth/authenticate'
import { toErrorResponse } from '@/lib/api/route'
import { runDueSteps } from '@/lib/sequences/runner'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

async function handle(request: NextRequest) {
  try {
    requireSharedSecret(request, process.env.CRON_SECRET, 'CRON_SECRET')
    const summary = await runDueSteps({ limit: 100 })
    return NextResponse.json({ ok: true, ...summary })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export const GET = handle
export const POST = handle
