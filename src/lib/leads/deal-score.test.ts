import { describe, expect, it } from 'vitest';
import type { Lead } from '@/types/leads';
import { getDealScore, getDealScoreBadge } from './deal-score';

const now = new Date('2026-05-21T12:00:00Z');

function lead(overrides: Partial<Lead>): Lead {
  return {
    id: overrides.id ?? 'lead-1',
    user_id: 'user-1',
    type: 'customer',
    company_name: 'Acme',
    product_name: null,
    fund_name: null,
    contact_name: 'Avery Buyer',
    contact_title: null,
    contact_email: 'avery@example.com',
    contact_twitter: null,
    contact_linkedin: null,
    contact_phone: null,
    company_description: null,
    attack_surface_notes: null,
    investment_thesis_notes: null,
    personal_details: null,
    smykm_hooks: [],
    research_sources: [],
    stage: 'researched',
    source_type: 'manual',
    source: null,
    lead_token: null,
    priority: 'medium',
    notes: null,
    last_contacted_at: null,
    created_at: '2026-05-01T12:00:00Z',
    updated_at: '2026-05-20T12:00:00Z',
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
  };
}

describe('getDealScore', () => {
  it('identifies close-ready replies as hot deals with explainable reasons', () => {
    const result = getDealScore(lead({
      stage: 'replied',
      priority: 'high',
      icp_score: 92,
      smykm_hooks: ['Hiring revops', 'SOC2 deadline'],
      research_sources: [{ url: 'https://example.com', title: 'Funding', detail: 'Raised Series A' }],
      company_website: 'https://acme.com',
      contact_linkedin: 'https://linkedin.com/in/avery',
      last_inbound_at: '2026-05-21T09:00:00Z',
      last_outbound_at: '2026-05-20T12:00:00Z',
      conversation_signals: [{
        type: 'action_needed',
        signal: 'Asked for pricing',
        source: 'gmail',
        detected_at: '2026-05-21T09:05:00Z',
      }],
    }), now);

    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.tier).toBe('hot');
    expect(result.reasons).toContain('Warm reply needs action');
    expect(result.reasons).toContain('Strong ICP fit');
  });

  it('penalizes stale no-response leads so sellers do not chase dead pipeline', () => {
    const result = getDealScore(lead({
      stage: 'no_response',
      priority: 'low',
      icp_score: 82,
      updated_at: '2026-04-01T12:00:00Z',
      last_outbound_at: '2026-04-01T12:00:00Z',
      total_emails_out: 4,
    }), now);

    expect(result.score).toBeLessThan(45);
    expect(result.tier).toBe('nurture');
    expect(result.reasons).toContain('No response after sequence');
    expect(result.reasons).toContain('Stale for 50 days');
  });

  it('sorts the active pipeline ahead of researched-only leads with the same ICP', () => {
    const researched = getDealScore(lead({ stage: 'researched', icp_score: 75 }), now);
    const meeting = getDealScore(lead({ stage: 'meeting_booked', icp_score: 75, last_contacted_at: '2026-05-20T12:00:00Z' }), now);

    expect(meeting.score).toBeGreaterThan(researched.score);
    expect(meeting.reasons).toContain('Meeting momentum');
  });
});

describe('getDealScoreBadge', () => {
  it('returns accessible badge copy for the score', () => {
    expect(getDealScoreBadge(91)).toEqual({ label: 'Hot', className: expect.stringContaining('emerald') });
    expect(getDealScoreBadge(68)).toEqual({ label: 'Warm', className: expect.stringContaining('blue') });
    expect(getDealScoreBadge(42)).toEqual({ label: 'Nurture', className: expect.stringContaining('zinc') });
  });
});
