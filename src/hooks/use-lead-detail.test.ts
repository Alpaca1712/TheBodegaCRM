import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchLeadDetail,
  fetchLeadMemories,
  LEAD_DETAIL_QUERY_STALE_TIME_MS,
  LEAD_MEMORIES_QUERY_STALE_TIME_MS,
  leadDetailQueryKey,
  leadMemoriesQueryKey,
} from './use-lead-detail'

describe('useLeadDetail query helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses per-lead cache keys so detail navigation can reuse fresh account data', () => {
    expect(leadDetailQueryKey('lead-123')).toEqual(['lead-detail', 'lead-123'])
    expect(leadMemoriesQueryKey('lead-123')).toEqual(['lead-memories', 'lead-123'])
  })

  it('uses short stale windows tuned for sales pages with frequent outreach updates', () => {
    expect(LEAD_DETAIL_QUERY_STALE_TIME_MS).toBe(15_000)
    expect(LEAD_MEMORIES_QUERY_STALE_TIME_MS).toBe(30_000)
  })

  it('fetches and normalizes lead detail payloads', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        lead: { id: 'lead-123', contact_name: 'Daniel', company_name: 'Rocoto' },
        emails: null,
        interactions: [{ id: 'interaction-1' }],
        relatedLeads: undefined,
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const detail = await fetchLeadDetail('lead/with spaces')

    expect(mockFetch).toHaveBeenCalledWith('/api/leads/lead%2Fwith%20spaces')
    expect(detail.lead.id).toBe('lead-123')
    expect(detail.emails).toEqual([])
    expect(detail.interactions).toEqual([{ id: 'interaction-1' }])
    expect(detail.relatedLeads).toEqual([])
  })

  it('surfaces API errors with the server message for not-found redirects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
    }))

    await expect(fetchLeadDetail('missing')).rejects.toThrow('Not found')
  })

  it('fetches lead memories with URLSearchParams encoding and safe array defaults', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ memories: null }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await expect(fetchLeadMemories('lead/with spaces')).resolves.toEqual([])
    expect(mockFetch).toHaveBeenCalledWith('/api/ai/extract-memories?leadId=lead%2Fwith+spaces')
  })
})
