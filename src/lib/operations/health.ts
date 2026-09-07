export type ServiceHealthStatus = 'healthy' | 'degraded' | 'unhealthy'
export type CapabilityStatus = 'ready' | 'unavailable'
type HealthEnv = Record<string, string | undefined>

export interface ServiceHealth {
  status: ServiceHealthStatus
  service: 'bodega'
  timestamp: string
  checks: {
    supabase: CapabilityStatus
    resend: CapabilityStatus
    resend_webhook: CapabilityStatus
    hunter: CapabilityStatus
    novita: CapabilityStatus
    cron: CapabilityStatus
    landing: CapabilityStatus
  }
}

function hasAll(env: HealthEnv, keys: string[]) {
  return keys.every((key) => Boolean(env[key]?.trim()))
}

function getRuntimeHealthEnv(): HealthEnv {
  // Keep these references explicit so Next.js can include server runtime values
  // in the compiled route. Dynamically indexing process.env is not bundled.
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET,
    HUNTER_API_KEY: process.env.HUNTER_API_KEY,
    NOVITA_API_KEY: process.env.NOVITA_API_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    LEAD_TOKEN_SECRET: process.env.LEAD_TOKEN_SECRET,
    LANDING_WEBHOOK_SECRET: process.env.LANDING_WEBHOOK_SECRET,
  }
}

export function getServiceHealth(env: HealthEnv = getRuntimeHealthEnv(), now = new Date()): ServiceHealth {
  const checks: ServiceHealth['checks'] = {
    supabase: hasAll(env, ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) ? 'ready' : 'unavailable',
    resend: hasAll(env, ['RESEND_API_KEY']) ? 'ready' : 'unavailable',
    resend_webhook: hasAll(env, ['RESEND_WEBHOOK_SECRET']) ? 'ready' : 'unavailable',
    hunter: hasAll(env, ['HUNTER_API_KEY']) ? 'ready' : 'unavailable',
    novita: hasAll(env, ['NOVITA_API_KEY']) ? 'ready' : 'unavailable',
    cron: hasAll(env, ['CRON_SECRET']) ? 'ready' : 'unavailable',
    landing: hasAll(env, ['LEAD_TOKEN_SECRET', 'LANDING_WEBHOOK_SECRET']) ? 'ready' : 'unavailable',
  }

  const status = checks.supabase === 'unavailable'
    ? 'unhealthy'
    : Object.values(checks).every((check) => check === 'ready')
      ? 'healthy'
      : 'degraded'

  return { status, service: 'bodega', timestamp: now.toISOString(), checks }
}
