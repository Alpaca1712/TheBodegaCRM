import { parseBody, route } from '@/lib/api/route'
import { deleteTemplate, getTemplate, templateUpdateSchema, updateTemplate } from '@/lib/content/service'

type Params = { id: string }

export const GET = route<Params>(async ({ params }) => ({ data: await getTemplate(params.id) }))

export const PATCH = route<Params>(async ({ request, params }) => {
  const input = await parseBody(request, templateUpdateSchema)
  return { data: await updateTemplate(params.id, input) }
})

export const DELETE = route<Params>(async ({ params }) => {
  await deleteTemplate(params.id)
})
