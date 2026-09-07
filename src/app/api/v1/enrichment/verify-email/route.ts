import { z } from 'zod'
import { parseBody, route } from '@/lib/api/route'
import { verifyEmail } from '@/lib/enrichment/hunter'

const schema = z.object({ email: z.string().trim().email() })

export const POST = route(async ({ request }) => {
  const input = await parseBody(request, schema)
  return { data: await verifyEmail(input.email) }
})
