import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { getSetting } from '@/lib/settings'
import { leadSendBlockReason } from '@/lib/leads/email-guard'
import { ensureLeadToken, unsubscribeUrl } from '@/lib/leads/tokens'
import { leadTemplateVars, renderTemplate } from '@/lib/sequences/templating'
import type { Email, EmailAttachment, EmailSource, Lead } from '@/types'
import { formatAddress, resend } from './resend'
import { appendSignature, renderBody, replySubject, type RenderedBody } from './render'
import type { BodyFormat } from '@/types'

export interface OutboundAttachment {
  filename: string
  content: Buffer
  contentType?: string
  lead_magnet_id?: string | null
}

export interface SendEmailInput {
  lead: Lead
  subject: string
  body: string
  body_format?: BodyFormat
  from_name?: string | null
  from_email?: string | null
  reply_to?: string | null
  /** Email to thread onto (sets In-Reply-To / References, and "Re:" the subject when subject is empty). */
  in_reply_to_email?: Email | null
  attachments?: OutboundAttachment[]
  source: EmailSource
  sequence_id?: string | null
  step_id?: string | null
  enrollment_id?: string | null
  include_signature?: boolean
}

export class EmailSendError extends Error {
  email: Email
  constructor(message: string, email: Email) {
    super(message)
    this.email = email
  }
}

function threadHeaders(previous: Email | null | undefined) {
  if (!previous?.message_id) return { in_reply_to: null, references_ids: [] as string[] }
  const references = [...(previous.references_ids || []), previous.message_id].filter(Boolean)
  return { in_reply_to: previous.message_id, references_ids: Array.from(new Set(references)) }
}

async function fetchMessageId(resendId: string): Promise<string | null> {
  try {
    const { data } = await resend().emails.get(resendId)
    return data?.message_id || null
  } catch {
    return null
  }
}

export async function sendEmail(input: SendEmailInput): Promise<Email> {
  const lead = input.lead
  const blocked = leadSendBlockReason(lead)
  if (blocked === 'do_not_contact' || blocked === 'unsubscribed') {
    throw ApiError.unprocessable(`${lead.email} is unsubscribed / do-not-contact`)
  }
  if (blocked === 'invalid_email') throw ApiError.unprocessable(`${lead.email} is marked invalid`)
  if (blocked === 'disposable_email') throw ApiError.unprocessable(`${lead.email} is a disposable address`)
  if (blocked === 'bounced') throw ApiError.unprocessable(`${lead.email} previously bounced`)
  if (blocked === 'unverified_email') {
    throw ApiError.unprocessable(
      `${lead.email} is not verified (status: ${lead.email_status}). Call verify_lead_email before sending.`,
    )
  }
  if (blocked) throw ApiError.unprocessable(`${lead.email} cannot be emailed (${blocked})`)

  const sender = await getSetting('sender')
  const fromEmail = input.from_email || sender.from_email
  const fromName = input.from_name ?? sender.from_name
  const replyTo = input.reply_to ?? sender.reply_to ?? null

  const previous = input.in_reply_to_email || null
  const leadToken = await ensureLeadToken(lead)
  const unsubscribe = unsubscribeUrl(leadToken)

  // Every send path gets {{variables}} resolved, so one-off emails written by
  // an agent can use the same tokens as sequence steps.
  const vars = leadTemplateVars(lead, { unsubscribe_url: unsubscribe })
  const subject = renderTemplate(input.subject, vars).trim() || (previous ? replySubject(previous.subject) : '')
  if (!subject) throw ApiError.badRequest('Subject is required for a new thread')

  let rendered: RenderedBody = renderBody(renderTemplate(input.body, vars), input.body_format || 'text')
  if (input.include_signature !== false) rendered = appendSignature(rendered, sender.signature)

  const threading = threadHeaders(previous)
  const attachments: EmailAttachment[] = (input.attachments || []).map((file) => ({
    filename: file.filename,
    content_type: file.contentType || null,
    size: file.content.byteLength,
    lead_magnet_id: file.lead_magnet_id || null,
  }))

  const emailId = randomUUID()
  const insert = {
    id: emailId,
    lead_id: lead.id,
    sequence_id: input.sequence_id || null,
    step_id: input.step_id || null,
    enrollment_id: input.enrollment_id || null,
    thread_id: previous?.thread_id || emailId,
    direction: 'outbound',
    source: input.source,
    from_address: fromEmail,
    to_addresses: [lead.email],
    reply_to: replyTo,
    subject,
    text_body: rendered.text,
    html_body: rendered.html,
    in_reply_to: threading.in_reply_to,
    references_ids: threading.references_ids,
    attachments,
    status: 'queued',
  }
  const { data: queued, error: insertError } = await db().from('emails').insert(insert).select('*').single()
  if (insertError) throw insertError

  const headers: Record<string, string> = {
    'List-Unsubscribe': `<${unsubscribe}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
  if (threading.in_reply_to) {
    headers['In-Reply-To'] = threading.in_reply_to
    headers.References = threading.references_ids.join(' ')
  }

  const { data, error } = await resend().emails.send({
    from: formatAddress(fromName, fromEmail),
    to: [lead.email],
    replyTo: replyTo || undefined,
    subject,
    text: rendered.text,
    html: rendered.html,
    headers,
    tags: [
      { name: 'email_id', value: emailId },
      { name: 'lead_id', value: lead.id },
      ...(input.sequence_id ? [{ name: 'sequence_id', value: input.sequence_id }] : []),
    ],
    attachments: (input.attachments || []).map((file) => ({
      filename: file.filename,
      content: file.content,
      contentType: file.contentType,
    })),
  })

  if (error || !data) {
    const message = error?.message || 'Resend rejected the email'
    const { data: failed } = await db()
      .from('emails')
      .update({ status: 'failed', bounce_reason: message })
      .eq('id', emailId)
      .select('*')
      .single()
    throw new EmailSendError(message, (failed || queued) as Email)
  }

  const messageId = await fetchMessageId(data.id)
  const now = new Date().toISOString()
  const { data: sent, error: updateError } = await db()
    .from('emails')
    .update({ resend_id: data.id, status: 'sent', sent_at: now, message_id: messageId })
    .eq('id', emailId)
    .select('*')
    .single()
  if (updateError) throw updateError

  await db()
    .from('leads')
    .update({
      last_outbound_at: now,
      last_contacted_at: now,
      ...(lead.stage === 'new' ? { stage: 'contacted' } : {}),
    })
    .eq('id', lead.id)

  return sent as Email
}

export async function latestEmailForLead(leadId: string, options: { direction?: 'inbound' | 'outbound'; threadId?: string | null } = {}) {
  let query = db().from('emails').select('*').eq('lead_id', leadId).in('status', ['sent', 'delivered', 'delivery_delayed', 'received'])
  if (options.direction) query = query.eq('direction', options.direction)
  if (options.threadId) query = query.eq('thread_id', options.threadId)
  const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error) throw error
  return (data as Email) || null
}
