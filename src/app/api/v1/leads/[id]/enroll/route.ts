import { z } from 'zod'
import { parseBody, route } from '@/lib/api/route'
import { enrollLeads } from '@/lib/sequences/enrollments'

const schema = z.object({
  sequence_id: z.string().min(1),
  replace_existing: z.boolean().default(false),
  start_at: z.string().datetime({ offset: true }).optional(),
})

export const POST = route<{ id: string }>(async ({ request, params }) => {
  const input = await parseBody(request, schema)
  const result = await enrollLeads(input.sequence_id, { lead_ids: [params.id], replace_existing: input.replace_existing, start_at: input.start_at })
  return { data: result }
})
