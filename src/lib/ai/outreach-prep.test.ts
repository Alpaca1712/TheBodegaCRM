import { describe, expect, it } from 'vitest'
import type { Lead } from '@/types/leads'
import { buildEmailEvidence } from './email-grounding'
import {
  parseLoadedLeadMagnets,
  prepareInitialOutreach,
  rankOutreachHooks,
} from './outreach-prep'

const lead = {
  contact_name: 'Alex Rivera',
  contact_title: 'CTO and Cofounder',
  company_name: 'Mason Voice',
  company_website: 'https://masonvoice.com',
  product_name: 'resident voice agent',
  notes: null,
  research_sources: [
    {
      url: 'https://masonvoice.com/product',
      title: 'Mason Voice product',
      detail: 'Mason Voice built a resident voice agent that connects to property workflows.',
      facts: ['Mason Voice built a resident voice agent that connects to property workflows.'],
    },
    {
      url: 'https://linkedin.com/in/alex',
      title: 'Alex LinkedIn activity',
      detail: 'Alex liked a post about security reviews.',
      facts: ['Alex liked a post about security reviews.'],
    },
  ],
} as Lead

const loadedMagnets = `Loaded lead magnets (use an exact name; never invent another asset):
- We Hack AI Agents (default); linked CTA text: Pentest Challenge
- Don't Let Security Reviews Kill Your Deals; linked CTA text: Security review guide`

describe('outreach preparation', () => {
  it('prefers a first-party product decision and rejects ambiguous social engagement', () => {
    const evidence = buildEmailEvidence({ lead })
    const hooks = rankOutreachHooks(evidence, lead)

    expect(hooks[0]).toMatchObject({
      tier: 'product_decision',
      usable: true,
    })
    expect(hooks.find(hook => hook.fact.includes('liked a post'))).toMatchObject({
      tier: 'do_not_use',
      usable: false,
    })
  })

  it('parses exact loaded lead magnets from campaign context', () => {
    expect(parseLoadedLeadMagnets(loadedMagnets)).toEqual([
      {
        name: 'We Hack AI Agents',
        ctaText: 'Pentest Challenge',
        isDefault: true,
      },
      {
        name: "Don't Let Security Reviews Kill Your Deals",
        ctaText: 'Security review guide',
        isDefault: false,
      },
    ])
  })

  it('selects the AI-agent guide for a technical lead whose product takes actions', () => {
    const evidence = buildEmailEvidence({ lead })
    const plan = prepareInitialOutreach({
      lead,
      evidence,
      customContext: loadedMagnets,
      ctaType: 'hormozi',
    })

    expect(plan.offerMode).toBe('lead_magnet')
    expect(plan.offerName).toBe('We Hack AI Agents')
  })

  it('does not send a compliance guide without explicit pre-compliance evidence', () => {
    const nonAiLead = {
      ...lead,
      contact_title: 'Founder',
      product_name: 'billing platform',
      research_sources: [],
    } as Lead
    const evidence = buildEmailEvidence({ lead: nonAiLead })
    const plan = prepareInitialOutreach({
      lead: nonAiLead,
      evidence,
      customContext: loadedMagnets,
      ctaType: 'hormozi',
    })

    expect(plan.offerMode).toBe('direct_pentest')
    expect(plan.offerName).toBe('Free Pigeon pentest')
  })

  it('uses direct differentiation when sourced research says SOC 2 is complete', () => {
    const compliantLead = {
      ...lead,
      research_sources: [{
        url: 'https://masonvoice.com/security',
        title: 'Mason Voice security',
        detail: 'Mason Voice completed SOC 2 Type II certification.',
        facts: ['Mason Voice completed SOC 2 Type II certification.'],
      }],
    } as Lead
    const evidence = buildEmailEvidence({ lead: compliantLead })
    const plan = prepareInitialOutreach({
      lead: compliantLead,
      evidence,
      customContext: loadedMagnets,
      ctaType: 'hormozi',
    })

    expect(plan.securityPosture).toBe('already_compliant')
    expect(plan.offerMode).toBe('direct_pentest')
    expect(plan.offerReason).toContain('differentiation')
  })

  it('uses the compliance guide only with explicit pre-compliance evidence', () => {
    const preComplianceLead = {
      ...lead,
      contact_title: 'Founder',
      product_name: 'billing platform',
      research_sources: [{
        url: 'https://masonvoice.com/blog/enterprise',
        title: 'Preparing for enterprise',
        detail: 'Mason Voice is preparing for its first enterprise security review.',
        facts: ['Mason Voice is preparing for its first enterprise security review.'],
      }],
    } as Lead
    const evidence = buildEmailEvidence({ lead: preComplianceLead })
    const plan = prepareInitialOutreach({
      lead: preComplianceLead,
      evidence,
      customContext: loadedMagnets,
      ctaType: 'hormozi',
    })

    expect(plan.securityPosture).toBe('pre_compliance')
    expect(plan.offerMode).toBe('lead_magnet')
    expect(plan.offerName).toBe("Don't Let Security Reviews Kill Your Deals")
  })
})
