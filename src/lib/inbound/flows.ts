import { z } from 'zod'
import { db, isUniqueViolation } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { sendEmail, type OutboundAttachment } from '@/lib/email/send'
import { renderLeadMagnetPdf } from '@/lib/magnets/pdf'
import { leadStageSchema } from '@/lib/leads/schemas'
import { getLead } from '@/lib/leads/service'
import { notifyInboundLead } from '@/lib/notifications'
import { bodyFormatSchema } from '@/lib/sequences/schemas'
import { enrollLeads } from '@/lib/sequences/enrollments'
import { slugify } from '@/lib/slug'
import type { InboundEvent, InboundFlow, Lead, LeadMagnet, LeadStage } from '@/types'

export const flowActionsSchema = z.object({
  stage: leadStageSchema.optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  campaign_id: z.string().uuid().nullable().optional(),
  sequence_id: z.string().uuid().nullable().optional(),
  auto_reply: z.object({
    subject: z.string().trim().min(1).max(300),
    body: z.string().min(1).max(20000),
    body_format: bodyFormatSchema.optional(),
    lead_magnet_id: z.string().uuid().nullable().optional(),
  }).nullable().optional(),
  notify: z.boolean().optional(),
})

export const flowCreateSchema = z.object({
  key: z.string().trim().min(1).max(60).regex(/^[a-z0-9_-]+$/, 'lowercase letters, digits, _ and - only'),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  active: z.boolean().optional(),
  is_default: z.boolean().optional(),
  actions: flowActionsSchema.default({}),
})
export const flowUpdateSchema = flowCreateSchema.partial()

