import { parseQuery, route } from '@/lib/api/route'
import { emailListQuerySchema, listEmails } from '@/lib/email/service'

export const GET = route(async ({ query }) => {
  const parsed = parseQuery(query, emailListQuerySchema)
  const { data, total } = await listEmails(parsed)
  return { data, total, limit: parsed.limit, offset: parsed.offset }
})
