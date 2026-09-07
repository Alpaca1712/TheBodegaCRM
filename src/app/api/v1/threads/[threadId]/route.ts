import { route } from '@/lib/api/route'
import { getThread } from '@/lib/email/service'

export const GET = route<{ threadId: string }>(async ({ params }) => ({ data: await getThread(params.threadId) }))
