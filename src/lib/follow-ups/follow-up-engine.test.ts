import { describe, expect, it } from 'vitest';
import type { Lead, LeadEmail, PipelineStage, Priority } from '@/types/leads';
import {
  computeFollowUp,
  filterFollowUps,
  getFollowUpCounts,
  sortFollowUps,
  type FollowUpItem,
} from './follow-up-engine';

const NOW = new Date('2026-05-03T12:00:00Z').getTime();

function daysAgo(days: number) {
  return new Date(NOW - days * 86_400_000).toISOString();
}

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: overrides.id ?? 'lead-1',
    user_id: 'user-1',
    type: 'customer',
    company_name: 'Rocoto Prospect',
    product_name: null,
    fund_name: null,
    contact_name: 'Avery Buyer',
    contact_title: 'CEO',
    contact_email: 'avery@example.com',
    contact_twitter: null,
    contact_linkedin: null,
    contact_phone: null,
    company_description: 'AI sales platform',
    attack_surface_notes: null,
    investment_thesis_notes: null,
    personal_details: null,
    smykm_hooks: ['recent launch'],
    research_sources: [],
    stage: 'researched',
    source: null,
    priority: 'medium',
    notes: null,
    last_contacted_at: null,
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
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

function makeEmail(overrides: Partial<LeadEmail> = {}): LeadEmail {
  return {
    id: overrides.id ?? 'email-1',
    lead_id: overrides.lead_id ?? 'lead-1',
    user_id: 'user-1',
    email_type: overrides.email_type ?? 'initial',
    cta_type: null,
    subject: 'Quick idea',
    body: 'Hello',
    sent_at: overrides.sent_at ?? daysAgo(4),
    replied_at: overrides.replied_at ?? null,
    reply_content: null,
    created_at: overrides.created_at ?? daysAgo(4),
    updated_at: overrides.updated_at ?? daysAgo(4),
    direction: overrides.direction ?? 'outbound',
    gmail_message_id: null,
    gmail_thread_id: null,
    from_address: null,
    to_address: null,
    ...overrides,
  };
}

function makeItem(id: string, suggestedType: FollowUpItem['suggestedType'], urgency: FollowUpItem['urgency'], overrides: Partial<Lead> = {}): FollowUpItem {
  const lead = makeLead({
    id,
    contact_name: id,
    stage: 'follow_up',
    icp_score: null,
    priority: 'medium',
    ...overrides,
  });

  return {
    lead,
    lastEmail: null,
    daysSinceLastContact: 1,
    suggestedAction: 'Action',
    suggestedType,
    suggestedChannel: 'email',
    urgency,
    sequenceDay: 'Day 4',
    outboundCount: 1,
    inboundCount: 0,
  };
}

describe('follow-up engine', () => {
  it('suggests research before outreach when a researched lead lacks SMYKM context', () => {
    const result = computeFollowUp(makeLead({ company_description: null, smykm_hooks: [], created_at: daysAgo(2) }), [], NOW);

    expect(result?.suggestedType).toBe('run_research');
    expect(result?.urgency).toBe('overdue');
    expect(result?.sequenceDay).toBe('New Lead');
  });

  it('does not suggest initial outreach for researched leads that already have outbound email', () => {
    const result = computeFollowUp(makeLead(), [makeEmail()], NOW);

    expect(result).toBeNull();
  });

  it('prioritizes a fresh inbound reply unless a newer outbound response already exists', () => {
    const repliedLead = makeLead({ stage: 'replied', last_inbound_at: daysAgo(2) });

    expect(computeFollowUp(repliedLead, [
      makeEmail({ id: 'inbound', direction: 'inbound', created_at: daysAgo(2), sent_at: null, replied_at: daysAgo(2) }),
    ], NOW)?.suggestedType).toBe('reply_needed');

    expect(computeFollowUp(repliedLead, [
      makeEmail({ id: 'outbound', direction: 'outbound', created_at: daysAgo(1), sent_at: daysAgo(1) }),
      makeEmail({ id: 'inbound', direction: 'inbound', created_at: daysAgo(2), sent_at: null, replied_at: daysAgo(2) }),
    ], NOW)).toBeNull();
  });

  it('chooses the next cold sequence step from outbound count and wait days', () => {
    const lead = makeLead({ stage: 'email_sent' });

    const result = computeFollowUp(lead, [makeEmail({ sent_at: daysAgo(4), created_at: daysAgo(4) })], NOW);

    expect(result?.suggestedType).toBe('follow_up_1');
    expect(result?.urgency).toBe('due_today');
    expect(result?.outboundCount).toBe(1);
  });

  it('suppresses cold sequence steps before the one-day preview window', () => {
    const lead = makeLead({ stage: 'email_sent' });

    expect(computeFollowUp(lead, [makeEmail({ sent_at: daysAgo(1), created_at: daysAgo(1) })], NOW)).toBeNull();
  });

  it('sorts high-ICP leads ahead of lower-ICP urgent work for closing focus', () => {
    const items = [
      makeItem('urgent-low-icp', 'reply_needed', 'overdue', { icp_score: 40 }),
      makeItem('high-icp-cold', 'follow_up_1', 'due_today', { icp_score: 85 }),
      makeItem('medium', 'follow_up_1', 'overdue', { icp_score: 60 }),
    ];

    expect(sortFollowUps(items).map(item => item.lead.id)).toEqual(['high-icp-cold', 'urgent-low-icp', 'medium']);
    expect(items.map(item => item.lead.id)).toEqual(['urgent-low-icp', 'high-icp-cold', 'medium']);
  });

  it('filters and counts urgent, new-lead, and cold-sequence buckets consistently', () => {
    const items = [
      makeItem('reply', 'reply_needed', 'overdue'),
      makeItem('research', 'run_research', 'due_today'),
      makeItem('cold', 'follow_up_2', 'upcoming'),
    ];

    expect(filterFollowUps(items, 'urgent').map(i => i.lead.id)).toEqual(['reply']);
    expect(filterFollowUps(items, 'new_leads').map(i => i.lead.id)).toEqual(['research']);
    expect(filterFollowUps(items, 'cold_sequence').map(i => i.lead.id)).toEqual(['cold']);
    expect(getFollowUpCounts(items)).toMatchObject({
      overdue: 1,
      dueToday: 1,
      urgent: 1,
      newLeads: 1,
      coldSequence: 1,
    });
  });
});
