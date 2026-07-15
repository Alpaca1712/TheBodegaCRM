import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const { mockGetOrgScopedClient, mockFrom } = vi.hoisted(() => ({
  mockGetOrgScopedClient: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase/org-scope', () => ({
  getOrgScopedClient: mockGetOrgScopedClient,
}))

import { DELETE } from './route'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const ORG_ID = '99999999-9999-4999-8999-999999999999'
const CAMPAIGN_ID = '22222222-2222-4222-8222-222222222222'
const ENROLLMENT_ID = '33333333-3333-4333-8333-333333333333'
const LEAD_ID = '44444444-4444-4444-8444-444444444444'

function request() {
  return new Request(
    `http://localhost/api/campaigns/${CAMPAIGN_ID}/enrollments/${ENROLLMENT_ID}`,
    { method: 'DELETE' },
  ) as NextRequest
}

function context() {
  return { params: Promise.resolve({ id: CAMPAIGN_ID, enrollmentId: ENROLLMENT_ID }) }
}

describe('DELETE /api/campaigns/[id]/enrollments/[enrollmentId]', () => {
  let selectQuery: { eq: ReturnType<typeof vi.fn>; maybeSingle: ReturnType<typeof vi.fn> }
  let deleteQuery: { eq: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()

    selectQuery = {
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: ENROLLMENT_ID, lead_id: LEAD_ID },
        error: null,
      }),
    }
    selectQuery.eq.mockReturnValue(selectQuery)

    deleteQuery = { eq: vi.fn() }
    deleteQuery.eq.mockReturnValue(deleteQuery)

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue(selectQuery),
      delete: vi.fn().mockReturnValue(deleteQuery),
    })
    mockGetOrgScopedClient.mockResolvedValue({
      supabase: { from: mockFrom },
      user: { id: USER_ID },
      orgId: ORG_ID,
    })
  })

  it('keeps unauthenticated users from touching campaign enrollments', async () => {
    mockGetOrgScopedClient.mockResolvedValueOnce({
      supabase: { from: mockFrom },
      user: null,
      orgId: null,
    })

    const response = await DELETE(request(), context())

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns not found instead of deleting an enrollment outside the campaign', async () => {
    selectQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

    const response = await DELETE(request(), context())

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Enrollment not found' })
    expect(deleteQuery.eq).not.toHaveBeenCalled()
  })

  it('removes only the organization-scoped campaign enrollment', async () => {
    const response = await DELETE(request(), context())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: { id: ENROLLMENT_ID, lead_id: LEAD_ID },
    })
    expect(selectQuery.eq.mock.calls).toEqual([
      ['id', ENROLLMENT_ID],
      ['campaign_id', CAMPAIGN_ID],
      ['org_id', ORG_ID],
    ])
    expect(deleteQuery.eq.mock.calls).toEqual([
      ['id', ENROLLMENT_ID],
      ['campaign_id', CAMPAIGN_ID],
      ['org_id', ORG_ID],
    ])
  })

  it('returns a safe error when the enrollment delete fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    deleteQuery.eq.mockReset()
    deleteQuery.eq.mockReturnValueOnce(deleteQuery)
    deleteQuery.eq.mockReturnValueOnce(deleteQuery)
    deleteQuery.eq.mockResolvedValueOnce({ error: new Error('delete failed') })

    const response = await DELETE(request(), context())

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'delete failed' })
    expect(consoleError).toHaveBeenCalledWith(
      'DELETE /api/campaigns/[id]/enrollments/[enrollmentId] failed',
      expect.any(Error),
    )
    consoleError.mockRestore()
  })
})
