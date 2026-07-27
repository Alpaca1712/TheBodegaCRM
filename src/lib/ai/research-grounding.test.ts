import { describe, expect, it } from 'vitest'
import {
  attachGroundedFacts,
  combineGroundedResearchPasses,
  getGroundedResearchEvidence,
} from './research-grounding'

describe('research grounding', () => {
  it('keeps only facts quoted by a trusted citation for the returned source URL', () => {
    const result = attachGroundedFacts(
      [{
        url: 'https://example.com/interview',
        title: 'Founder interview',
        detail: 'An interview with the founder.',
      }],
      [
        {
          fact: 'Alex said resident trust shaped the product design.',
          evidence_quote: 'Alex described resident trust as the core product constraint.',
          source_url: 'https://example.com/interview#quote',
          use_as_hook: true,
        },
        {
          fact: 'Alex was secretly a student pilot.',
          evidence_quote: 'Alex described resident trust as the core product constraint.',
          source_url: 'https://made-up.example/fake',
          use_as_hook: true,
        },
      ],
      [{
        url: 'https://example.com/interview',
        citedText: 'Alex described resident trust as the core product constraint.',
      }],
    )

    expect(result.personalDetails).toBe(
      'Alex said resident trust shaped the product design.',
    )
    expect(result.smykmHooks).toEqual([
      'Alex said resident trust shaped the product design.',
    ])
    expect(result.sources[0].facts).toEqual([
      'Alex said resident trust shaped the product design.',
    ])
    expect(result.sources[0].detail).toBe(
      'Alex described resident trust as the core product constraint.',
    )
  })

  it('rejects a fact when the model attaches a URL without citation evidence', () => {
    const result = attachGroundedFacts(
      [{
        url: 'https://example.com/interview',
        title: 'Founder interview',
        detail: 'A model-written source summary.',
      }],
      [{
        fact: 'Alex was a student pilot.',
        evidence_quote: 'Alex discussed how the company handles resident requests.',
        source_url: 'https://example.com/interview',
        use_as_hook: true,
      }],
      [{
        url: 'https://example.com/interview',
        citedText: 'Alex discussed how the company handles resident requests.',
      }],
    )

    expect(result.personalDetails).toBe('')
    expect(result.smykmHooks).toEqual([])
    expect(result.sources[0].facts).toEqual([])
    expect(result.sources[0].detail).toBe(
      'Alex discussed how the company handles resident requests.',
    )
  })

  it('does not use source summaries as evidence for legacy research records', () => {
    expect(getGroundedResearchEvidence([{
      url: 'https://example.com/product',
      title: 'Product page',
      detail: 'The product handles resident requests by voice and chat.',
    }])).toEqual([])
  })

  it('does not promote a new source summary when no fact was linked to it', () => {
    expect(getGroundedResearchEvidence([{
      url: 'https://example.com/product',
      title: 'Product page',
      detail: 'A model-written summary that was not approved as a grounded fact.',
      facts: [],
    }])).toEqual([])
  })

  it('keeps primary product facts when a second outreach pass also succeeds', () => {
    const combined = combineGroundedResearchPasses(
      {
        sources: [{ url: 'https://example.com/product', title: 'Product', detail: '' }],
        facts: [{
          fact: 'The product reads resumes and sends candidate outreach.',
          evidence_quote: 'The product reads resumes and sends candidate outreach.',
          source_url: 'https://example.com/product',
          use_as_hook: true,
        }],
        citations: [{
          url: 'https://example.com/product',
          citedText: 'The product reads resumes and sends candidate outreach.',
        }],
      },
      {
        sources: [{ url: 'https://example.com/person', title: 'Founder', detail: '' }],
        facts: [{
          fact: 'Alex wrote about recruiting operations.',
          evidence_quote: 'Alex wrote about recruiting operations.',
          source_url: 'https://example.com/person',
          use_as_hook: true,
        }],
        citations: [{
          url: 'https://example.com/person',
          citedText: 'Alex wrote about recruiting operations.',
        }],
      },
    )
    const grounded = attachGroundedFacts(
      combined.sources,
      combined.facts,
      combined.citations,
    )

    expect(getGroundedResearchEvidence(grounded.sources).map(item => item.fact)).toEqual([
      'The product reads resumes and sends candidate outreach.',
      'Alex wrote about recruiting operations.',
    ])
  })

  it('keeps a sourced job title as detail but never labels it as an outreach hook', () => {
    const result = attachGroundedFacts(
      [{
        url: 'https://example.com/team',
        title: 'Team',
        detail: '',
      }],
      [{
        fact: 'Alex Rivera is CTO and co-founder of Mason Voice.',
        evidence_quote: 'Alex Rivera is CTO and co-founder of Mason Voice.',
        source_url: 'https://example.com/team',
        use_as_hook: true,
      }],
      [{
        url: 'https://example.com/team',
        citedText: 'Alex Rivera is CTO and co-founder of Mason Voice.',
      }],
    )

    expect(result.personalDetails).toBe(
      'Alex Rivera is CTO and co-founder of Mason Voice.',
    )
    expect(result.smykmHooks).toEqual([])
  })
})
