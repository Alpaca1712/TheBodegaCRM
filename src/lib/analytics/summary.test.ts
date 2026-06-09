import { describe, expect, it } from 'vitest'
import { buildAnalyticsSummary } from './summary'

const NOW = new Date('2026-06-09T12:00:00Z')

describe('buildAnalyticsSummary', () => {
  it('computes outreach analytics in indexed passes without changing CRM metrics', () => {
    const summary = buildAnalyticsSummary(
      [
        { id: 'lead-1', type: 'customer', stage: 'replied', source: 'apollo' },
        { id: 'lead-2', type: 'investor', stage: 'meeting_booked', source: 'referral' },
        { id: 'lead-3', type: 'partnership', stage: 'email_drafted', source: null },
        { id: 'lead-4', type: 'customer', stage: 'closed_lost', source: 'apollo' },
      ],
      [
        {
          lead_id: 'lead-1',
          direction: 'outbound',
          cta_type: 'mckenna',
          sent_at: '2026-06-02T12:00:00Z',
          created_at: '2026-06-02T12:00:00Z',
        },
        {
          lead_id: 'lead-1',
          direction: 'inbound',
          cta_type: null,
          sent_at: null,
          created_at: '2026-06-03T12:00:00Z',
        },
        {
          lead_id: 'lead-2',
          direction: 'outbound',
          cta_type: 'hormozi',
          sent_at: '2026-05-27T12:00:00Z',
          created_at: '2026-05-27T12:00:00Z',
        },
        {
          lead_id: 'lead-2',
          direction: 'outbound',
          cta_type: 'hormozi',
          sent_at: '2026-05-29T12:00:00Z',
          created_at: '2026-05-29T12:00:00Z',
        },
        {
          lead_id: 'lead-2',
          direction: 'inbound',
          cta_type: null,
          sent_at: null,
          created_at: '2026-06-04T12:00:00Z',
        },
        {
          lead_id: 'lead-4',
          direction: 'outbound',
          cta_type: 'mckenna',
          sent_at: '2026-06-08T12:00:00Z',
          created_at: '2026-06-08T12:00:00Z',
        },
      ],
      [
        { lead_id: 'lead-1', channel: 'linkedin', occurred_at: '2026-06-02T18:00:00Z' },
        { lead_id: 'lead-2', channel: 'phone', occurred_at: '2026-06-05T12:00:00Z' },
        { lead_id: 'lead-2', channel: 'twitter', occurred_at: '2026-05-30T12:00:00Z' },
      ],
      NOW,
    )

    expect(summary.totalLeads).toBe(4)
    expect(summary.totalOutbound).toBe(4)
    expect(summary.totalInbound).toBe(2)
    expect(summary.leadsContacted).toBe(3)
    expect(summary.leadsWithReplies).toBe(2)
    expect(summary.replyRate).toBeCloseTo(66.67, 1)
    expect(summary.meetingsBooked).toBe(1)
    expect(summary.funnel).toEqual([
      { stage: 'email_sent', count: 3 },
      { stage: 'replied', count: 2 },
      { stage: 'meeting_booked', count: 1 },
      { stage: 'closed_won', count: 0 },
    ])
    expect(summary.replyRateByType.customer).toEqual({ contacted: 2, replied: 1, rate: 50 })
    expect(summary.replyRateByType.investor).toEqual({ contacted: 1, replied: 1, rate: 100 })
    expect(summary.ctaPerformance.mckenna).toEqual({ sent: 2, replied: 1, rate: 50 })
    expect(summary.ctaPerformance.hormozi).toEqual({ sent: 1, replied: 1, rate: 100 })
    expect(summary.avgTouchpointsToReply).toBe(2.5)
    expect(summary.replyDayBuckets).toEqual({ '0-1': 1, '2-3': 0, '4-7': 0, '8-14': 1, '15+': 0 })
    expect(summary.channelPerformance).toEqual([
      { channel: 'email', touchpoints: 4, leadsReached: 3 },
      { channel: 'linkedin', touchpoints: 1, leadsReached: 1 },
      { channel: 'twitter', touchpoints: 1, leadsReached: 1 },
      { channel: 'phone', touchpoints: 1, leadsReached: 1 },
    ])
    expect(summary.weeklyTrend.map(w => w.count)).toEqual([0, 0, 0, 0, 0, 0, 2, 2])
    expect(summary.byType).toEqual({ customers: 2, investors: 1, partnerships: 1 })
    expect(summary.bySource).toEqual([
      { source: 'apollo', count: 2 },
      { source: 'referral', count: 1 },
    ])
  })
})
