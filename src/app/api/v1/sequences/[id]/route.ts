import { parseBody, route } from '@/lib/api/route'
import { sequenceUpdateSchema } from '@/lib/sequences/schemas'
import { deleteSequence, getSequenceWithSteps, sequenceStats, updateSequence } from '@/lib/sequences/service'

type Params = { id: string }

export const GET = route<Params>(async ({ params }) => {
  const sequence = await getSequenceWithSteps(params.id)
  return { data: { ...sequence, stats: await sequenceStats(sequence.id) } }
})

export const PATCH = route<Params>(async ({ request, params }) => {
  const input = await parseBody(request, sequenceUpdateSchema)
  return { data: await updateSequence(params.id, input) }
})

export const DELETE = route<Params>(async ({ params }) => {
  await deleteSequence(params.id)
})
