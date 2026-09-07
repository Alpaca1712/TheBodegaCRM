import { route } from '@/lib/api/route'
import { MODEL_PRESETS, listNovitaModels, novitaConfigured } from '@/lib/ai/novita'
import { getSetting } from '@/lib/settings'

/** Curated presets plus (optionally) the full Novita catalog with ?all=true. */
export const GET = route(async ({ query }) => {
  const ai = await getSetting('ai')
  const includeAll = query.get('all') === 'true'
  const catalog = includeAll && novitaConfigured() ? await listNovitaModels() : null
  return {
    data: {
      default_model: ai.default_model,
      configured: novitaConfigured(),
      presets: MODEL_PRESETS,
      ...(catalog ? { catalog } : {}),
    },
  }
})
