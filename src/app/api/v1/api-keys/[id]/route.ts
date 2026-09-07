import { route } from '@/lib/api/route'
import { revokeApiKey } from '@/lib/auth/api-keys'

export const DELETE = route<{ id: string }>(async ({ params }) => ({ data: await revokeApiKey(params.id) }), { auth: 'session' })
