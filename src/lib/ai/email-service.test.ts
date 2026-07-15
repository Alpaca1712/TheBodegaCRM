import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Lead } from '@/types/leads'

const { mockGenerateJSON } = vi.hoisted(() => ({
  mockGenerateJSON: vi.fn(),
}))

vi.mock('./anthropic', () => ({
  generateJSON: mockGenerateJSON,
}))

import { buildFollowupUserPrompt, buildInitialUserPrompt, generateInitialOutreach } from './email-service'

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
  research_sources: [],
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
  'Your note about making property management feel human stuck with me. Resident trust gets fragile when an automated helper handles an urgent repair.',
  'Pigeon helps SaaS teams test the voice, chat, and email paths customers can reach, then fix the weaknesses before attackers find them.',
  'I can send a short walkthrough of three ways resident agents can be tricked — and how to prevent each one. Want it?',
  'Best,',
  'Daniel Chalco',
  'CEO, Pigeon',
].join('\n')

describe('buildInitialUserPrompt', () => {
  it('makes the core offer and lead magnet variants do different jobs', () => {
    const coreOffer = buildInitialUserPrompt(baseLead, 'mckenna')
    const leadMagnet = buildInitialUserPrompt(baseLead, 'hormozi', 'Offer the AI Security Playbook')

    expect(coreOffer).toContain('OFFER MODE: CORE SECURITY OFFER')
    expect(coreOffer).toContain("offers Pigeon's hands-on security work")
    expect(leadMagnet).toContain('OFFER MODE: LEAD MAGNET')
    expect(leadMagnet).toContain('AI Security Playbook')
    expect(leadMagnet).toContain('Do not pretend it already exists')
  })
})

describe('generateInitialOutreach', () => {
  beforeEach(() => {
    mockGenerateJSON.mockReset()
  })

  it('scores initial variants against the normalized copy the user sees', async () => {
    mockGenerateJSON
      .mockResolvedValueOnce({ subject: 'resident repair agent — trust', body: bodyWithNormalizedDash })
      .mockResolvedValueOnce({ subject: 'resident repair agent — checklist', body: bodyWithNormalizedDash })

    const result = await generateInitialOutreach(baseLead)

    expect(result.mckenna.subject).toBe('resident repair agent, trust')
    expect(result.mckenna.body).toContain('tricked, and how to prevent each one')
    expect(result.mckenna.quality).toBeDefined()
    expect(result.mckenna.quality?.issues).not.toContain('Contains em dashes. Use commas or periods.')
    expect(result.mckenna.wordCount).toBe(result.mckenna.body.trim().split(/\s+/).length)
    expect(result.hormozi.quality).toBeDefined()
    expect(result.hormozi.quality?.issues).not.toContain('Contains em dashes. Use commas or periods.')
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
