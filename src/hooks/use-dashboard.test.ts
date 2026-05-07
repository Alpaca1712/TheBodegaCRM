import { describe, expect, it } from 'vitest'
import { buildDashboardQueryString, DASHBOARD_QUERY_STALE_TIME_MS } from './use-dashboard'

describe('useDashboard query helpers', () => {
  it('omits the all lead type so the dashboard API can use the default aggregate cache key', () => {
    expect(buildDashboardQueryString('all')).toBe('')
  })

  it('builds a stable type-specific dashboard query string', () => {
    expect(buildDashboardQueryString('investor')).toBe('?type=investor')
  })

  it('uses dashboard stale time tuned for expensive CRM aggregates', () => {
    expect(DASHBOARD_QUERY_STALE_TIME_MS).toBe(30_000)
  })
})
