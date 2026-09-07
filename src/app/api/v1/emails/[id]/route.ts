import { parseBody, route } from '@/lib/api/route'
import { emailUpdateSchema, getEmail, updateEmail } from '@/lib/email/service'

type Params = { id: string }

export const GET = route<Params>(async ({ params }) => ({ data: await getEmail(params.id) }))

export const PATCH = route<Params>(async ({ request, params }) => {
  const input = await parseBody(request, emailUpdateSchema)
  return { data: await updateEmail(params.id, input) }
})
