import { describe, expect, it } from 'vitest'
import { normalizeResearchResultEnvelope } from './research-result'

describe('normalizeResearchResultEnvelope', () => {
  const research = {
    contact_name: 'Ada Lovelace',
    company_name: 'Analytical Engines',
  }

  it('keeps a direct research object unchanged', () => {
    expect(normalizeResearchResultEnvelope(research)).toBe(research)
  })

  it('unwraps a single research object returned as an array', () => {
    expect(normalizeResearchResultEnvelope([research])).toBe(research)
  })

  it.each(['data', 'research', 'result', 'results'])(
    'unwraps a single research object from a %s envelope',
    (key) => {
      expect(normalizeResearchResultEnvelope({ [key]: [research] })).toBe(research)
    },
  )

  it('does not choose between multiple research records', () => {
    const ambiguous = [research, { ...research, contact_name: 'Grace Hopper' }]

    expect(normalizeResearchResultEnvelope(ambiguous)).toBe(ambiguous)
  })

  it('does not unwrap an envelope with extra metadata', () => {
    const wrapped = { result: research, confidence: 0.8 }

    expect(normalizeResearchResultEnvelope(wrapped)).toBe(wrapped)
  })
})
