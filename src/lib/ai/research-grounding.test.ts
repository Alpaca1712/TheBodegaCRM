import { describe, expect, it } from 'vitest'
import { attachGroundedFacts, getGroundedResearchEvidence } from './research-grounding'

describe('research grounding', () => {
  it('keeps only facts tied to a returned source URL', () => {
    const result = attachGroundedFacts(
      [{
        url: 'https://example.com/interview',
        title: 'Founder interview',
        detail: 'An interview with the founder.',
      }],
      [
        {
          fact: 'Alex described resident trust as the core product constraint.',
          source_url: 'https://example.com/interview#quote',
          use_as_hook: true,
        },
        {
          fact: 'Alex was secretly a student pilot.',
          source_url: 'https://made-up.example/fake',
          use_as_hook: true,
        },
      ],
    )

    expect(result.personalDetails).toBe(
      'Alex described resident trust as the core product constraint.',
    )
    expect(result.smykmHooks).toEqual([
      'Alex described resident trust as the core product constraint.',
    ])
    expect(result.sources[0].facts).toEqual([
      'Alex described resident trust as the core product constraint.',
    ])
  })

  it('uses a source detail as conservative evidence for legacy research records', () => {
    expect(getGroundedResearchEvidence([{
      url: 'https://example.com/product',
      title: 'Product page',
      detail: 'The product handles resident requests by voice and chat.',
    }])).toEqual([{
      fact: 'The product handles resident requests by voice and chat.',
      sourceUrl: 'https://example.com/product',
      sourceTitle: 'Product page',
    }])
  })

  it('does not promote a new source summary when no fact was linked to it', () => {
    expect(getGroundedResearchEvidence([{
      url: 'https://example.com/product',
      title: 'Product page',
      detail: 'A model-written summary that was not approved as a grounded fact.',
      facts: [],
    }])).toEqual([])
  })
})
