export interface ActiveCampaignEnrollmentConflict {
  enrollmentId: string
  campaignId: string
  campaignName: string
  stageKey: string
}

export class ActiveCampaignConflictError extends Error {
  readonly code = 'ACTIVE_CAMPAIGN_CONFLICT'
  readonly conflict: ActiveCampaignEnrollmentConflict

  constructor(conflict: ActiveCampaignEnrollmentConflict) {
    super(
      `This lead is already active in ${conflict.campaignName}. Move them to Nurture / Lost or finish that campaign before adding them here.`,
    )
    this.name = 'ActiveCampaignConflictError'
    this.conflict = conflict
  }
}

export function isActiveCampaignConflictError(error: unknown): error is ActiveCampaignConflictError {
  return error instanceof ActiveCampaignConflictError
}

export function isActiveCampaignUniqueViolation(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const value = error as { code?: unknown; message?: unknown }
  return value.code === '23505'
    && typeof value.message === 'string'
    && value.message.includes('campaign_enrollments_one_active_per_lead')
}
