import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Lead } from '@/types/leads'

const { mockGenerateJSON } = vi.hoisted(() => ({
  mockGenerateJSON: vi.fn(),
}))

vi.mock('./anthropic', () => ({
  generateJSON: mockGenerateJSON,
}))

import { buildFollowupUserPrompt, buildInitialUserPrompt, generateInitialOutreach } from './email-service'

const productFact = 'Mason Voice built an AI agent that reads resident voice messages and sends work orders into property workflows.'

const baseLead: Lead = {
  id: 'lead-1',
  user_id: 'user-1',
  type: 'customer',
  company_name: 'Mason Voice',
  product_name: 'resident voice agent',
  fund_name: null,
  contact_name: 'Alex Rivera',
  contact_title: 'Founder',
  contact_email: 'alex@example.com',
  contact_twitter: null,
  contact_linkedin: null,
  contact_phone: null,
  company_description: 'Mason Voice answers resident maintenance calls with an AI agent.',
  attack_surface_notes: 'Residents can reach the agent through voice, chat, and email.',
  investment_thesis_notes: null,
  personal_details: 'Alex wrote about making property management feel more human.',
  smykm_hooks: ['Alex wrote about making property management feel more human.'],
  research_sources: [{
    url: 'https://example.com/alex-interview',
    title: 'Alex Rivera interview',
    detail: 'Alex wrote about making property management feel more human.',
    facts: ['Alex wrote about making property management feel more human.'],
  }, {
    url: 'https://masonvoice.com/product',
    title: 'Mason Voice product',
    detail: productFact,
    facts: [productFact],
  }],
  stage: 'researched',
  source_type: 'manual',
  source: null,
  lead_token: null,
  priority: 'high',
  notes: null,
  last_contacted_at: null,
  created_at: '2026-01-01T12:00:00Z',
  updated_at: '2026-01-01T12:00:00Z',
  account_snapshot: null,
  snapshot_generated_at: null,
  risk_score: null,
  risk_factors: [],
  risk_assessed_at: null,
  contact_photo_url: null,
  company_website: null,
  company_logo_url: null,
  org_chart: [],
  icp_score: 91,
  icp_reasons: ['AI agent reachable through customer channels'],
  battle_card: null,
  battle_card_generated_at: null,
  investor_memo: null,
  investor_memo_generated_at: null,
  email_domain: null,
  conversation_summary: null,
  conversation_next_step: null,
  conversation_signals: [],
  auto_stage_reason: null,
  thread_count: 0,
  total_emails_in: 0,
  total_emails_out: 0,
  last_inbound_at: null,
  last_outbound_at: null,
}

const bodyWithNormalizedDash = [
  'Hi Alex,',
  'Mason Voice reads resident voice messages and sends work orders into property workflows. That is a useful shortcut when an urgent repair cannot wait.',
  'Pigeon helps SaaS teams test the voice, chat, and email paths customers can reach, then fix the weaknesses before attackers find them.',
  'I can send a short walkthrough of three ways resident agents can be tricked — and how to prevent each one. Want it?',
  'Best,',
  'Daniel Chalco',
  'CEO, Pigeon',
].join('\n')

describe('buildInitialUserPrompt', () => {
  it('makes the core offer and lead magnet variants do different jobs', () => {
    const coreOffer = buildInitialUserPrompt(baseLead, 'mckenna')
    const leadMagnet = buildInitialUserPrompt(
      baseLead,
      'hormozi',
      `Loaded lead magnets (use an exact name; never invent another asset):
- We Hack AI Agents (default); linked CTA text: Pentest Challenge`,
    )

    expect(coreOffer).toContain('OFFER MODE: FREE PIGEON PENTEST')
    expect(coreOffer).toContain('findings arrive within 48 hours')
    expect(leadMagnet).toContain('OFFER MODE: OFFER A LEAD MAGNET ON REPLY')
    expect(leadMagnet).toContain('We Hack AI Agents')
    expect(leadMagnet).toContain('Do not say it is attached')
    expect(leadMagnet).toContain('Do not say what is inside it or how long it takes unless')
  })

  it('excludes legacy unsourced personal details and hooks from the draft context', () => {
    const prompt = buildInitialUserPrompt({
      ...baseLead,
      personal_details: 'Alex lived on a $13 weekly food budget.',
      smykm_hooks: ['Alex was a student pilot at Lunken.'],
      research_sources: [],
    }, 'mckenna')

    expect(prompt).not.toContain('$13')
    expect(prompt).not.toContain('student pilot')
    expect(prompt).toContain('Use no recipient or company facts outside that list')
  })
})

