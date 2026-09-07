import { created, parseBody, route } from '@/lib/api/route'
import { createMagnet, listMagnets, magnetCreateSchema } from '@/lib/content/service'

export const GET = route(async () => ({ data: await listMagnets() }))

export const POST = route(async ({ request }) => {
  const input = await parseBody(request, magnetCreateSchema)
  return created({ data: await createMagnet(input) })
})
