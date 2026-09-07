import { created, parseBody, parseQuery, route } from '@/lib/api/route'
import { enrollLeads, listEnrollments } from '@/lib/sequences/enrollments'
import { enrollSchema, enrollmentListQuerySchema } from '@/lib/sequences/schemas'
import { resolveSequence } from '@/lib/sequences/service'

type Params = { id: string }

export const GET = route<Params>(async ({ params, query }) => {
  const sequence = await resolveSequence(params.id)
  const parsed = parseQuery(query, enrollmentListQuerySchema)
  const { data, total } = await listEnrollments(sequence.id, parsed)
  return { data, total, limit: parsed.limit, offset: parsed.offset }
})

export const POST = route<Params>(async ({ request, params }) => {
  const input = await parseBody(request, enrollSchema)
  return created({ data: await enrollLeads(params.id, input) })
})
