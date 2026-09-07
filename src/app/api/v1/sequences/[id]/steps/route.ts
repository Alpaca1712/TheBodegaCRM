import { created, parseBody, route } from '@/lib/api/route'
import { stepInputSchema } from '@/lib/sequences/schemas'
import { addStep, listSteps, resolveSequence } from '@/lib/sequences/service'

type Params = { id: string }

export const GET = route<Params>(async ({ params }) => {
  const sequence = await resolveSequence(params.id)
  return { data: await listSteps(sequence.id) }
})

export const POST = route<Params>(async ({ request, params }) => {
  const input = await parseBody(request, stepInputSchema)
  return created({ data: await addStep(params.id, input) })
})
