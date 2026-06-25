import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockCreateAdminClient,
  mockFrom,
  mockDelete,
  mockEq,
  mockIn,
} = vi.hoisted(() => ({
  mockCreateAdminClient: vi.fn(),
  mockFrom: vi.fn(),
  mockDelete: vi.fn(),
  mockEq: vi.fn(),
  mockIn: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mockCreateAdminClient,
}))

import { deleteLeadCampaignArtifacts } from './delete'

describe('deleteLeadCampaignArtifacts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateAdminClient.mockReturnValue({ from: mockFrom })
    mockFrom.mockReturnValue({ delete: mockDelete })
    mockDelete.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ in: mockIn })
    mockIn.mockResolvedValue({ error: null })
  })

  it('removes campaign rows tied to deleted leads', async () => {
    await deleteLeadCampaignArtifacts({
      orgId: 'org-1',
      leadIds: ['lead-1', 'lead-2', 'lead-1'],
    })

    expect(mockFrom.mock.calls.map(([table]) => table)).toEqual([
      'campaign_events',
      'campaign_attribution_events',
      'campaign_enrollments',
    ])
    expect(mockEq).toHaveBeenCalledTimes(3)
    expect(mockEq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(mockIn).toHaveBeenCalledTimes(3)
    expect(mockIn).toHaveBeenCalledWith('lead_id', ['lead-1', 'lead-2'])
  })

  it('does nothing when no lead ids are provided', async () => {
    await deleteLeadCampaignArtifacts({ orgId: 'org-1', leadIds: [] })

    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })
})