export const inboundEventsQuerySchema = z.object({
  flow_key: z.string().optional(),
  lead_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export async function listFlows(): Promise<InboundFlow[]> {
  const { data, error } = await db().from('inbound_flows').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return (data || []) as InboundFlow[]
}

export async function getFlow(idOrKey: string): Promise<InboundFlow> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(idOrKey)
  const { data, error } = await db().from('inbound_flows').select('*').eq(isUuid ? 'id' : 'key', idOrKey).maybeSingle()
  if (error) throw error
  if (!data) throw ApiError.notFound('Inbound flow not found')
  return data as InboundFlow
}

async function clearDefault(exceptId?: string) {
  let query = db().from('inbound_flows').update({ is_default: false }).eq('is_default', true)
  if (exceptId) query = query.neq('id', exceptId)
  const { error } = await query
  if (error) throw error
}

export async function createFlow(input: z.infer<typeof flowCreateSchema>): Promise<InboundFlow> {
  if (input.is_default) await clearDefault()
  const { data, error } = await db().from('inbound_flows').insert({ ...input, key: input.key.toLowerCase() }).select('*').single()
  if (isUniqueViolation(error)) throw ApiError.conflict('A flow with that key already exists')
  if (error) throw error
  return data as InboundFlow
}

export async function updateFlow(idOrKey: string, input: z.infer<typeof flowUpdateSchema>): Promise<InboundFlow> {
  const existing = await getFlow(idOrKey)
  if (input.is_default) await clearDefault(existing.id)
  const { data, error } = await db().from('inbound_flows').update(input).eq('id', existing.id).select('*').single()
  if (isUniqueViolation(error)) throw ApiError.conflict('A flow with that key already exists')
  if (error) throw error
  return data as InboundFlow
}

export async function deleteFlow(idOrKey: string) {
  const existing = await getFlow(idOrKey)
  const { error } = await db().from('inbound_flows').delete().eq('id', existing.id)
  if (error) throw error
}

/** Exact key match, else the default flow, else null. Inactive flows are skipped. */
export async function resolveFlow(key: string | null | undefined): Promise<InboundFlow | null> {
  const flows = await listFlows()
  const active = flows.filter((flow) => flow.active)
  if (key) {
    const match = active.find((flow) => flow.key === key)
    if (match) return match
  }
  return active.find((flow) => flow.is_default) || null
}

export async function listInboundEvents(query: z.infer<typeof inboundEventsQuerySchema>) {
  let builder = db()
    .from('inbound_events')
    .select('*, lead:leads(id, email, full_name, company_name, stage)', { count: 'exact' })
  if (query.flow_key) builder = builder.eq('flow_key', query.flow_key)
  if (query.lead_id) builder = builder.eq('lead_id', query.lead_id)
  const { data, error, count } = await builder
    .order('created_at', { ascending: false })
    .range(query.offset, query.offset + query.limit - 1)
  if (error) throw error
  return { data: (data || []) as (InboundEvent & { lead: unknown })[], total: count ?? 0 }
}

const TERMINAL: LeadStage[] = ['customer', 'lost', 'unsubscribed', 'bounced']

export type ActionRecord = { action: string; ok: boolean; detail?: string }

/**
 * Applies a flow's actions to a lead that just came in. Each action is
 * isolated: one failure is recorded and the rest still run.
 */
export async function applyFlow(flow: InboundFlow, leadId: string, payload: Record<string, unknown>, createdNew: boolean): Promise<{ lead: Lead; actions: ActionRecord[] }> {
  const actions: ActionRecord[] = []
  const wrap = async (action: string, fn: () => Promise<string | void>) => {
    try {
      const detail = await fn()
      actions.push({ action, ok: true, ...(detail ? { detail } : {}) })
    } catch (error) {
      actions.push({ action, ok: false, detail: error instanceof Error ? error.message : 'failed' })
    }
  }

  let lead = await getLead(leadId)
  const patch: Record<string, unknown> = {}
  if (flow.actions.stage && !TERMINAL.includes(lead.stage)) {
    const order: LeadStage[] = ['new', 'contacted', 'replied', 'interested', 'meeting_booked']
    const current = order.indexOf(lead.stage)
    const target = order.indexOf(flow.actions.stage)
    if (target === -1 || current === -1 || target > current) patch.stage = flow.actions.stage
  }
  if (flow.actions.tags?.length) patch.tags = Array.from(new Set([...lead.tags, ...flow.actions.tags]))
  if (flow.actions.campaign_id) patch.campaign_id = flow.actions.campaign_id
  if (Object.keys(patch).length) {
    await wrap('update_lead', async () => {
      const { data, error } = await db().from('leads').update(patch).eq('id', lead.id).select('*').single()
      if (error) throw error
      lead = data as Lead
      return Object.keys(patch).join(', ')
    })
  }

  if (flow.actions.auto_reply) {
    const reply = flow.actions.auto_reply
    await wrap('auto_reply', async () => {
      const attachments: OutboundAttachment[] = []
      if (reply.lead_magnet_id) {
        const { data } = await db().from('lead_magnets').select('*').eq('id', reply.lead_magnet_id).maybeSingle()
        if (!data) throw new Error('lead magnet not found')
        const pdf = await renderLeadMagnetPdf(data as LeadMagnet, lead)
        attachments.push({ ...pdf, contentType: 'application/pdf', lead_magnet_id: reply.lead_magnet_id })
      }
      const email = await sendEmail({
        lead,
        subject: reply.subject,
        body: reply.body,
        body_format: reply.body_format || 'text',
        attachments,
        source: 'inbound_flow',
      })
      return email.id
    })
  }

  if (flow.actions.sequence_id) {
    await wrap('enroll', async () => {
      const result = await enrollLeads(flow.actions.sequence_id!, { lead_ids: [lead.id], replace_existing: false })
      if (result.enrolled.length) return result.enrolled[0].id
      throw new Error(result.skipped[0]?.reason || 'not enrolled')
    })
  }

  if (flow.actions.notify !== false) {
    await wrap('notify', async () => {
      const sent = await notifyInboundLead(lead, flow, payload, createdNew)
      return sent ? 'email sent' : 'skipped (notifications disabled or unconfigured)'
    })
  }

  return { lead, actions }
}