describe('generateInitialOutreach', () => {
  beforeEach(() => {
    mockGenerateJSON.mockReset()
  })

  it('scores initial variants against the normalized copy the user sees', async () => {
    mockGenerateJSON
      .mockResolvedValueOnce({
        subject: 'resident repair agent — trust',
        body: bodyWithNormalizedDash,
        evidence_used: [productFact],
      })
      .mockResolvedValueOnce({
        subject: 'resident repair agent — checklist',
        body: bodyWithNormalizedDash,
        evidence_used: [productFact],
      })

    const result = await generateInitialOutreach(baseLead)

    expect(result.mckenna.subject).toBe('resident repair agent, trust')
    expect(result.mckenna.body).toContain('tricked, and how to prevent each one')
    expect(result.mckenna.quality).toBeDefined()
    expect(result.mckenna.quality?.issues).not.toContain('Contains em dashes. Use commas or periods.')
    expect(result.mckenna.wordCount).toBe(result.mckenna.body.trim().split(/\s+/).length)
    expect(result.hormozi.quality).toBeDefined()
    expect(result.hormozi.quality?.issues).not.toContain('Contains em dashes. Use commas or periods.')
    expect(result.hormozi.attachLeadMagnet).toBe(false)
  })

  it('repairs a grounded but generic draft that does not use the top product hook', async () => {
    const genericDraft = {
      subject: 'security check',
      body: [
        'Hi Alex,',
        'SaaS teams move fast, so security often gets pushed until later.',
        'I am Daniel, founder of Pigeon. I have spent 14 years breaking into systems, including AI agents.',
        'Reply if you want a free pentest. Pigeon sends the findings within 48 hours.',
        'Best,',
        'Daniel Chalco',
        'Founder, Pigeon',
      ].join('\n\n'),
      evidence_used: [
        'Daniel Chalco has spent 14 years breaking into systems, including AI agents.',
        'Pigeon offers a free pentest and delivers the findings within 48 hours.',
      ],
    }
    const repairedDraft = {
      subject: 'resident work orders',
      body: bodyWithNormalizedDash,
      evidence_used: [productFact],
    }

    mockGenerateJSON
      .mockResolvedValueOnce(genericDraft)
      .mockResolvedValueOnce(genericDraft)
      .mockResolvedValueOnce(repairedDraft)
      .mockResolvedValueOnce(repairedDraft)

    const result = await generateInitialOutreach(baseLead)

    expect(result.mckenna.body).toContain('resident voice messages')
    expect(result.mckenna.body).not.toContain('SaaS teams move fast')
    expect(result.mckenna.specificityPassed).toBe(true)
    expect(result.mckenna.quality?.score).toBeGreaterThanOrEqual(70)
  })

  it('returns conservative usable variants when generated personalization is unsupported', async () => {
    mockGenerateJSON.mockResolvedValue({
      subject: 'Startup lessons',
      body: 'Hi Alex. Your $13.00-a-week food budget and time as a student pilot stood out.',
      evidence_used: [],
    })

    const result = await generateInitialOutreach(baseLead)

    expect(result.mckenna.body).toContain("I've spent 14 years breaking into systems")
    expect(result.mckenna.body).not.toContain('$13')
    expect(result.hormozi.body).toContain('free pentest')
    expect(result.hormozi.body).not.toContain('checklist')
    expect(result.hormozi.body).not.toContain('student pilot')
    expect(result.hormozi.offerMode).toBe('direct_pentest')
    expect(result.hormozi.realDetailPrompts).toHaveLength(3)
  })
})

describe('buildFollowupUserPrompt', () => {
  it('keeps channel-switch follow-ups grounded instead of encouraging invented findings', () => {
    const prompt = buildFollowupUserPrompt({
      lead: baseLead,
      emailThread: [],
      followUpNumber: 3,
    })

    expect(prompt).toContain('Drop grounded proof only')
    expect(prompt).toContain('Never invent a completed assessment, client result, or specific vulnerability count')
    expect(prompt).not.toContain('Just wrapped an assessment for a [similar company type]')
    expect(prompt).not.toContain('found 3 critical issues')
  })
})
