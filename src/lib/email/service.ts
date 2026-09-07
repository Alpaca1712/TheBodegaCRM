import { z } from 'zod'
import { db } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { getLead } from '@/lib/leads/service'
import { bodyFormatSchema } from '@/lib/sequences/schemas'
import { renderLeadMagnetPdf } from '@/lib/magnets/pdf'
import type { Email, LeadMagnet } from '@/types'
import { sendEmail, type OutboundAttachment } from './send'

export const emailListQuerySchema = z.object({
  lead_id: z.string().uuid().optional(),
  sequence_id: z.string().uuid().optional(),
  thread_id: z.string().uuid().optional(),
  direction: z.enum(['inbound', 'outbound']).optional(),
  status: z.string().optional(),
  since: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export const inboxQuerySchema = z.object({
  unhandled_only: z.enum(['true', 'false']).default('true'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export const emailUpdateSchema = z.object({
  is_read: z.boolean().optional(),
  handled: z.boolean().optional(),
})

export const sendEmailSchema = z.object({
  lead_id: z.string().uuid().optional(),
  to: z.string().trim().email().optional(),
  subject: z.string().trim().max(300).default(''),
  body: z.string().min(1).max(50000),
  body_format: bodyFormatSchema.default('text'),
  reply_to_email_id: z.string().uuid().nullable().optional(),
  from_name: z.string().trim().max(200).nullable().optional(),
  from_email: z.string().trim().email().nullable().optional(),
  lead_magnet_id: z.string().uuid().nullable().optional(),
  include_signature: z.boolean().default(true),
}).refine((input) => input.lead_id || input.to, { message: 'Provide lead_id or to' })

export type EmailListQuery = z.infer<typeof emailListQuerySchema>
export type SendEmailRequest = z.infer<typeof sendEmailSchema>

const LIST_COLUMNS = 'id, lead_id, sequence_id, step_id, enrollment_id, thread_id, direction, source, from_address, to_addresses, subject, status, message_id, resend_id, sent_at, delivered_at, opened_at, clicked_at, bounced_at, received_at, is_read, handled_at, created_at, text_body'

export async function listEmails(query: EmailListQuery) {
  let builder = db().from('emails').select(`${LIST_COLUMNS}, lead:leads(id, email, full_name, company_name)`, { count: 'exact' })
  if (query.lead_id) builder = builder.eq('lead_id', query.lead_id)
  if (query.sequence_id) builder = builder.eq('sequence_id', query.sequence_id)
  if (query.thread_id) builder = builder.eq('thread_id', query.thread_id)
  if (query.direction) builder = builder.eq('direction', query.direction)
  if (query.status) builder = builder.eq('status', query.status)
  if (query.since) builder = builder.gte('created_at', query.since)
  const { data, error, count } = await builder
    .order('created_at', { ascending: false })
    .range(query.offset, query.offset + query.limit - 1)
  if (error) throw error
  return { data: (data || []) as (Email & { lead: unknown })[], total: count ?? 0 }
}

export async function listInbox(query: z.infer<typeof inboxQuerySchema>) {
  let builder = db()
    .from('emails')
    .select(`${LIST_COLUMNS}, lead:leads(id, email, full_name, company_name, stage)`, { count: 'exact' })
    .eq('direction', 'inbound')
  if (query.unhandled_only === 'true') builder = builder.is('handled_at', null)
  const { data, error, count } = await builder
    .order('received_at', { ascending: false, nullsFirst: false })
    .range(query.offset, query.offset + query.limit - 1)
  if (error) throw error
  return { data: (data || []) as (Email & { lead: unknown })[], total: count ?? 0 }
}

export async function getEmail(id: string): Promise<Email> {
  const { data, error } = await db().from('emails').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) throw ApiError.notFound('Email not found')
  return data as Email
}

export async function getThread(threadId: string): Promise<Email[]> {
  const { data, error } = await db().from('emails').select('*').eq('thread_id', threadId).order('created_at', { ascending: true })
  if (error) throw error
  return (data || []) as Email[]
}

export async function leadThread(leadId: string): Promise<Email[]> {
  const { data, error } = await db().from('emails').select('*').eq('lead_id', leadId).order('created_at', { ascending: true })
  if (error) throw error
  return (data || []) as Email[]
}

export async function updateEmail(id: string, input: z.infer<typeof emailUpdateSchema>): Promise<Email> {
  const patch: Record<string, unknown> = {}
  if (input.is_read !== undefined) patch.is_read = input.is_read
  if (input.handled !== undefined) patch.handled_at = input.handled ? new Date().toISOString() : null
  if (input.handled) patch.is_read = true
  if (Object.keys(patch).length === 0) return getEmail(id)
  const { data, error } = await db().from('emails').update(patch).eq('id', id).select('*').maybeSingle()
  if (error) throw error
  if (!data) throw ApiError.notFound('Email not found')
  return data as Email
}

/** One-off compose/reply from an agent or the console. */
export async function sendOneOff(input: SendEmailRequest): Promise<Email> {
  let leadId = input.lead_id
  if (!leadId && input.to) {
    const { data } = await db().from('leads').select('id').ilike('email', input.to).maybeSingle()
    if (!data) throw ApiError.notFound(`No lead with email ${input.to}; create the lead first`)
    leadId = data.id
  }
  const lead = await getLead(leadId!)

  let previous: Email | null = null
  if (input.reply_to_email_id) {
    previous = await getEmail(input.reply_to_email_id)
    if (previous.lead_id && previous.lead_id !== lead.id) throw ApiError.badRequest('reply_to_email_id belongs to a different lead')
  }

  const attachments: OutboundAttachment[] = []
  if (input.lead_magnet_id) {
    const { data } = await db().from('lead_magnets').select('*').eq('id', input.lead_magnet_id).maybeSingle()
    if (!data) throw ApiError.notFound('Lead magnet not found')
    const pdf = await renderLeadMagnetPdf(data as LeadMagnet, lead)
    attachments.push({ ...pdf, contentType: 'application/pdf', lead_magnet_id: input.lead_magnet_id })
  }

  const email = await sendEmail({
    lead,
    subject: input.subject,
    body: input.body,
    body_format: input.body_format,
    from_name: input.from_name,
    from_email: input.from_email,
    in_reply_to_email: previous,
    attachments,
    source: 'api',
    include_signature: input.include_signature,
  })

  if (previous?.direction === 'inbound' && !previous.handled_at) {
    await db().from('emails').update({ handled_at: new Date().toISOString(), is_read: true }).eq('id', previous.id)
  }
  return email
}
