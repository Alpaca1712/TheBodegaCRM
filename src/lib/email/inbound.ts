import { db } from '@/lib/db'
import { findLeadByEmail } from '@/lib/leads/service'
import type { Email, Lead } from '@/types'
import { htmlToText } from './render'
import { parseAddress, resend } from './resend'
import { stopEnrollmentsForLead } from '@/lib/sequences/enrollments'

interface ReceivedEventData {
  email_id: string
  from: string
  to: string[]
  subject: string
  message_id: string
  created_at: string
}

function headerList(value: string | undefined | null): string[] {
  if (!value) return []
  return value.split(/\s+/).map((item) => item.trim()).filter(Boolean)
}

async function findThreadParent(messageIds: string[]): Promise<Email | null> {
  if (messageIds.length === 0) return null
  const { data, error } = await db()
    .from('emails')
    .select('*')
    .in('message_id', messageIds)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as Email) || null
}

/**
 * Handles a Resend `email.received` event: pulls the full body, matches it to a
 * lead (via thread headers first, sender address second), stores it, stops the
 * lead's live sequence, and moves the lead to `replied`.
 */
export async function processReceivedEmail(event: ReceivedEventData): Promise<Email | null> {
  const existing = await db().from('emails').select('id').eq('resend_id', event.email_id).maybeSingle()
  if (existing.data) return null

  const { data: full, error } = await resend().emails.receiving.get(event.email_id)
  if (error || !full) throw new Error(error?.message || `Could not fetch received email ${event.email_id}`)

  const headers = Object.fromEntries(Object.entries(full.headers || {}).map(([key, value]) => [key.toLowerCase(), value]))
  const inReplyTo = headers['in-reply-to']?.trim() || null
  const references = headerList(headers.references)
  const sender = parseAddress(full.from)

  const parent = await findThreadParent([...(inReplyTo ? [inReplyTo] : []), ...references])
  let lead: Lead | null = null
  if (parent?.lead_id) {
    const { data } = await db().from('leads').select('*').eq('id', parent.lead_id).maybeSingle()
    lead = (data as Lead) || null
  }
  if (!lead) lead = await findLeadByEmail(sender.email)

  const isAutoReply = /^(auto|automatic reply|out of office|autoreply)/i.test(full.subject || '')
    || headers['auto-submitted']?.toLowerCase().startsWith('auto')
    || headers['x-autoreply'] !== undefined

  const text = full.text || (full.html ? htmlToText(full.html) : '')
  const receivedAt = event.created_at || full.created_at || new Date().toISOString()

  const { data: inserted, error: insertError } = await db()
    .from('emails')
    .insert({
      lead_id: lead?.id || null,
      sequence_id: parent?.sequence_id || null,
      enrollment_id: parent?.enrollment_id || null,
      thread_id: parent?.thread_id || null,
      direction: 'inbound',
      source: 'inbound',
      from_address: sender.email,
      to_addresses: full.to || [],
      cc_addresses: full.cc || [],
      reply_to: full.reply_to?.[0] || null,
      subject: full.subject || '',
      text_body: text,
      html_body: full.html,
      message_id: full.message_id || event.message_id || null,
      in_reply_to: inReplyTo,
      references_ids: references,
      resend_id: event.email_id,
      status: 'received',
      attachments: (full.attachments || []).map((file) => ({
        filename: file.filename,
        content_type: file.content_type,
        size: file.size,
        resend_attachment_id: file.id,
      })),
      received_at: receivedAt,
      is_read: false,
      handled_at: isAutoReply ? receivedAt : null,
    })
    .select('*')
    .single()
  if (insertError) throw insertError

  const email = inserted as Email
  if (!email.thread_id) {
    await db().from('emails').update({ thread_id: email.id }).eq('id', email.id)
    email.thread_id = email.id
  }

  if (lead && !isAutoReply) {
    const terminal = ['customer', 'lost', 'unsubscribed', 'meeting_booked', 'interested', 'not_interested']
    await db()
      .from('leads')
      .update({
        last_inbound_at: receivedAt,
        replied_at: lead.replied_at || receivedAt,
        ...(terminal.includes(lead.stage) ? {} : { stage: 'replied' }),
      })
      .eq('id', lead.id)
    await stopEnrollmentsForLead(lead.id, 'replied', `Reply received: ${full.subject || '(no subject)'}`)
  }

  return email
}
