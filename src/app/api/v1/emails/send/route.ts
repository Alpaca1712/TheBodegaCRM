import { created, parseBody, route } from '@/lib/api/route'
import { sendEmailSchema, sendOneOff } from '@/lib/email/service'

export const maxDuration = 60

export const POST = route(async ({ request }) => {
  const input = await parseBody(request, sendEmailSchema)
  return created({ data: await sendOneOff(input) })
})
