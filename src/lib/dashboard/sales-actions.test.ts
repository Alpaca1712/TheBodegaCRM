import { describe, expect, it } from 'vitest'
import { buildSalesActionPlan } from './sales-actions'
import { PipelineStage } from '@/types/leads'

const baseLead = {
  id: 'lead-1',
  contact_name: 'Ari Founder',
  company_name: 'Acme AI',
  type: 'customer' as const,
  stage: 'researched' as PipelineStage,
  icp_score: 85,
  last_contacted_at: null,
  last_inbound_at: null,
  last_outbound_at: null,
  updated_at: '2026-05-06T12:00:00Z',
  conversation_next_step: null,
  conversation_signals: [],
  smykm_hooks: [],
  company_description: null,
  battle_card: null,
  investor_memo: null,
}

describe('buildSalesActionPlan', () => {
  it('prioritizes replied leads with explicit conversation next steps', () => {
    const actions = buildSalesActionPlan({
      leads: [
        {
          ...baseLead,
          id: 'lead-replied',
          contact_name: 'Riley Buyer',
          company_name: 'Rocoto Prospect',
          stage: 'replied',
          icp_score: 72,
          conversation_next_step: 'Send technical validation plan',
          last_inbound_at: '2026-05-06T10:00:00Z',
          updated_at: '2026-05-06T10:00:00Z',
        },
        { ...baseLead, smykm_hooks: ['Hook 1'] },
      ],
      outboundEmails: [],
      inboundEmails: [],
      now: new Date('2026-05-06T12:00:00Z'),
    })

    expect(actions[0]).toMatchObject({
      leadId: 'lead-replied',
      priority: 'critical',
      category: 'reply',
      title: 'Reply to Riley Buyer',
      ctaHref: '/leads/lead-replied',
    })
    expect(actions[0].recommendedAction).toBe('Send technical validation plan')
  })

  it('surfaces ready-to-review drafts before prospecting', () => {
    const actions = buildSalesActionPlan({
      leads: [
        { ...baseLead, id: 'lead-prospect', smykm_hooks: ['Hook 1'] },
        {
          ...baseLead,
          id: 'lead-draft',
          contact_name: 'Dana Draft',
          stage: 'email_drafted',
          icp_score: 70,
        },
      ],
      outboundEmails: [],
      inboundEmails: [],
      now: new Date('2026-05-06T12:00:00Z'),
    })

    expect(actions[0]).toMatchObject({
      leadId: 'lead-draft',
      priority: 'critical',
      category: 'review',
      ctaLabel: 'Review',
    })
  })

  it('suggests research for high-ICP leads without hooks', () => {
    const actions = buildSalesActionPlan({
      leads: [
        {
          ...baseLead,
          id: 'lead-needs-research',
          icp_score: 90,
          smykm_hooks: [],
          company_description: null,
        },
      ],
      outboundEmails: [],
      inboundEmails: [],
      now: new Date('2026-05-06T12:00:00Z'),
    })

    expect(actions[0]).toMatchObject({
      leadId: 'lead-needs-research',
      category: 'research',
      priority: 'high',
      ctaLabel: 'Run Research',
    })
  })

  it('suggests meeting prep for booked meetings without battle cards', () => {
    const actions = buildSalesActionPlan({
      leads: [
        {
          ...baseLead,
          id: 'lead-meeting',
          stage: 'meeting_booked',
          battle_card: null,
        },
      ],
      outboundEmails: [],
      inboundEmails: [],
      now: new Date('2026-05-06T12:00:00Z'),
    })

    expect(actions[0]).toMatchObject({
      leadId: 'lead-meeting',
      category: 'meeting_prep',
      priority: 'critical',
      ctaLabel: 'Run Prep',
    })
  })

  it('suggests investor memos for booked investor meetings that already have prep', () => {
    const actions = buildSalesActionPlan({
      leads: [
        {
          ...baseLead,
          id: 'lead-booked-investor',
          type: 'investor',
          stage: 'meeting_booked',
          battle_card: { company_overview: 'Ready' },
          investor_memo: null,
        },
      ],
      outboundEmails: [],
      inboundEmails: [],
      now: new Date('2026-05-06T12:00:00Z'),
    })

    expect(actions[0]).toMatchObject({
      leadId: 'lead-booked-investor',
      category: 'investor_memo',
      ctaLabel: 'Generate memo',
    })
  })

  it('suggests investor memos after investor meetings', () => {
    const actions = buildSalesActionPlan({
      leads: [
        {
          ...baseLead,
          id: 'lead-investor',
          type: 'investor',
          stage: 'meeting_held',
          investor_memo: null,
        },
      ],
      outboundEmails: [],
      inboundEmails: [],
      now: new Date('2026-05-06T12:00:00Z'),
    })

    expect(actions[0]).toMatchObject({
      leadId: 'lead-investor',
      category: 'investor_memo',
      ctaLabel: 'Generate memo',
    })
  })

  it('upgrades prospecting to high priority if positive signals exist', () => {
    const actions = buildSalesActionPlan({
      leads: [
        {
          ...baseLead,
          id: 'lead-hot',
          smykm_hooks: ['Hook 1'],
          conversation_signals: [{ type: 'positive', detected_at: '2026-05-06T11:00:00Z', signal: 'Interested', source: 'email' }],
        },
      ],
      outboundEmails: [],
      inboundEmails: [],
      now: new Date('2026-05-06T12:00:00Z'),
    })

    expect(actions[0]).toMatchObject({
      leadId: 'lead-hot',
      category: 'prospecting',
      priority: 'high',
    })
    expect(actions[0].score).toBeGreaterThan(650 + 85)
  })

  it('surfaces overdue follow-ups correctly', () => {
    const actions = buildSalesActionPlan({
      leads: [
        {
          ...baseLead,
          id: 'lead-followup',
          contact_name: 'Morgan Ops',
          company_name: 'Followup Co',
          stage: 'email_sent',
          icp_score: 70,
          last_outbound_at: '2026-04-30T12:00:00Z',
          last_contacted_at: '2026-04-30T12:00:00Z',
        },
        {
          ...baseLead,
          id: 'lead-high-icp',
          contact_name: 'Casey CEO',
          company_name: 'Perfect ICP',
          stage: 'researched',
          icp_score: 96,
          smykm_hooks: ['Hook 1'],
        },
      ],
      outboundEmails: [],
      inboundEmails: [],
      now: new Date('2026-05-06T12:00:00Z'),
    })

    expect(actions.map((a) => a.leadId).slice(0, 2)).toEqual(['lead-followup', 'lead-high-icp'])
    expect(actions[0]).toMatchObject({ category: 'follow_up', priority: 'high' })
    expect(actions[1]).toMatchObject({ category: 'prospecting', priority: 'high' })
  })

  it('limits the action plan to the strongest five actions', () => {
    const leads = Array.from({ length: 8 }, (_, index) => ({
      ...baseLead,
      id: `lead-${index}`,
      contact_name: `Lead ${index}`,
      icp_score: 90 - index,
      smykm_hooks: ['Hook 1'],
    }))

    const actions = buildSalesActionPlan({
      leads,
      outboundEmails: [],
      inboundEmails: [],
      now: new Date('2026-05-06T12:00:00Z'),
    })

    expect(actions).toHaveLength(5)
    expect(actions.map((a) => a.leadId)).toEqual(['lead-0', 'lead-1', 'lead-2', 'lead-3', 'lead-4'])
  })
})
