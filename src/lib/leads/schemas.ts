import { z } from 'zod'
import { LEAD_STAGES } from '@/types'

const nullableString = z.string().trim().max(2000).nullable().optional()
const json = z.record(z.string(), z.unknown())

export const leadStageSchema = z.enum(LEAD_STAGES as [string, ...string[]])

export const leadCreateSchema = z.object({
  email: z.string().trim().email(),
  first_name: nullableString,
  last_name: nullableString,
  full_name: nullableString,
  title: nullableString,
  linkedin_url: nullableString,
  twitter_url: nullableString,
  phone: nullableString,
  company_name: nullableString,
  company_domain: nullableString,
  company_website: nullableString,
  company_description: z.string().trim().max(20000).nullable().optional(),
  company_industry: nullableString,
  company_size: nullableString,
  company_location: nullableString,
  stage: leadStageSchema.optional(),
  source: nullableString,
  campaign_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(50).optional(),
  notes: z.string().max(50000).nullable().optional(),
  research: json.optional(),
  custom: json.optional(),
  do_not_contact: z.boolean().optional(),
})

export const leadUpdateSchema = leadCreateSchema.partial()

export const leadChannelSchema = z.enum(['web_inbound', 'cold_email'])

export const leadListQuerySchema = z.object({
  q: z.string().trim().optional(),
  stage: z.union([leadStageSchema, z.array(leadStageSchema)]).optional(),
  channel: leadChannelSchema.optional(),
  campaign_id: z.string().uuid().optional(),
  tag: z.string().optional(),
  email_status: z.string().optional(),
  company_domain: z.string().optional(),
  has_live_enrollment: z.enum(['true', 'false']).optional(),
  sort: z.enum(['created_at', 'updated_at', 'last_contacted_at', 'last_inbound_at', 'company_name', 'email']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export const leadBulkSchema = z.object({
  leads: z.array(leadCreateSchema).min(1).max(500),
  on_conflict: z.enum(['skip', 'update']).default('skip'),
})

export type LeadCreateInput = z.infer<typeof leadCreateSchema>
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>
export type LeadListQuery = z.infer<typeof leadListQuerySchema>
