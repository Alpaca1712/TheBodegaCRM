import { ApiError } from '@/lib/api/errors'
import { route } from '@/lib/api/route'
import { findLeadByEmail, getLead } from '@/lib/leads/service'
import { previewSequenceForLead } from '@/lib/sequences/runner'
import { resolveSequence } from '@/lib/sequences/service'

/** GET /api/v1/sequences/:id/preview?lead_id=... (or ?email=...) */
export const GET = route<{ id: string }>(async ({ params, query }) => {
  const sequence = await resolveSequence(params.id)
  const leadId = query.get('lead_id')
  const email = query.get('email')
  const lead = leadId ? await getLead(leadId) : email ? await findLeadByEmail(email) : null
  if (!lead) throw ApiError.badRequest('Provide lead_id or email of an existing lead')
  return { data: { sequence_id: sequence.id, lead_id: lead.id, steps: await previewSequenceForLead(sequence, lead) } }
})
