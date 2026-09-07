import { parseBody, route } from '@/lib/api/route'
import { campaignUpdateSchema, deleteCampaign, getCampaign, updateCampaign } from '@/lib/content/service'

type Params = { id: string }

export const GET = route<Params>(async ({ params }) => ({ data: await getCampaign(params.id) }))

export const PATCH = route<Params>(async ({ request, params }) => {
  const input = await parseBody(request, campaignUpdateSchema)
  return { data: await updateCampaign(params.id, input) }
})

export const DELETE = route<Params>(async ({ params }) => {
  await deleteCampaign(params.id)
})
