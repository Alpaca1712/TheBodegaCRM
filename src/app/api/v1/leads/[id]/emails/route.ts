import { route } from '@/lib/api/route'
import { leadThread } from '@/lib/email/service'
import { getLead } from '@/lib/leads/service'

export const GET = route<{ id: string }>(async ({ params }) => {
  await getLead(params.id)
  return { data: await leadThread(params.id) }
})
