import { ApiError } from '@/lib/api/errors'
import { route } from '@/lib/api/route'
import { getMagnet } from '@/lib/content/service'
import { findLeadByEmail, getLead } from '@/lib/leads/service'
import { renderLeadMagnetPdf } from '@/lib/magnets/pdf'

export const maxDuration = 60

/** GET /api/v1/lead-magnets/:id/preview?lead_id=... renders the personalized PDF. */
export const GET = route<{ id: string }>(async ({ params, query }) => {
  const magnet = await getMagnet(params.id)
  const leadId = query.get('lead_id')
  const email = query.get('email')
  const lead = leadId ? await getLead(leadId) : email ? await findLeadByEmail(email) : null
  if (!lead) throw ApiError.badRequest('Provide lead_id or email of an existing lead')
  const pdf = await renderLeadMagnetPdf(magnet, lead)
  return new Response(new Uint8Array(pdf.content), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${pdf.filename.replace(/"/g, '')}"`,
      'Cache-Control': 'no-store',
    },
  })
})
