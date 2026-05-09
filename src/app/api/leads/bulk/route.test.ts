import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const {
  mockCreateClient,
  mockGetUser,
  mockFrom,
  mockDelete,
  mockUpdate,
  mockIn,
  mockEq,
} = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockDelete: vi.fn(),
  mockUpdate: vi.fn(),
  mockIn: vi.fn(),
  mockEq: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

import { POST } from './route'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const LEAD_IDS = [
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
]

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/leads/bulk', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest
}

describe('POST /api/leads/bulk', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()

    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })
    mockCreateClient.mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
    mockFrom.mockReturnValue({ delete: mockDelete, update: mockUpdate })
    mockDelete.mockReturnValue({ in: mockIn })
    mockUpdate.mockReturnValue({ in: mockIn })
    mockIn.mockReturnValue({ eq: mockEq })
    mockEq.mockResolvedValue({ error: null, count: 2 })
  })

  it('rejects unauthenticated bulk operations before touching leads', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })

    const response = await POST(jsonRequest({ action: 'delete', ids: LEAD_IDS }))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toEqual({ error: 'Unauthorized' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('deletes only the signed-in user leads and reports exact affected count', async () => {
    const response = await POST(jsonRequest({ action: 'delete', ids: LEAD_IDS }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ success: true, affected: 2 })
    expect(mockFrom).toHaveBeenCalledWith('leads')
    expect(mockDelete).toHaveBeenCalledWith({ count: 'exact' })
    expect(mockIn).toHaveBeenCalledWith('id', LEAD_IDS)
    expect(mockEq).toHaveBeenCalledWith('user_id', USER_ID)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('updates allowed sales fields with a timestamp and user scope', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T16:00:00Z'))

    const response = await POST(jsonRequest({
      action: 'update',
      ids: LEAD_IDS,
      updates: { stage: 'replied', priority: 'high', type: 'customer' },
    }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ success: true, affected: 2 })
    expect(mockFrom).toHaveBeenCalledWith('leads')
    expect(mockUpdate).toHaveBeenCalledWith(
      {
        stage: 'replied',
        priority: 'high',
        type: 'customer',
        updated_at: '2026-05-09T16:00:00.000Z',
      },
      { count: 'exact' },
    )
    expect(mockIn).toHaveBeenCalledWith('id', LEAD_IDS)
    expect(mockEq).toHaveBeenCalledWith('user_id', USER_ID)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('rejects update requests with no allowed field changes', async () => {
    const response = await POST(jsonRequest({ action: 'update', ids: LEAD_IDS, updates: {} }))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual({ error: 'No updates provided' })
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('rejects invalid or oversized payloads before changing leads', async () => {
    const tooManyIds = Array.from(
      { length: 501 },
      (_, index) => `44444444-4444-4444-8444-${String(index).padStart(12, '0')}`,
    )

    const response = await POST(jsonRequest({
      action: 'update',
      ids: tooManyIds,
      updates: { priority: 'urgent' },
    }))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe('Invalid request')
    expect(payload.details).toBeDefined()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns a safe failure response when Supabase rejects the operation', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockEq.mockResolvedValueOnce({ error: new Error('database unavailable'), count: null })

    const response = await POST(jsonRequest({ action: 'delete', ids: LEAD_IDS }))
    const payload = await response.json()

    expect(response.status).toBe(500)
    expect(payload).toEqual({ error: 'database unavailable' })
    expect(consoleError).toHaveBeenCalledWith(
      'POST /api/leads/bulk error:',
      expect.any(Error),
    )
    consoleError.mockRestore()
  })
})
