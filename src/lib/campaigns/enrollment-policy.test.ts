import { describe, expect, it } from 'vitest'
import {
  ActiveCampaignConflictError,
  isActiveCampaignConflictError,
  isActiveCampaignUniqueViolation,
} from './enrollment-policy'

describe('campaign enrollment policy', () => {
  it('returns an actionable active-campaign conflict', () => {
    const error = new ActiveCampaignConflictError({
      enrollmentId: 'enrollment-1',
      campaignId: 'campaign-1',
      campaignName: 'Website applications',
      stageKey: 'application_completed',
    })

    expect(isActiveCampaignConflictError(error)).toBe(true)
    expect(error.message).toContain('Website applications')
    expect(error.message).toContain('Nurture / Lost')
    expect(error.conflict.campaignId).toBe('campaign-1')
  })

  it('recognizes only the active enrollment database constraint', () => {
    expect(isActiveCampaignUniqueViolation({
      code: '23505',
      message: 'duplicate key value violates unique constraint "campaign_enrollments_one_active_per_lead"',
    })).toBe(true)
    expect(isActiveCampaignUniqueViolation({ code: '23505', message: 'another constraint' })).toBe(false)
  })
})
