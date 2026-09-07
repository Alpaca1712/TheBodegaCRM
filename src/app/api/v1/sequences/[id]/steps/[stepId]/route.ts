import { parseBody, route } from '@/lib/api/route'
import { stepUpdateSchema } from '@/lib/sequences/schemas'
import { deleteStep, getStep, updateStep } from '@/lib/sequences/service'

type Params = { id: string; stepId: string }

export const GET = route<Params>(async ({ params }) => ({ data: await getStep(params.id, params.stepId) }))

export const PATCH = route<Params>(async ({ request, params }) => {
  const input = await parseBody(request, stepUpdateSchema)
  return { data: await updateStep(params.id, params.stepId, input) }
})

export const DELETE = route<Params>(async ({ params }) => {
  await deleteStep(params.id, params.stepId)
})
