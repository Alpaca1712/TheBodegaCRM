import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const {
  mockCreateClient,
  mockGetUser,
  mockFrom,
  mockLeadSelect,
  mockLeadEqId,
  mockLeadEqUser,
  mockLeadSingle,
  mockProfileSelect,
  mockProfileEqUser,
  mockProfileSingle,
  mockEmailInsert,
  mockEmailSelect,
  mockEmailSingle,
} = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockLeadSelect: vi.fn(),
  mockLeadEqId: vi.fn(),
  mockLeadEqUser: vi.fn(),
  mockLeadSingle: vi.fn(),
  mockProfileSelect: vi.fn(),
  mockProfileEqUser: vi.fn(),
  mockProfileSingle: vi.fn(),
  mockEmailInsert: vi.fn(),
  mockEmailSelect: vi.fn(),
  mockEmailSingle: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

import { POST } from './route'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const ORG_ID = '99999999-9999-4999-8999-999999999999'
const LEAD_ID = '22222222-2222-4222-8222-222222222222'

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/lead-emails', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest
}

function validEmailPayload(overrides: Record<string, unknown> = {}) {
  return {
    lead_id: LEAD_ID,
    email_type: 'initial',
    cta_type: 'mckenna',
    subject: 'Rocoto x Acme agent security idea',
    body: 'Saw your LangGraph post and drafted a teardown for your agent evals.',
    direction: 'outbound',
    ...overrides,
  }
}

describe('POST /api/lead-emails', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })
    mockCreateClient.mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'leads') return { select: mockLeadSelect }
      if (table === 'profiles') return { select: mockProfileSelect }
      if (table === 'lead_emails') return { insert: mockEmailInsert }
      throw new Error(`Unexpected table: ${table}`)
    })

    mockLeadSelect.mockReturnValue({ eq: mockLeadEqId })
    mockLeadEqId.mockReturnValue({ eq: mockLeadEqUser })
    mockLeadEqUser.mockReturnValue({ single: mockLeadSingle })
    mockLeadSingle.mockResolvedValue({ data: { id: LEAD_ID }, error: null })

    mockProfileSelect.mockReturnValue({ eq: mockProfileEqUser })
    mockProfileEqUser.mockReturnValue({ single: mockProfileSingle })
    mockProfileSingle.mockResolvedValue({ data: { active_org_id: ORG_ID }, error: null })

    mockEmailInsert.mockReturnValue({ select: mockEmailSelect })
    mockEmailSelect.mockReturnValue({ single: mockEmailSingle })
    mockEmailSingle.mockResolvedValue({
      data: { id: 'email-1', ...validEmailPayload(), user_id: USER_ID, org_id: ORG_ID },
      error: null,
    })
  })

  it('rejects unauthenticated email saves before touching sales data', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })

    const response = await POST(jsonRequest(validEmailPayload()))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toEqual({ error: 'Unauthorized' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('rejects malformed outreach records before checking lead ownership', async () => {
    const response = await POST(jsonRequest(validEmailPayload({
      lead_id: 'not-a-uuid',
      email_type: 'generic_blast',
    })))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe('Invalid request')
    expect(payload.details).toBeDefined()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('requires signed-in user ownership before saving an email to a lead', async () => {
    mockLeadSingle.mockResolvedValueOnce({ data: null, error: null })

    const response = await POST(jsonRequest(validEmailPayload()))
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload).toEqual({ error: 'Lead not found' })
    expect(mockFrom).toHaveBeenCalledWith('leads')
    expect(mockLeadEqId).toHaveBeenCalledWith('id', LEAD_ID)
    expect(mockLeadEqUser).toHaveBeenCalledWith('user_id', USER_ID)
    expect(mockEmailInsert).not.toHaveBeenCalled()
  })

  it('saves outbound email drafts with user and org attribution', async () => {
    const response = await POST(jsonRequest(validEmailPayload()))
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload).toMatchObject({ id: 'email-1', user_id: USER_ID, org_id: ORG_ID })
    expect(mockProfileEqUser).toHaveBeenCalledWith('user_id', USER_ID)
    expect(mockEmailInsert).toHaveBeenCalledWith({
      ...validEmailPayload(),
      user_id: USER_ID,
      org_id: ORG_ID,
    })
  })

  it('returns a safe failure response when Supabase rejects the insert', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockEmailSingle.mockResolvedValueOnce({ data: null, error: new Error('insert failed') })

    const response = await POST(jsonRequest(validEmailPayload()))
    const payload = await response.json()

    expect(response.status).toBe(500)
    expect(payload).toEqual({ error: 'insert failed' })
    expect(consoleError).toHaveBeenCalledWith('POST /api/lead-emails error:', expect.any(Error))
    consoleError.mockRestore()
  })
})
