import { z } from 'zod'
import { parseBody, route } from '@/lib/api/route'
import { findEmail } from '@/lib/enrichment/hunter'

const schema = z.object({
  first_name: z.string().trim().min(1),
  last_name: z.string().trim().min(1),
  domain: z.string().trim().optional(),
  company: z.string().trim().optional(),
})

export const POST = route(async ({ request }) => {
  const input = await parseBody(request, schema)
  return { data: await findEmail(input) }
})
