import { describe, expect, it } from 'vitest'
import { PIPELINE_STAGES, type Lead } from '@/types/leads'
import { groupLeadsByStage } from './lead-pipeline-board'

function lead(id: string, stage: Lead['stage']): Lead {
  return {
    id,
    stage,
    user_id: 'user-1',
    type: 'customer',
    company_name: `Company ${id}`,
    product_name: null,
    fund_name: null,
    contact_name: `Contact ${id}`,
    contact_title: null,
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
    source_type: 'manual',
    source: null,
    lead_token: null,
    priority: 'medium',
    notes: null,
    last_contacted_at: null,
    created_at: '2026-06-02T12:00:00Z',
    updated_at: '2026-06-02T12:00:00Z',
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
  }
}

describe('pipeline board helpers', () => {
  it('groups leads by stage in a single pass while preserving each column order', () => {
    const grouped = groupLeadsByStage([
      lead('a', 'follow_up'),
      lead('b', 'researched'),
      lead('c', 'follow_up'),
      lead('d', 'closed_won'),
    ])

    expect(grouped.follow_up.map((l) => l.id)).toEqual(['a', 'c'])
    expect(grouped.researched.map((l) => l.id)).toEqual(['b'])
    expect(grouped.closed_won.map((l) => l.id)).toEqual(['d'])
    expect(PIPELINE_STAGES.every((stage) => Array.isArray(grouped[stage]))).toBe(true)
  })
})
