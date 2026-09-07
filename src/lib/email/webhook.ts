import type { WebhookEventPayload } from 'resend'
import { db } from '@/lib/db'
import type { Email, EmailDeliveryStatus } from '@/types'
import { processReceivedEmail } from './inbound'
import { stopEnrollmentsForLead } from '@/lib/sequences/enrollments'

const STATUS_RANK: Record<EmailDeliveryStatus, number> = {
  queued: 0,
  sent: 1,
  delivery_delayed: 2,
  delivered: 3,
  suppressed: 4,
  failed: 5,
  bounced: 6,
  complained: 7,
  received: 0,
}

async function findOutbound(resendId: string, tags?: Record<string, string>): Promise<Email | null> {
  const byResend = await db().from('emails').select('*').eq('resend_id', resendId).maybeSingle()
  if (byResend.data) return byResend.data as Email
  if (tags?.email_id) {
    const byTag = await db().from('emails').select('*').eq('id', tags.email_id).maybeSingle()
    if (byTag.data) return byTag.data as Email
  }
  return null
}

async function recordEvent(svixId: string | null, payload: WebhookEventPayload, emailId: string | null) {
  const data = payload.data as { email_id?: string }
  const { error } = await db().from('email_events').insert({
    svix_id: svixId,
    type: payload.type,
    resend_email_id: data.email_id || null,
    email_id: emailId,
    payload,
  })
  if (error?.code === '23505') return false
  if (error) throw error
  return true
}

export async function handleResendEvent(payload: WebhookEventPayload, svixId: string | null) {
  if (payload.type === 'email.received') {
    const fresh = await recordEvent(svixId, payload, null)
    if (!fresh) return { handled: false, reason: 'duplicate' }
    try {
      const email = await processReceivedEmail(payload.data)
      if (email && svixId) await db().from('email_events').update({ email_id: email.id }).eq('svix_id', svixId)
      return { handled: true, email_id: email?.id || null }
    } catch (error) {
      // Forget the event so Resend's retry is not treated as a duplicate.
      if (svixId) await db().from('email_events').delete().eq('svix_id', svixId)
      throw error
    }
  }

  if (!payload.type.startsWith('email.')) {
    await recordEvent(svixId, payload, null)
    return { handled: false, reason: 'ignored' }
  }

  const data = payload.data as { email_id: string; message_id?: string; tags?: Record<string, string> }
  const email = await findOutbound(data.email_id, data.tags)
  const fresh = await recordEvent(svixId, payload, email?.id || null)
  if (!fresh) return { handled: false, reason: 'duplicate' }
  if (!email) return { handled: false, reason: 'unknown email' }

  const at = payload.created_at || new Date().toISOString()
  const patch: Record<string, unknown> = {}
  if (!email.message_id && data.message_id) patch.message_id = data.message_id
  if (!email.resend_id) patch.resend_id = data.email_id

  // Resend delivers events concurrently, so only ever move status forward.
  // Strict comparison keeps a late `email.sent` from clobbering `delivered`.
  const setStatus = (status: EmailDeliveryStatus) => {
    if (STATUS_RANK[status] > STATUS_RANK[email.status]) patch.status = status
  }

  switch (payload.type) {
    case 'email.sent':
      setStatus('sent')
      if (!email.sent_at) patch.sent_at = at
      break
    case 'email.delivered':
      setStatus('delivered')
      patch.delivered_at = at
      break
    case 'email.delivery_delayed':
      setStatus('delivery_delayed')
      break
    case 'email.opened':
      if (!email.opened_at) patch.opened_at = at
      break
    case 'email.clicked':
      if (!email.clicked_at) patch.clicked_at = at
      break
    case 'email.bounced': {
      setStatus('bounced')
      patch.bounced_at = at
      const bounce = (payload.data as { bounce?: { message?: string; type?: string; subType?: string } }).bounce
      patch.bounce_reason = [bounce?.type, bounce?.subType, bounce?.message].filter(Boolean).join(' / ') || 'bounced'
      if (email.lead_id && bounce?.type?.toLowerCase() !== 'transient') {
        await db().from('leads').update({ bounced_at: at, email_status: 'invalid', stage: 'bounced' }).eq('id', email.lead_id)
        await stopEnrollmentsForLead(email.lead_id, 'bounced', patch.bounce_reason as string)
      }
      break
    }
    case 'email.complained':
      setStatus('complained')
      if (email.lead_id) {
        await db().from('leads').update({ do_not_contact: true, unsubscribed_at: at, stage: 'unsubscribed' }).eq('id', email.lead_id)
        await stopEnrollmentsForLead(email.lead_id, 'unsubscribed', 'Spam complaint')
      }
      break
    case 'email.failed':
      setStatus('failed')
      patch.bounce_reason = (payload.data as { failed?: { reason?: string } }).failed?.reason || 'failed'
      break
    case 'email.suppressed':
      setStatus('suppressed')
      patch.bounce_reason = (payload.data as { suppressed?: { message?: string } }).suppressed?.message || 'suppressed'
      break
    default:
      break
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await db().from('emails').update(patch).eq('id', email.id)
    if (error) throw error
  }
  return { handled: true, email_id: email.id }
}
