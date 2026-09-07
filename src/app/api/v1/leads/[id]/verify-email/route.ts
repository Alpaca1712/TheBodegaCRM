import { route } from '@/lib/api/route'
import { emailStatusFromHunter, verifyEmail } from '@/lib/enrichment/hunter'
import { db } from '@/lib/db'
import { getLead } from '@/lib/leads/service'

export const POST = route<{ id: string }>(async ({ params }) => {
  const lead = await getLead(params.id)
  const result = await verifyEmail(lead.email)
  const status = emailStatusFromHunter(result)
  const { data, error } = await db()
    .from('leads')
    .update({
      email_status: status,
      email_score: result.score,
      email_verified_at: new Date().toISOString(),
      enrichment: { ...lead.enrichment, hunter_verifier: { ...result, fetched_at: new Date().toISOString() } },
    })
    .eq('id', lead.id)
    .select('*')
    .single()
  if (error) throw error
  return { data: { result, lead: data } }
})
