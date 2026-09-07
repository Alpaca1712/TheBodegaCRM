import { parseBody, route } from '@/lib/api/route'
import { deleteMagnet, getMagnet, magnetUpdateSchema, updateMagnet } from '@/lib/content/service'

type Params = { id: string }

export const GET = route<Params>(async ({ params }) => ({ data: await getMagnet(params.id) }))

export const PATCH = route<Params>(async ({ request, params }) => {
  const input = await parseBody(request, magnetUpdateSchema)
  return { data: await updateMagnet(params.id, input) }
})

export const DELETE = route<Params>(async ({ params }) => {
  await deleteMagnet(params.id)
})
