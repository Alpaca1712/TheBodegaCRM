import { parseQuery, route } from '@/lib/api/route'
import { inboxQuerySchema, listInbox } from '@/lib/email/service'

/** Inbound replies. Defaults to unhandled only; mark handled via PATCH /emails/:id {handled:true}. */
export const GET = route(async ({ query }) => {
  const parsed = parseQuery(query, inboxQuerySchema)
  const { data, total } = await listInbox(parsed)
  return { data, total, limit: parsed.limit, offset: parsed.offset }
})
