import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Lead } from '@/types/leads'
import {
  buildLeadsQueryString,
  fetchAllLeadsForExport,
  LEADS_EXPORT_PAGE_SIZE,
  LEADS_QUERY_STALE_TIME_MS,
} from './use-leads'

function lead(id: string): Lead {
  return { id, company_name: id } as Lead
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useLeads query helpers', () => {
  it('builds a stable paginated leads query string with filters', () => {
    expect(buildLeadsQueryString({
      type: 'customer',
      stage: 'follow_up',
      search: '  Rocoto AI  ',
      page: 2,
      pageSize: 50,
    })).toBe('type=customer&stage=follow_up&search=Rocoto+AI&limit=50&offset=100')
  })

  it('omits empty filters and clamps negative pages to the first page', () => {
    expect(buildLeadsQueryString({
      type: '',
      stage: '',
      search: '   ',
      page: -3,
      pageSize: 25,
    })).toBe('limit=25&offset=0')
  })

  it('includes the pipeline view hint for lightweight kanban payloads', () => {
    expect(buildLeadsQueryString({
      type: 'investor',
      view: 'pipeline',
      pageSize: 200,
    })).toBe('type=investor&view=pipeline&limit=200&offset=0')
  })

  it('uses a short stale time so list navigation is cached without hiding fresh outreach changes', () => {
    expect(LEADS_QUERY_STALE_TIME_MS).toBe(15_000)
  })

  it('fetches every matching lead for CSV exports instead of only the visible page', async () => {
    const firstPage = Array.from({ length: LEADS_EXPORT_PAGE_SIZE }, (_, index) => lead(`page-1-${index}`))
    const secondPage = [lead('page-2-0'), lead('page-2-1')]
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: firstPage, count: LEADS_EXPORT_PAGE_SIZE + secondPage.length }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: secondPage, count: LEADS_EXPORT_PAGE_SIZE + secondPage.length }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchAllLeadsForExport({
      type: 'customer',
      stage: 'email_drafted',
      search: ' Rocoto ',
    })

    expect(result).toHaveLength(LEADS_EXPORT_PAGE_SIZE + secondPage.length)
    expect(result.at(-1)?.id).toBe('page-2-1')
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/leads?type=customer&stage=email_drafted&search=Rocoto&limit=200&offset=0',
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/leads?type=customer&stage=email_drafted&search=Rocoto&limit=200&offset=200',
    )
  })

  it('keeps export fetches to one request when the first page contains all matches', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [lead('solo')], count: 1 }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchAllLeadsForExport({ search: 'solo' })).resolves.toEqual([lead('solo')])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
