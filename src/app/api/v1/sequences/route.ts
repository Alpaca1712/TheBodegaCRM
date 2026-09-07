import { created, parseBody, parseQuery, route } from '@/lib/api/route'
import { sequenceCreateSchema, sequenceListQuerySchema } from '@/lib/sequences/schemas'
import { createSequence, listSequences, sequenceStats } from '@/lib/sequences/service'

export const GET = route(async ({ query }) => {
  const parsed = parseQuery(query, sequenceListQuerySchema)
  const { data, total } = await listSequences(parsed)
  const withStats = await Promise.all(data.map(async (sequence) => ({ ...sequence, stats: await sequenceStats(sequence.id) })))
  return { data: withStats, total, limit: parsed.limit, offset: parsed.offset }
})

export const POST = route(async ({ request }) => {
  const input = await parseBody(request, sequenceCreateSchema)
  return created({ data: await createSequence(input) })
})
