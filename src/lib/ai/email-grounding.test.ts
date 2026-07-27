import { describe, expect, it } from 'vitest'
import type { Lead } from '@/types/leads'
import { buildEmailEvidence, UngroundedEmailError, validateEvidenceAwareDraft } from './email-grounding'

const lead = {
  contact_name: 'Alex Rivera',
  contact_title: 'Founder',
  company_name: 'Mason Voice',
  product_name: 'resident voice agent',
  fund_name: null,
  notes: null,
  research_sources: [{
    url: 'https://example.com/interview',
    title: 'Founder interview',
    detail: 'Alex described resident trust as the core product constraint.',
    facts: ['Alex described resident trust as the core product constraint.'],
  }],
} as Lead

describe('email grounding', () => {
  it('does not treat unlinked personal details or hooks as evidence', () => {
    const evidence = buildEmailEvidence({
      lead: {
        ...lead,
        personal_details: 'Alex had a $13 weekly food budget.',
        smykm_hooks: ['Alex was a student pilot at Lunken.'],
      },
    })

    expect(evidence.map(item => item.fact)).not.toContain('Alex had a $13 weekly food budget.')
    expect(evidence.map(item => item.fact)).not.toContain('Alex was a student pilot at Lunken.')
  })

  it('accepts a draft whose declared personalization is copied from sourced evidence', () => {
    const evidence = buildEmailEvidence({ lead })

    expect(() => validateEvidenceAwareDraft({
      subject: 'Resident trust',
      body: 'Hi Alex. Your point about resident trust made the product constraint clear.',
      evidence_used: ['Alex described resident trust as the core product constraint.'],
    }, evidence)).not.toThrow()
  })

  it('blocks the unsupported numeric and biographical claim from the reported draft', () => {
    const evidence = buildEmailEvidence({ lead })

    expect(() => validateEvidenceAwareDraft({
      subject: 'Startup lessons',
      body: 'Hi Alex. Your $13.00-a-week food budget and time as a student pilot at Lunken stood out.',
      evidence_used: [],
    }, evidence)).toThrow(UngroundedEmailError)
  })

  it('allows Daniel to own his experience but blocks attributing it to Pigeon', () => {
    const evidence = buildEmailEvidence({ lead })

    expect(() => validateEvidenceAwareDraft({
      subject: 'resident trust',
      body: "I'm Daniel, and I have 15 years of cybersecurity experience.",
      evidence_used: ['Daniel Chalco has 15 years of cybersecurity experience.'],
    }, evidence)).not.toThrow()

    expect(() => validateEvidenceAwareDraft({
      subject: 'resident trust',
      body: "At Pigeon, we've spent 15 years in cybersecurity.",
      evidence_used: ['Daniel Chalco has 15 years of cybersecurity experience.'],
    }, evidence)).toThrow(UngroundedEmailError)
  })
})
