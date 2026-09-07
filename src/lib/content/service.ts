import { z } from 'zod'
import { db, isUniqueViolation } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { slugify } from '@/lib/slug'
import { bodyFormatSchema } from '@/lib/sequences/schemas'
import { uniqueSlug } from '@/lib/sequences/service'
import type { Campaign, EmailTemplate, LeadMagnet } from '@/types'

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

export const templateCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(80).optional(),
  subject: z.string().trim().max(300),
  body: z.string().min(1).max(50000),
  body_format: bodyFormatSchema.optional(),
  category: z.string().trim().max(100).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
})
export const templateUpdateSchema = templateCreateSchema.partial()

export async function listTemplates(filters: { category?: string; q?: string } = {}): Promise<EmailTemplate[]> {
  let builder = db().from('email_templates').select('*')
  if (filters.category) builder = builder.eq('category', filters.category)
  if (filters.q) builder = builder.or(`name.ilike.%${filters.q}%,subject.ilike.%${filters.q}%`)
  const { data, error } = await builder.order('updated_at', { ascending: false })
  if (error) throw error
  return (data || []) as EmailTemplate[]
}

export async function getTemplate(id: string): Promise<EmailTemplate> {
  const { data, error } = await db().from('email_templates').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) throw ApiError.notFound('Template not found')
  return data as EmailTemplate
}

export async function createTemplate(input: z.infer<typeof templateCreateSchema>): Promise<EmailTemplate> {
  const slug = await uniqueSlug('email_templates', slugify(input.slug || input.name))
  const { data, error } = await db().from('email_templates').insert({ ...input, slug }).select('*').single()
  if (isUniqueViolation(error)) throw ApiError.conflict('Template slug already exists')
  if (error) throw error
  return data as EmailTemplate
}

export async function updateTemplate(id: string, input: z.infer<typeof templateUpdateSchema>): Promise<EmailTemplate> {
  const row: Record<string, unknown> = { ...input }
  if (input.slug) row.slug = await uniqueSlug('email_templates', slugify(input.slug), id)
  const { data, error } = await db().from('email_templates').update(row).eq('id', id).select('*').maybeSingle()
  if (error) throw error
  if (!data) throw ApiError.notFound('Template not found')
  return data as EmailTemplate
}

export async function deleteTemplate(id: string) {
  const { error, count } = await db().from('email_templates').delete({ count: 'exact' }).eq('id', id)
  if (error) throw error
  if (!count) throw ApiError.notFound('Template not found')
}

// ---------------------------------------------------------------------------
// Lead magnets
// ---------------------------------------------------------------------------

export const magnetCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  body_markdown: z.string().min(1).max(200000),
  filename_template: z.string().trim().min(1).max(200).optional(),
})
export const magnetUpdateSchema = magnetCreateSchema.partial()

export async function listMagnets(): Promise<LeadMagnet[]> {
  const { data, error } = await db().from('lead_magnets').select('*').order('updated_at', { ascending: false })
  if (error) throw error
  return (data || []) as LeadMagnet[]
}

export async function getMagnet(id: string): Promise<LeadMagnet> {
  const { data, error } = await db().from('lead_magnets').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) throw ApiError.notFound('Lead magnet not found')
  return data as LeadMagnet
}

export async function createMagnet(input: z.infer<typeof magnetCreateSchema>): Promise<LeadMagnet> {
  const slug = await uniqueSlug('lead_magnets', slugify(input.slug || input.name))
  const { data, error } = await db().from('lead_magnets').insert({ ...input, slug }).select('*').single()
  if (isUniqueViolation(error)) throw ApiError.conflict('Lead magnet slug already exists')
  if (error) throw error
  return data as LeadMagnet
}

export async function updateMagnet(id: string, input: z.infer<typeof magnetUpdateSchema>): Promise<LeadMagnet> {
  const row: Record<string, unknown> = { ...input }
  if (input.slug) row.slug = await uniqueSlug('lead_magnets', slugify(input.slug), id)
  const { data, error } = await db().from('lead_magnets').update(row).eq('id', id).select('*').maybeSingle()
  if (error) throw error
  if (!data) throw ApiError.notFound('Lead magnet not found')
  return data as LeadMagnet
}

export async function deleteMagnet(id: string) {
  const { error, count } = await db().from('lead_magnets').delete({ count: 'exact' }).eq('id', id)
  if (error) throw error
  if (!count) throw ApiError.notFound('Lead magnet not found')
}

// ---------------------------------------------------------------------------
// Campaigns (grouping tag)
// ---------------------------------------------------------------------------

export const campaignCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  status: z.enum(['active', 'archived']).optional(),
  is_default_landing: z.boolean().optional(),
})
export const campaignUpdateSchema = campaignCreateSchema.partial()

export async function listCampaigns(): Promise<(Campaign & { lead_count: number; sequence_count: number })[]> {
  const [{ data: campaigns, error }, { data: leads }, { data: sequences }] = await Promise.all([
    db().from('campaigns').select('*').order('created_at', { ascending: false }),
    db().from('leads').select('campaign_id').not('campaign_id', 'is', null),
    db().from('sequences').select('campaign_id').not('campaign_id', 'is', null),
  ])
  if (error) throw error
  const leadCounts = new Map<string, number>()
  for (const row of leads || []) leadCounts.set(row.campaign_id, (leadCounts.get(row.campaign_id) || 0) + 1)
  const seqCounts = new Map<string, number>()
  for (const row of sequences || []) seqCounts.set(row.campaign_id, (seqCounts.get(row.campaign_id) || 0) + 1)
  return ((campaigns || []) as Campaign[]).map((campaign) => ({
    ...campaign,
    lead_count: leadCounts.get(campaign.id) || 0,
    sequence_count: seqCounts.get(campaign.id) || 0,
  }))
}

export async function getCampaign(idOrSlug: string): Promise<Campaign> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(idOrSlug)
  const { data, error } = await db().from('campaigns').select('*').eq(isUuid ? 'id' : 'slug', idOrSlug).maybeSingle()
  if (error) throw error
  if (!data) throw ApiError.notFound('Campaign not found')
  return data as Campaign
}

async function clearDefaultLanding(exceptId?: string) {
  let query = db().from('campaigns').update({ is_default_landing: false }).eq('is_default_landing', true)
  if (exceptId) query = query.neq('id', exceptId)
  const { error } = await query
  if (error) throw error
}

export async function createCampaign(input: z.infer<typeof campaignCreateSchema>): Promise<Campaign> {
  const slug = await uniqueSlug('campaigns', slugify(input.slug || input.name))
  if (input.is_default_landing) await clearDefaultLanding()
  const { data, error } = await db().from('campaigns').insert({ ...input, slug }).select('*').single()
  if (isUniqueViolation(error)) throw ApiError.conflict('Campaign slug already exists')
  if (error) throw error
  return data as Campaign
}

export async function updateCampaign(id: string, input: z.infer<typeof campaignUpdateSchema>): Promise<Campaign> {
  const existing = await getCampaign(id)
  const row: Record<string, unknown> = { ...input }
  if (input.slug) row.slug = await uniqueSlug('campaigns', slugify(input.slug), existing.id)
  if (input.is_default_landing) await clearDefaultLanding(existing.id)
  const { data, error } = await db().from('campaigns').update(row).eq('id', existing.id).select('*').single()
  if (error) throw error
  return data as Campaign
}

export async function deleteCampaign(id: string) {
  const existing = await getCampaign(id)
  const { error } = await db().from('campaigns').delete().eq('id', existing.id)
  if (error) throw error
}
