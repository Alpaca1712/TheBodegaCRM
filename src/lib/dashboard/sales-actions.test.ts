import { describe, expect, it } from 'vitest'
import { buildSalesActionPlan } from './sales-actions'

const baseLead = {
  id: 'lead-1',
  contact_name: 'Ari Founder',
  company_name: 'Acme AI',
  type: 'customer',
  stage: 'researched' as const,
  icp_score: 85,
  last_contacted_at: null,
  last_inbound_at: null,
  last_outbound_at: null,
  updated_at: '2026-05-06T12:00:00Z',
  conversation_next_step: null,
  conversation_signals: [],
  smykm_hooks: ['Hook 1'],
  company_description: 'AI security for agents',
  battle_card: null,
  investor_memo: null,
  total_emails_out: 0,
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
        baseLead,
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

  it('prioritizes review draft over follow-ups', () => {
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
          id: 'lead-drafted',
          contact_name: 'Casey CEO',
          company_name: 'Drafted Co',
          stage: 'email_drafted',
          icp_score: 96,
        },
      ],
      outboundEmails: [],
      inboundEmails: [],
      now: new Date('2026-05-06T12:00:00Z'),
    })

    expect(actions[0]).toMatchObject({ category: 'review', leadId: 'lead-drafted' })
    expect(actions[1]).toMatchObject({ category: 'follow_up', leadId: 'lead-followup' })
  })

  it('suggests research for leads missing hooks', () => {
    const actions = buildSalesActionPlan({
      leads: [
        {
          ...baseLead,
          id: 'lead-no-hooks',
          contact_name: 'No Hooks',
          smykm_hooks: [],
          stage: 'researched',
          icp_score: 80,
        },
      ],
      outboundEmails: [],
      inboundEmails: [],
      now: new Date('2026-05-06T12:00:00Z'),
    })

    expect(actions[0]).toMatchObject({
      category: 'research',
      title: 'Research No Hooks',
    })
  })

  it('limits the action plan to the strongest five actions', () => {
    const leads = Array.from({ length: 8 }, (_, index) => ({
      ...baseLead,
      id: `lead-${index}`,
      contact_name: `Lead ${index}`,
      icp_score: 90 - index,
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
