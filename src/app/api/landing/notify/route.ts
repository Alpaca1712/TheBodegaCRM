import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { notifyOwner } from '@/lib/notifications'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Webhook-Secret',
}

const schema = z.object({
  subject: z.string().trim().min(1).max(200),
  lines: z.array(z.string().max(2000)).min(1).max(80),
})

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init)
  for (const [key, value] of Object.entries(corsHeaders)) response.headers.set(key, value)
  return response
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

function authorized(request: NextRequest) {
  const secret = process.env.LANDING_WEBHOOK_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production'
  const provided =
    request.headers.get('x-webhook-secret') ||
    /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') || '')?.[1]
  return provided === secret
}

/** Website intake alerts from Rocoto-Landing → owner inbox via Resend. */
export async function POST(request: NextRequest) {
  if (!authorized(request)) return json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const input = schema.parse(await request.json())
    const sent = await notifyOwner('inbound_lead', input.subject, input.lines, { force: true })
    return json({ success: true, sent })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: 'Invalid request', details: error.issues }, { status: 400 })
    }
    console.error('POST /api/landing/notify error:', error)
    return json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
