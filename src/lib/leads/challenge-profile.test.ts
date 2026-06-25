import { describe, expect, it } from 'vitest'
import {
  buildLeadProfilePatchFromChallenge,
  getLeadChallengeProfile,
  normalizeLandingChallengeProfile,
  shouldTreatNotesAsChallengeProfile,
} from './challenge-profile'
import type { Lead } from '@/types/leads'

function lead(overrides: Partial<Lead>): Lead {
  return {
    id: 'lead-1',
    user_id: 'user-1',
    type: 'customer',
    company_name: 'BlockBuster',
    product_name: null,
    fund_name: null,
    contact_name: 'Daniel',
    contact_title: null,
    contact_email: 'daniel@example.com',
    contact_twitter: null,
    contact_linkedin: null,
    contact_phone: null,
    company_description: null,
    attack_surface_notes: null,
    investment_thesis_notes: null,
    personal_details: null,
    smykm_hooks: [],
    research_sources: [],
    stage: 'follow_up',
    source_type: 'website',
    source: 'rocoto_pentest_challenge',
    lead_token: null,
    priority: 'medium',
    notes: null,
    last_contacted_at: null,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-25T00:00:00Z',
    account_snapshot: null,
    snapshot_generated_at: null,
    risk_score: null,
    risk_factors: [],
    risk_assessed_at: null,
    contact_photo_url: null,
    company_website: null,
    company_logo_url: null,
    org_chart: [],
    icp_score: null,
    icp_reasons: [],
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
    ...overrides,
  }
}

describe('challenge profile normalization', () => {
  it('maps landing application metadata into structured lead profile fields', () => {
    const profile = normalizeLandingChallengeProfile({
      metadata: {
        application: {
          pentest_requirements: 'Agent handles customer billing questions',
          authority: 'Founder, CEO, or executive sponsor',
          lead_score: 92,
          fit_reasons: ['High agent exposure'],
        },
      },
      notes: 'Submitted via rocoto pentest challenge',
    })

    const patch = buildLeadProfilePatchFromChallenge(profile)

    expect(patch).toMatchObject({
      icp_score: 92,
      priority: 'high',
      attack_surface_notes: expect.stringContaining('Agent handles customer billing questions'),
    })
    expect(patch.icp_reasons).toEqual(expect.arrayContaining(['High agent exposure', 'Authority: Founder, CEO, or executive sponsor']))
    expect(shouldTreatNotesAsChallengeProfile('Lead score: 92/100 (High fit)')).toBe(true)
  })

  it('surfaces older challenge submissions that were saved into notes', () => {
    const profile = getLeadChallengeProfile(lead({
      notes: [
        'Submitted via rocoto pentest challenge on 2026-06-21T19:56:21.102Z',
        'Photy requirements',
        'authority: Founder, CEO, or executive sponsor',
        'Lead score: 92/100 (High fit)',
      ].join('\n'),
    }))

    expect(profile?.requirements).toBe('Photy requirements')
    expect(profile?.authority).toBe('Founder, CEO, or executive sponsor')
    expect(profile?.score).toBe(92)
    expect(profile?.scoreLabel).toBe('High fit')
  })
})
