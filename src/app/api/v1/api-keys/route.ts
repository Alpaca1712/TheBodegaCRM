import { z } from 'zod'
import { created, parseBody, route } from '@/lib/api/route'
import { createApiKey, listApiKeys } from '@/lib/auth/api-keys'

const schema = z.object({ name: z.string().trim().min(1).max(100) })

export const GET = route(async () => ({ data: await listApiKeys() }), { auth: 'session' })

/** The plaintext key is returned exactly once. */
export const POST = route(async ({ request }) => {
  const input = await parseBody(request, schema)
  const { record, key } = await createApiKey(input.name)
  return created({ data: { ...record, key } })
}, { auth: 'session' })
