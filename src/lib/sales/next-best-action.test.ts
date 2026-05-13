import { describe, expect, it } from 'vitest';
import { buildNextBestAction } from './next-best-action';
import type { Lead, LeadEmail, LeadInteraction } from '@/types/leads';

const baseLead = (overrides: Partial<Lead> = {}): Lead => ({
  id: 'lead-1',
  user_id: 'user-1',
  type: 'customer',
  company_name: 'Acme',
  product_name: null,
  fund_name: null,
  contact_name: 'Ari Buyer',
  contact_title: 'VP Revenue',
  contact_email: 'ari@acme.com',
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
  source: null,
  priority: 'medium',
  notes: null,
  last_contacted_at: null,
  created_at: '2026-05-01T12:00:00.000Z',
  updated_at: '2026-05-01T12:00:00.000Z',
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
});

const email = (overrides: Partial<LeadEmail> = {}): LeadEmail => ({
  id: 'email-1',
  lead_id: 'lead-1',
  user_id: 'user-1',
  email_type: 'initial',
  cta_type: null,
  subject: 'hello',
  body: 'body',
  sent_at: '2026-05-07T12:00:00.000Z',
  replied_at: null,
  reply_content: null,
  created_at: '2026-05-07T12:00:00.000Z',
  updated_at: '2026-05-07T12:00:00.000Z',
  direction: 'outbound',
  gmail_message_id: null,
  gmail_thread_id: null,
  from_address: null,
  to_address: null,
  ...overrides,
});

const interaction = (overrides: Partial<LeadInteraction> = {}): LeadInteraction => ({
  id: 'interaction-1',
  lead_id: 'lead-1',
  user_id: 'user-1',
  org_id: null,
  channel: 'phone',
  interaction_type: 'meeting',
  content: 'Discussed pilot scope',
  summary: null,
  ai_summary: null,
  occurred_at: '2026-05-12T13:00:00.000Z',
  created_at: '2026-05-12T13:00:00.000Z',
  ...overrides,
});

describe('buildNextBestAction', () => {
  const now = new Date('2026-05-13T12:00:00.000Z');

  it('prioritizes explicit conversation next steps when a lead has replied', () => {
    const plan = buildNextBestAction({
      lead: baseLead({
        stage: 'replied',
        conversation_next_step: 'Send security review agenda and offer Tuesday demos',
        last_inbound_at: '2026-05-13T10:00:00.000Z',
        total_emails_in: 1,
      }),
      emails: [email({ direction: 'inbound', sent_at: '2026-05-13T10:00:00.000Z' })],
      interactions: [],
      now,
    });

    expect(plan.urgency).toBe('critical');
    expect(plan.primaryAction).toBe('Send security review agenda and offer Tuesday demos');
    expect(plan.targetTab).toBe('emails');
    expect(plan.supportingSignals).toContain('Inbound reply 0 days ago');
  });

  it('calls out overdue follow-up after five quiet days since outbound email', () => {
    const plan = buildNextBestAction({
      lead: baseLead({
        stage: 'email_sent',
        last_outbound_at: '2026-05-07T12:00:00.000Z',
        total_emails_out: 1,
      }),
      emails: [email()],
      interactions: [],
      now,
    });

    expect(plan.urgency).toBe('high');
    expect(plan.primaryAction).toMatch(/Send follow-up/i);
    expect(plan.reason).toContain('6 days since the last outbound email');
    expect(plan.targetTab).toBe('emails');
  });

  it('turns a recent meeting into a post-meeting recap action', () => {
    const plan = buildNextBestAction({
      lead: baseLead({ stage: 'meeting_held', last_outbound_at: null }),
      emails: [],
      interactions: [interaction()],
      now,
    });

    expect(plan.urgency).toBe('critical');
    expect(plan.primaryAction).toMatch(/recap/i);
    expect(plan.reason).toContain('within 24 hours');
    expect(plan.targetTab).toBe('emails');
  });

  it('does not create sales work for closed deals', () => {
    const plan = buildNextBestAction({
      lead: baseLead({ stage: 'closed_won' }),
      emails: [],
      interactions: [],
      now,
    });

    expect(plan.urgency).toBe('none');
    expect(plan.primaryAction).toBe('No active sales action');
    expect(plan.targetTab).toBe('overview');
  });
});
