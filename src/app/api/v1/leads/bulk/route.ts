import { parseBody, route } from '@/lib/api/route'
import { leadBulkSchema } from '@/lib/leads/schemas'
import { bulkUpsertLeads } from '@/lib/leads/service'

export const POST = route(async ({ request }) => {
  const input = await parseBody(request, leadBulkSchema)
  return { data: await bulkUpsertLeads(input.leads, input.on_conflict) }
})
