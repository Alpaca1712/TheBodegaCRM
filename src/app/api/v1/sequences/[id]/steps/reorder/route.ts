import { parseBody, route } from '@/lib/api/route'
import { reorderStepsSchema } from '@/lib/sequences/schemas'
import { reorderSteps } from '@/lib/sequences/service'

export const POST = route<{ id: string }>(async ({ request, params }) => {
  const input = await parseBody(request, reorderStepsSchema)
  return { data: await reorderSteps(params.id, input.step_ids) }
})
