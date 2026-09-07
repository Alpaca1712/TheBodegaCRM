import { db, isUniqueViolation } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import type { Lead, LeadStage } from '@/types'
import type { LeadCreateInput, LeadListQuery, LeadUpdateInput } from './schemas'

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function domainFromEmail(email: string) {
  return email.split('@')[1]?.toLowerCase() || null
}

export function splitName(fullName: string | null | undefined) {
  const trimmed = (fullName || '').trim().replace(/\s+/g, ' ')
  if (!trimmed) return { first_name: null, last_name: null }
  const [first, ...rest] = trimmed.split(' ')
  return { first_name: first, last_name: rest.length ? rest.join(' ') : null }
}

function deriveNameFields(input: Partial<LeadCreateInput>, existing?: Lead | null) {
  const patch: Record<string, unknown> = {}
  const first = input.first_name ?? existing?.first_name ?? null
  const last = input.last_name ?? existing?.last_name ?? null
  const full = input.full_name ?? existing?.full_name ?? null

  if ((input.first_name !== undefined || input.last_name !== undefined) && input.full_name === undefined) {
    patch.full_name = [first, last].filter(Boolean).join(' ') || null
  } else if (input.full_name !== undefined && input.first_name === undefined && input.last_name === undefined && input.full_name) {
    Object.assign(patch, splitName(input.full_name))
  } else if (!existing && full && !first) {
    Object.assign(patch, splitName(full))
  }
  return patch
}

function toRow(input: Partial<LeadCreateInput>, existing?: Lead | null) {
  const row: Record<string, unknown> = { ...input }
  if (input.email !== undefined) {
    row.email = normalizeEmail(input.email)
    if (input.company_domain === undefined && !existing?.company_domain) {
      row.company_domain = domainFromEmail(row.email as string)
    }
  }
  if (input.company_domain) row.company_domain = input.company_domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  Object.assign(row, deriveNameFields(input, existing))
  return row
}

export async function listLeads(query: LeadListQuery): Promise<{ data: Lead[]; total: number }> {
  let builder = db().from('leads').select('*', { count: 'exact' })

  if (query.q) {
    const term = `%${query.q.replace(/[%_]/g, '\\$&')}%`
    builder = builder.or(
      `email.ilike.${term},full_name.ilike.${term},company_name.ilike.${term},company_domain.ilike.${term},title.ilike.${term}`,
    )
  }
  if (query.stage) {
    const stages = Array.isArray(query.stage) ? query.stage : [query.stage]
    builder = builder.in('stage', stages)
  }
  if (query.campaign_id) builder = builder.eq('campaign_id', query.campaign_id)
  if (query.tag) builder = builder.contains('tags', [query.tag])
  if (query.email_status) builder = builder.eq('email_status', query.email_status)
  if (query.company_domain) builder = builder.eq('company_domain', query.company_domain.toLowerCase())

  if (query.has_live_enrollment) {
    const { data: live, error } = await db()
      .from('sequence_enrollments')
      .select('lead_id')
      .in('status', ['active', 'paused'])
    if (error) throw error
    const ids = (live || []).map((row) => row.lead_id as string)
    if (query.has_live_enrollment === 'true') {
      if (ids.length === 0) return { data: [], total: 0 }
      builder = builder.in('id', ids)
    } else if (ids.length > 0) {
      builder = builder.not('id', 'in', `(${ids.join(',')})`)
    }
  }

  const { data, error, count } = await builder
    .order(query.sort, { ascending: query.order === 'asc', nullsFirst: false })
    .range(query.offset, query.offset + query.limit - 1)
  if (error) throw error
  return { data: (data || []) as Lead[], total: count ?? 0 }
}

export async function getLead(id: string): Promise<Lead> {
  const { data, error } = await db().from('leads').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) throw ApiError.notFound('Lead not found')
  return data as Lead
}

export async function findLeadByEmail(email: string): Promise<Lead | null> {
  const { data, error } = await db().from('leads').select('*').ilike('email', normalizeEmail(email)).maybeSingle()
  if (error) throw error
  return (data as Lead) || null
}

export async function createLead(input: LeadCreateInput): Promise<Lead> {
  const { data, error } = await db().from('leads').insert(toRow(input)).select('*').single()
  if (isUniqueViolation(error)) throw ApiError.conflict(`A lead with email ${normalizeEmail(input.email)} already exists`)
  if (error) throw error
  return data as Lead
}

export async function updateLead(id: string, input: LeadUpdateInput): Promise<Lead> {
  const existing = await getLead(id)
  const row = toRow(input, existing)
  if (Object.keys(row).length === 0) return existing
  const { data, error } = await db().from('leads').update(row).eq('id', id).select('*').single()
  if (isUniqueViolation(error)) throw ApiError.conflict('Another lead already uses that email')
  if (error) throw error
  return data as Lead
}

export async function deleteLead(id: string) {
  const { error, count } = await db().from('leads').delete({ count: 'exact' }).eq('id', id)
  if (error) throw error
  if (!count) throw ApiError.notFound('Lead not found')
}

export async function bulkUpsertLeads(inputs: LeadCreateInput[], onConflict: 'skip' | 'update') {
  const results = { created: 0, updated: 0, skipped: 0, errors: [] as { email: string; error: string }[] , ids: [] as string[] }
  for (const input of inputs) {
    try {
      const existing = await findLeadByEmail(input.email)
      if (existing) {
        if (onConflict === 'skip') {
          results.skipped += 1
          results.ids.push(existing.id)
          continue
        }
        const updated = await updateLead(existing.id, input)
        results.updated += 1
        results.ids.push(updated.id)
      } else {
        const created = await createLead(input)
        results.created += 1
        results.ids.push(created.id)
      }
    } catch (error) {
      results.errors.push({ email: input.email, error: error instanceof Error ? error.message : 'failed' })
    }
  }
  return results
}

export async function setLeadStage(id: string, stage: LeadStage, extra: Record<string, unknown> = {}) {
  const { error } = await db().from('leads').update({ stage, ...extra }).eq('id', id)
  if (error) throw error
}

export function leadDisplayName(lead: Pick<Lead, 'full_name' | 'first_name' | 'last_name' | 'email'>) {
  return lead.full_name || [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email
}
