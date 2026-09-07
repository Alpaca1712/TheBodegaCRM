import { NextResponse, type NextRequest } from 'next/server'
import type { WebhookEventPayload } from 'resend'
import { resend } from '@/lib/email/resend'
import { handleResendEvent } from '@/lib/email/webhook'

export const maxDuration = 60

/**
 * Resend webhook receiver. Configure the endpoint in Resend for all `email.*`
 * events (including `email.received`) and set RESEND_WEBHOOK_SECRET.
 */
export async function POST(request: NextRequest) {
  const payload = await request.text()
  const secret = process.env.RESEND_WEBHOOK_SECRET
  const svixId = request.headers.get('svix-id')

  let event: WebhookEventPayload
  if (secret) {
    try {
      event = resend().webhooks.verify({
        payload,
        webhookSecret: secret,
        headers: {
          id: svixId || '',
          timestamp: request.headers.get('svix-timestamp') || '',
          signature: request.headers.get('svix-signature') || '',
        },
      })
    } catch (error) {
      console.warn('[resend-webhook] signature verification failed', error)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } else if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'RESEND_WEBHOOK_SECRET is not configured' }, { status: 500 })
  } else {
    event = JSON.parse(payload) as WebhookEventPayload
  }

  try {
    const result = await handleResendEvent(event, svixId)
    return NextResponse.json({ ok: true, type: event.type, ...result })
  } catch (error) {
    console.error('[resend-webhook] failed to process', event.type, error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to process event' }, { status: 500 })
  }
}
