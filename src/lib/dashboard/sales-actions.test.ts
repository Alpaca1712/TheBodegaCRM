import { describe, expect, it } from 'vitest'
import { buildSalesActionPlan } from './sales-actions'

const baseLead = {
  id: 'lead-1',
  contact_name: 'Ari Founder',
  company_name: 'Acme AI',
  type: 'customer',
  stage: 'researched',
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

  it('surfaces review drafts with high priority', () => {
    const actions = buildSalesActionPlan({
      leads: [
        {
          ...baseLead,
          id: 'lead-drafted',
          stage: 'email_drafted',
          icp_score: 80,
        },
        {
          ...baseLead,
          id: 'lead-researched',
          icp_score: 95,
        }
      ],
      outboundEmails: [],
      inboundEmails: [],
      now: new Date('2026-05-06T12:00:00Z'),
    })

    expect(actions[0].category).toBe('review')
    expect(actions[0].priority).toBe('high')
    expect(actions[0].score).toBeGreaterThan(actions[1].score)
  })

  it('detects meeting prep when battle card is missing', () => {
    const actions = buildSalesActionPlan({
      leads: [
        {
          ...baseLead,
          id: 'lead-meeting',
          stage: 'meeting_booked',
          battle_card: null,
        }
      ],
      outboundEmails: [],
      inboundEmails: [],
      now: new Date('2026-05-06T12:00:00Z'),
    })

    expect(actions[0].category).toBe('prep')
    expect(actions[0].title).toContain('Prep meeting')
  })

  it('triggers research for leads without hooks', () => {
    const actions = buildSalesActionPlan({
      leads: [
        {
          ...baseLead,
          id: 'lead-no-hooks',
          stage: 'researched',
          smykm_hooks: [],
          icp_score: 90,
        }
      ],
      outboundEmails: [],
      inboundEmails: [],
      now: new Date('2026-05-06T12:00:00Z'),
    })

    expect(actions[0].category).toBe('research')
    expect(actions[0].ctaLabel).toBe('Research')
  })

  it('differentiates follow-up types (Bump, Value Drop, Channel Switch)', () => {
    const leads = [
      {
        ...baseLead,
        id: 'lead-bump',
        stage: 'email_sent',
        total_emails_out: 1,
        last_outbound_at: '2026-05-01T12:00:00Z',
      },
      {
        ...baseLead,
        id: 'lead-value',
        stage: 'email_sent',
        total_emails_out: 2,
        last_outbound_at: '2026-05-01T12:00:00Z',
      },
      {
        ...baseLead,
        id: 'lead-switch',
        stage: 'email_sent',
        total_emails_out: 3,
        last_outbound_at: '2026-05-01T12:00:00Z',
      },
    ]

    const actions = buildSalesActionPlan({
      leads,
      outboundEmails: [],
      inboundEmails: [],
      now: new Date('2026-05-06T12:00:00Z'),
    })

    const bump = actions.find(a => a.leadId === 'lead-bump')
    const value = actions.find(a => a.leadId === 'lead-value')
    const sw = actions.find(a => a.leadId === 'lead-switch')

    expect(bump?.title).toContain('Bump')
    expect(value?.title).toContain('Value Drop')
    expect(sw?.title).toContain('Channel Switch')
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
