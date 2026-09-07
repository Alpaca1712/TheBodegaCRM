import { created, parseBody, parseQuery, route } from '@/lib/api/route'
import { leadCreateSchema, leadListQuerySchema } from '@/lib/leads/schemas'
import { createLead, listLeads } from '@/lib/leads/service'

export const GET = route(async ({ query }) => {
  const parsed = parseQuery(query, leadListQuerySchema)
  const { data, total } = await listLeads(parsed)
  return { data, total, limit: parsed.limit, offset: parsed.offset }
})

export const POST = route(async ({ request }) => {
  const input = await parseBody(request, leadCreateSchema)
  return created({ data: await createLead(input) })
})
