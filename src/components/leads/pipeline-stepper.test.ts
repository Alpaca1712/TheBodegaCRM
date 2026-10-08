import { describe, expect, it } from 'vitest'
import { PIPELINE_STAGES } from './pipeline-stepper'

/** Mirror of stepState for unit coverage (keeps UI file free of test exports). */
function stepState(
  step: (typeof PIPELINE_STAGES)[number],
  index: number,
  stage: (typeof PIPELINE_STAGES)[number],
  activity: { contacted?: boolean; replied?: boolean },
): 'done' | 'current' | 'upcoming' {
  const currentIndex = PIPELINE_STAGES.indexOf(stage)
  if (index === currentIndex) return 'current'
  if (step === 'new') return index < currentIndex ? 'done' : 'upcoming'
  if (step === 'contacted') return activity.contacted ? 'done' : 'upcoming'
  if (step === 'replied') return activity.replied ? 'done' : 'upcoming'
  if (index < currentIndex) return 'done'
  return 'upcoming'
}

describe('pipeline stepper activity', () => {
  it('does not mark contacted/replied done for interested web leads with no email', () => {
    const states = PIPELINE_STAGES.map((step, index) =>
      stepState(step, index, 'interested', {}),
    )
    expect(states).toEqual([
      'done', // new
      'upcoming', // contacted
      'upcoming', // replied
      'current', // interested
      'upcoming',
      'upcoming',
    ])
  })

  it('marks contacted/replied from activity even when stage skipped ahead', () => {
    const states = PIPELINE_STAGES.map((step, index) =>
      stepState(step, index, 'interested', { contacted: true, replied: true }),
    )
    expect(states).toEqual([
      'done',
      'done',
      'done',
      'current',
      'upcoming',
      'upcoming',
    ])
  })
})
