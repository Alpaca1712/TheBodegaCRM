import { z } from 'zod'
import { ApiError } from '@/lib/api/errors'
import { route } from '@/lib/api/route'
import { findEmail } from '@/lib/enrichment/hunter'
import { db } from '@/lib/db'
import { getLead, splitName } from '@/lib/leads/service'

const schema = z.object({
  first_name: z.string().trim().optional(),
  last_name: z.string().trim().optional(),
  domain: z.string().trim().optional(),
  company: z.string().trim().optional(),
  apply: z.boolean().default(true),
}).optional()

/**
 * Uses Hunter's Email Finder to locate a lead's address from name + domain.
 * Handy when a lead was created with a placeholder email (e.g. from LinkedIn).
 */
export const POST = route<{ id: string }>(async ({ request, params }) => {
  const lead = await getLead(params.id)
  const raw = (await request.text()).trim()
  const body = raw ? schema.parse(JSON.parse(raw)) : undefined
  const names = splitName(lead.full_name)
  const first = body?.first_name || lead.first_name || names.first_name
  const last = body?.last_name || lead.last_name || names.last_name
  if (!first || !last) throw ApiError.badRequest('Lead needs first_name and last_name to find an email')

  const result = await findEmail({
    first_name: first,
    last_name: last,
    domain: body?.domain || lead.company_domain || undefined,
    company: body?.company || lead.company_name || undefined,
  })

  let updated = lead
  if (result.email && (body?.apply ?? true)) {
    const patch: Record<string, unknown> = {
      email: result.email.toLowerCase(),
      email_score: result.score,
      enrichment: { ...lead.enrichment, hunter_finder: { ...result, fetched_at: new Date().toISOString() } },
    }
    if (result.verification?.status) patch.email_status = result.verification.status === 'valid' ? 'valid' : result.verification.status === 'accept_all' ? 'accept_all' : 'unknown'
    if (!lead.title && result.position) patch.title = result.position
    if (!lead.linkedin_url && result.linkedin_url) patch.linkedin_url = result.linkedin_url
    if (!lead.phone && result.phone_number) patch.phone = result.phone_number
    const { data, error } = await db().from('leads').update(patch).eq('id', lead.id).select('*').single()
    if (error?.code === '23505') throw ApiError.conflict(`Another lead already has ${result.email}`)
    if (error) throw error
    updated = data
  }
  return { data: { result, lead: updated } }
})
