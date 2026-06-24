import { describe, expect, it } from 'vitest';
import type { Lead } from '@/types/leads';
import { getDealReadiness } from './deal-readiness';

const baseLead: Lead = {
  id: 'lead-1',
  user_id: 'user-1',
  type: 'customer',
  company_name: 'Rocoto Prospect',
  product_name: null,
  fund_name: null,
  contact_name: 'Ada Lovelace',
  contact_title: 'VP Engineering',
  contact_email: null,
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
  created_at: '2026-06-11T12:00:00Z',
  updated_at: '2026-06-11T12:00:00Z',
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
};

describe('getDealReadiness', () => {
  it('marks a well-researched active lead as ready to pitch', () => {
    const result = getDealReadiness({
      ...baseLead,
      contact_email: 'ada@example.com',
      company_website: 'https://example.com',
      smykm_hooks: ['Recently launched an AI assistant for support teams'],
      icp_score: 84,
      stage: 'email_sent',
      total_emails_out: 1,
      conversation_signals: [{
        type: 'positive',
        signal: 'Asked for pricing details',
        source: 'gmail',
        detected_at: '2026-06-11T12:00:00Z',
      }],
    });

    expect(result.verdict).toBe('ready');
    expect(result.score).toBe(100);
    expect(result.completed).toBe(result.total);
    expect(result.nextMissingItem).toBeNull();
  });

  it('prioritizes critical missing contact and personalization gaps', () => {
    const result = getDealReadiness({
      ...baseLead,
      company_website: 'https://example.com',
      icp_reasons: ['Security team matches Rocoto ICP'],
    });

    expect(result.verdict).toBe('blocked');
    expect(result.nextMissingItem?.impact).toBe('critical');
    expect(['contactable', 'personalized-angle']).toContain(result.nextMissingItem?.id);
    expect(result.items.find((item) => item.id === 'contactable')?.met).toBe(false);
    expect(result.items.find((item) => item.id === 'qualified-fit')?.met).toBe(true);
  });

  it('recognizes LinkedIn, research notes, next steps, and Gmail sync as partial readiness', () => {
    const result = getDealReadiness({
      ...baseLead,
      contact_linkedin: 'https://linkedin.com/in/ada',
      company_description: 'Enterprise agent platform',
      conversation_next_step: 'Send a short intro asking about security review workflows',
      total_emails_in: 1,
    });

    expect(result.verdict).toBe('almost');
    expect(result.score).toBeGreaterThanOrEqual(55);
    expect(result.items.find((item) => item.id === 'contactable')?.met).toBe(true);
    expect(result.items.find((item) => item.id === 'outreach-motion')?.met).toBe(true);
    expect(result.nextMissingItem?.id).toBe('qualified-fit');
  });
});
