import { route } from '@/lib/api/route'
import { runDueSteps } from '@/lib/sequences/runner'
import { resolveSequence } from '@/lib/sequences/service'

export const maxDuration = 300

/** Manually process due steps for one sequence (respects the send window unless ?force=true). */
export const POST = route<{ id: string }>(async ({ params, query }) => {
  const sequence = await resolveSequence(params.id)
  const summary = await runDueSteps({ sequence_id: sequence.id, ignore_window: query.get('force') === 'true', limit: 100 })
  return { data: summary }
})
