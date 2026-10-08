import { parseBody, route } from '@/lib/api/route'
import { referralSummaryForLead } from '@/lib/leads/referral-codes'
import { leadUpdateSchema } from '@/lib/leads/schemas'
import { deleteLead, getLead, updateLead } from '@/lib/leads/service'
import { liveEnrollmentForLead } from '@/lib/sequences/enrollments'

type Params = { id: string }

export const GET = route<Params>(async ({ params }) => {
  const [lead, enrollment] = await Promise.all([getLead(params.id), liveEnrollmentForLead(params.id)])
  const referral = await referralSummaryForLead(lead)
  return { data: { ...lead, live_enrollment: enrollment, referral } }
})

export const PATCH = route<Params>(async ({ request, params }) => {
  const input = await parseBody(request, leadUpdateSchema)
  return { data: await updateLead(params.id, input) }
})

export const DELETE = route<Params>(async ({ params }) => {
  await deleteLead(params.id)
  return { data: { deleted: params.id } }
})
