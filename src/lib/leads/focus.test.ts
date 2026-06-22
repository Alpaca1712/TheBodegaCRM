import { describe, expect, it } from 'vitest';
import type { Lead } from '@/types/leads';
import { getLeadFocusItems } from './focus';

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

describe('getLeadFocusItems', () => {
  it('prioritizes leads with action-needed replies over routine follow-ups', () => {
    const items = getLeadFocusItems([
      lead({
        id: 'follow-up',
        contact_name: 'Follow Up',
        stage: 'follow_up',
        priority: 'high',
        last_outbound_at: '2026-05-15T12:00:00Z',
        updated_at: '2026-05-15T12:00:00Z',
      }),
      lead({
        id: 'reply',
        contact_name: 'Warm Reply',
        stage: 'email_sent',
        last_inbound_at: '2026-05-21T09:00:00Z',
        last_outbound_at: '2026-05-20T12:00:00Z',
        conversation_signals: [{
          type: 'action_needed',
          signal: 'Asked for next steps',
        source: 'gmail',
          detected_at: '2026-05-21T09:05:00Z',
        }],
      }),
    ], now);

    expect(items[0]).toMatchObject({ reason: 'needs_reply' });
    expect(items[0].lead.id).toBe('reply');
  });

  it('surfaces high-ICP researched leads ready for outbound work', () => {
    const items = getLeadFocusItems([
      lead({ id: 'low-fit', icp_score: 45 }),
      lead({ id: 'best-fit', stage: 'email_drafted', icp_score: 88, priority: 'high' }),
    ], now);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ reason: 'high_icp_ready' });
    expect(items[0].description).toContain('88/100 ICP fit');
  });

  it('limits focus items and excludes closed deals', () => {
    const items = getLeadFocusItems([
      lead({ id: 'closed', stage: 'closed_won', last_inbound_at: '2026-05-21T10:00:00Z' }),
      lead({ id: 'stale-1', updated_at: '2026-04-01T12:00:00Z' }),
      lead({ id: 'stale-2', updated_at: '2026-04-02T12:00:00Z' }),
      lead({ id: 'stale-3', updated_at: '2026-04-03T12:00:00Z' }),
    ], now, 2);

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.lead.id)).not.toContain('closed');
  });
});
