import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildDashboardQueryString, DASHBOARD_QUERY_STALE_TIME_MS, fetchPipelineHealth } from './use-dashboard'

describe('useDashboard query helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('omits the all lead type so the dashboard API can use the default aggregate cache key', () => {
    expect(buildDashboardQueryString('all')).toBe('')
  })

  it('builds a stable type-specific dashboard query string', () => {
    expect(buildDashboardQueryString('investor')).toBe('?type=investor')
  })

  it('uses dashboard stale time tuned for expensive CRM aggregates', () => {
    expect(DASHBOARD_QUERY_STALE_TIME_MS).toBe(30_000)
  })

  it('reuses the dashboard type query string for pipeline-health cache keys', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        overall_score: 92,
        total_leads: 3,
        at_risk_count: 0,
        healthy_count: 3,
        leads: [],
        ai_summary: 'Pipeline looks healthy.',
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const health = await fetchPipelineHealth('partnership')

    expect(mockFetch).toHaveBeenCalledWith('/api/ai/pipeline-health?type=partnership')
    expect(health?.overall_score).toBe(92)
  })

  it('treats pipeline-health as optional so dashboard metrics still render on health failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'temporary failure' }),
    }))

    await expect(fetchPipelineHealth('all')).resolves.toBeNull()
  })
})
