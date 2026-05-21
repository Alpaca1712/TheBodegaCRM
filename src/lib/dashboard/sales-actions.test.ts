import { describe, expect, it } from 'vitest'
import { buildSalesActionPlan } from './sales-actions'

const baseLead = {
  id: 'lead-1',
  contact_name: 'Ari Founder',
  company_name: 'Acme AI',
  type: 'customer' as const,
  stage: 'researched' as const,
  icp_score: 85,
  last_contacted_at: null,
  last_inbound_at: null,
  last_outbound_at: null,
  updated_at: '2026-05-06T12:00:00Z',
  conversation_next_step: null,
  conversation_signals: [],
  smykm_hooks: ['Hook 1'],
  company_description: 'AI Company',
  battle_card: null,
  investor_memo: null,
}

describe('buildSalesActionPlan', () => {
  it('prioritizes replied leads (critical)', () => {
    const actions = buildSalesActionPlan({
      leads: [
        {
          ...baseLead,
          id: 'lead-replied',
          contact_name: 'Riley Buyer',
          stage: 'replied',
          last_inbound_at: '2026-05-06T10:00:00Z',
        },
        baseLead,
      ],
      outboundEmails: [],
      inboundEmails: [],
      now: new Date('2026-05-06T12:00:00Z'),
    })

    expect(actions[0]).toMatchObject({
      leadId: 'lead-replied',
      category: 'reply',
      priority: 'critical',
    })
  })

  it('suggests review for email_drafted (high)', () => {
    const actions = buildSalesActionPlan({
      leads: [
        {
          ...baseLead,
          id: 'lead-drafted',
          stage: 'email_drafted',
        },
      ],
      outboundEmails: [],
      inboundEmails: [],
      now: new Date('2026-05-06T12:00:00Z'),
    })

    expect(actions[0]).toMatchObject({
      leadId: 'lead-drafted',
      category: 'review',
      priority: 'high',
    })
  })

  it('suggests meeting_prep for booked meetings without battle cards', () => {
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
      priority: 'high',
    })
  })

  it('suggests research for researched leads without hooks', () => {
    const actions = buildSalesActionPlan({
      leads: [
        {
          ...baseLead,
          id: 'lead-research',
          stage: 'researched',
          smykm_hooks: [],
        },
      ],
      outboundEmails: [],
      inboundEmails: [],
      now: new Date('2026-05-06T12:00:00Z'),
    })

    expect(actions[0]).toMatchObject({
      leadId: 'lead-research',
      category: 'research',
    })
  })

  it('suggests investor_memo for investors missing memos', () => {
    const actions = buildSalesActionPlan({
      leads: [
        {
          ...baseLead,
          id: 'lead-investor',
          type: 'investor',
          stage: 'researched',
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
    })
  })

  it('deduplicates actions for the same lead by score', () => {
    // Lead could need follow-up and memo. Memo score (840+icp) vs Follow-up score (820+icp+boost)
    const actions = buildSalesActionPlan({
      leads: [
        {
          ...baseLead,
          id: 'lead-multi',
          type: 'investor',
          stage: 'email_sent',
          last_outbound_at: '2026-05-01T12:00:00Z',
          last_contacted_at: '2026-05-01T12:00:00Z',
          investor_memo: null,
          icp_score: 90,
        },
      ],
      outboundEmails: [],
      inboundEmails: [],
      now: new Date('2026-05-06T12:00:00Z'),
    })

    // Score for memo: 840 + 90 = 930
    // Score for follow-up: 820 + 90 + 5*12 = 970
    // Follow-up should win
    expect(actions).toHaveLength(1)
    expect(actions[0].category).toBe('follow_up')
  })

  it('limits the action plan to the strongest five actions', () => {
    const leads = Array.from({ length: 10 }, (_, index) => ({
      ...baseLead,
      id: `lead-${index}`,
      contact_name: `Lead ${index}`,
      icp_score: 100 - index,
      stage: 'replied' as const,
    }))

    const actions = buildSalesActionPlan({
      leads,
      outboundEmails: [],
      inboundEmails: [],
      now: new Date('2026-05-06T12:00:00Z'),
    })

    expect(actions).toHaveLength(5)
  })
})
