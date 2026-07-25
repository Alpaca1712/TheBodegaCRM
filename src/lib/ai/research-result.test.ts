import { describe, expect, it } from 'vitest'
import {
  compactResearchUpdates,
  hasCompleteResearchResultShape,
  normalizeResearchResultEnvelope,
} from './research-result'

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

describe('hasCompleteResearchResultShape', () => {
  it('accepts a complete research payload', () => {
    expect(hasCompleteResearchResultShape({
      contact_name: 'Ada Lovelace',
      company_name: 'Analytical Engines',
      company_description: 'Builds analytical engines.',
      grounded_personal_facts: [],
      research_sources: [{ url: 'https://example.com' }],
    })).toBe(true)
  })

  it('rejects a partial source-only payload', () => {
    expect(hasCompleteResearchResultShape({
      research_sources: [{ url: 'https://example.com' }],
    })).toBe(false)
  })

  it('rejects a payload with empty profile content', () => {
    expect(hasCompleteResearchResultShape({
      contact_name: 'Ada Lovelace',
      company_name: 'Analytical Engines',
      company_description: '',
      grounded_personal_facts: [],
      research_sources: [{ url: 'https://example.com' }],
    })).toBe(false)
  })
})

describe('compactResearchUpdates', () => {
  it('keeps meaningful enrichment and removes empty model defaults', () => {
    expect(compactResearchUpdates({
      company_description: 'Verified description',
      attack_surface_notes: '',
      investment_thesis_notes: null,
      smykm_hooks: [],
      research_sources: [{ url: 'https://example.com' }],
      icp_score: 0,
    })).toEqual({
      company_description: 'Verified description',
      research_sources: [{ url: 'https://example.com' }],
      icp_score: 0,
    })
  })
})
