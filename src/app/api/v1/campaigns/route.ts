import { created, parseBody, route } from '@/lib/api/route'
import { campaignCreateSchema, createCampaign, listCampaigns } from '@/lib/content/service'

export const GET = route(async () => ({ data: await listCampaigns() }))

export const POST = route(async ({ request }) => {
  const input = await parseBody(request, campaignCreateSchema)
  return created({ data: await createCampaign(input) })
})
