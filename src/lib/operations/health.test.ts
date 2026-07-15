import { describe, expect, it } from 'vitest'
import { getServiceHealth } from './health'

const completeEnv: NodeJS.ProcessEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role',
  CRON_SECRET: 'cron',
  ANTHROPIC_API_KEY: 'ai',
  GOOGLE_CLIENT_ID: 'google-client',
  GOOGLE_CLIENT_SECRET: 'google-secret',
  GOOGLE_REDIRECT_URI: 'https://example.com/api/gmail/callback',
  LEAD_TOKEN_SECRET: 'lead-secret',
  ROCOTO_LANDING_URL: 'https://landing.example.com',
}

describe('getServiceHealth', () => {
  it('reports healthy when all runtime capabilities are configured', () => {
    const health = getServiceHealth(completeEnv, new Date('2026-07-15T12:00:00.000Z'))

    expect(health).toEqual({
      status: 'healthy',
      service: 'pigeon-crm',
      timestamp: '2026-07-15T12:00:00.000Z',
      checks: {
        supabase: 'ready',
        automation: 'ready',
        ai: 'ready',
        google: 'ready',
        landingAttribution: 'ready',
      },
    })
  })

  it('distinguishes an optional capability outage from missing core storage', () => {
    const degraded = getServiceHealth({ ...completeEnv, ANTHROPIC_API_KEY: '' })
    expect(degraded.status).toBe('degraded')
    expect(degraded.checks.ai).toBe('unavailable')

    const unhealthy = getServiceHealth({ ...completeEnv, SUPABASE_SERVICE_ROLE_KEY: '' })
    expect(unhealthy.status).toBe('unhealthy')
    expect(unhealthy.checks.supabase).toBe('unavailable')
  })
})
