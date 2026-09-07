import { describe, expect, it } from 'vitest'
import { getServiceHealth } from './health'

const full = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  RESEND_API_KEY: 're_x',
  RESEND_WEBHOOK_SECRET: 'whsec_x',
  HUNTER_API_KEY: 'h',
  NOVITA_API_KEY: 'n',
  CRON_SECRET: 'c',
  LEAD_TOKEN_SECRET: 'l',
  LANDING_WEBHOOK_SECRET: 'w',
}

describe('getServiceHealth', () => {
  it('is healthy when everything is configured', () => {
    const health = getServiceHealth(full, new Date('2026-01-01T00:00:00Z'))
    expect(health.status).toBe('healthy')
    expect(health.timestamp).toBe('2026-01-01T00:00:00.000Z')
  })

  it('degrades when an optional integration is missing and fails without Supabase', () => {
    expect(getServiceHealth({ ...full, HUNTER_API_KEY: '' }).status).toBe('degraded')
    expect(getServiceHealth({ ...full, SUPABASE_SERVICE_ROLE_KEY: undefined }).status).toBe('unhealthy')
  })
})
