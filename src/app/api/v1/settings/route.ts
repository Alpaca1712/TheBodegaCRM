import { z } from 'zod'
import { parseBody, route } from '@/lib/api/route'
import { getAllSettings, updateSetting } from '@/lib/settings'
import { hunterConfigured } from '@/lib/enrichment/hunter'
import { novitaConfigured } from '@/lib/ai/novita'
import { resendConfigured } from '@/lib/email/resend'

const schema = z.object({
  ai: z.object({ default_model: z.string().trim().min(1) }).partial().optional(),
  sender: z.object({
    from_name: z.string().trim().max(200),
    from_email: z.string().trim().email(),
    reply_to: z.string().trim().email().nullable(),
    signature: z.string().max(2000),
  }).partial().optional(),
  landing: z.object({ base_url: z.string().trim().url() }).partial().optional(),
})

export const GET = route(async () => ({
  data: {
    ...(await getAllSettings()),
    integrations: { resend: resendConfigured(), hunter: hunterConfigured(), novita: novitaConfigured() },
  },
}))

export const PATCH = route(async ({ request }) => {
  const input = await parseBody(request, schema)
  if (input.ai) await updateSetting('ai', input.ai)
  if (input.sender) await updateSetting('sender', input.sender)
  if (input.landing) await updateSetting('landing', input.landing)
  return { data: await getAllSettings() }
})
