import { z } from 'zod'
import { parseBody, route } from '@/lib/api/route'
import {
  getReferralCode,
  issueReferralCode,
  referralSummaryForLead,
  sendReferralCodeEmail,
} from '@/lib/leads/referral-codes'
import { getLead } from '@/lib/leads/service'

type Params = { id: string }

const issueSchema = z.object({
  /** When true, email the code/link to the lead (default true on first issue). */
  email: z.boolean().optional(),
  /** Regenerate even if a code already exists. */
  force_new: z.boolean().optional(),
  /** Email an existing code without regenerating. */
  resend_email: z.boolean().optional(),
})

export const GET = route<Params>(async ({ params }) => {
  const lead = await getLead(params.id)
  return { data: await referralSummaryForLead(lead) }
})

export const POST = route<Params>(async ({ request, params }) => {
  const input = await parseBody(request, issueSchema)

  if (input.resend_email) {
    const lead = await getLead(params.id)
    if (!getReferralCode(lead)) {
      const issued = await issueReferralCode(params.id, { email: true })
      return {
        data: {
          ...(await referralSummaryForLead(issued.lead)),
          emailed: issued.emailed,
          issued: true,
        },
      }
    }
    const emailed = await sendReferralCodeEmail(lead)
    return {
      data: {
        ...(await referralSummaryForLead(lead)),
        emailed,
        issued: false,
      },
    }
  }

  const shouldEmail = input.email ?? true
  const issued = await issueReferralCode(params.id, {
    email: shouldEmail,
    forceNew: input.force_new,
  })
  return {
    data: {
      ...(await referralSummaryForLead(issued.lead)),
      emailed: issued.emailed,
      issued: true,
    },
  }
})
