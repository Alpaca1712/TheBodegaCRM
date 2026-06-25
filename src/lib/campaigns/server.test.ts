import { describe, expect, it } from 'vitest'
import { campaignMetricsFromRows } from './server'

describe('campaignMetricsFromRows', () => {
  it('does not count orphaned events left after a lead delete', () => {
    const metrics = campaignMetricsFromRows(
      [
        { campaign_id: 'campaign-1', stage_key: 'to_send' },
        { campaign_id: 'campaign-1', stage_key: 'meeting_booked' },
      ],
      [
        { campaign_id: 'campaign-1', event_type: 'email_sent', lead_id: 'lead-1', enrollment_id: 'enrollment-1' },
        { campaign_id: 'campaign-1', event_type: 'email_sent', lead_id: null, enrollment_id: null },
        { campaign_id: 'campaign-1', event_type: 'email_replied', lead_id: null, enrollment_id: null },
        { campaign_id: 'campaign-1', event_type: 'application_completed', lead_id: 'lead-2', enrollment_id: null },
        { campaign_id: 'campaign-2', event_type: 'email_sent', lead_id: 'lead-3', enrollment_id: 'enrollment-3' },
      ],
      'campaign-1',
    )

    expect(metrics).toEqual({
      leads_enrolled: 2,
      initial_emails_sent: 1,
      replies: 0,
      lead_magnets_sent: 0,
      applications_completed: 1,
      meetings_booked: 1,
    })
  })
})
