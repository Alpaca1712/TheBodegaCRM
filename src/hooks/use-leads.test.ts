import { describe, expect, it } from 'vitest'
import { buildLeadsQueryString, LEADS_QUERY_STALE_TIME_MS } from './use-leads'

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
})
