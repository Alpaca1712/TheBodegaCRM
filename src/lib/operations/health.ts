export type ServiceHealthStatus = 'healthy' | 'degraded' | 'unhealthy'
export type CapabilityStatus = 'ready' | 'unavailable'
type HealthEnv = Record<string, string | undefined>

export interface ServiceHealth {
  status: ServiceHealthStatus
  service: 'pigeon-crm'
  timestamp: string
  checks: {
    supabase: CapabilityStatus
    automation: CapabilityStatus
    ai: CapabilityStatus
    google: CapabilityStatus
    landingAttribution: CapabilityStatus
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
    CRON_SECRET: process.env.CRON_SECRET,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
    LEAD_TOKEN_SECRET: process.env.LEAD_TOKEN_SECRET,
    ROCOTO_LANDING_URL: process.env.ROCOTO_LANDING_URL,
  }
}

export function getServiceHealth(
  env: HealthEnv = getRuntimeHealthEnv(),
  now = new Date(),
): ServiceHealth {
  const checks: ServiceHealth['checks'] = {
    supabase: hasAll(env, [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ]) ? 'ready' : 'unavailable',
    automation: hasAll(env, ['CRON_SECRET']) ? 'ready' : 'unavailable',
    ai: hasAll(env, ['ANTHROPIC_API_KEY']) ? 'ready' : 'unavailable',
    google: hasAll(env, [
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GOOGLE_REDIRECT_URI',
    ]) ? 'ready' : 'unavailable',
    landingAttribution: hasAll(env, [
      'LEAD_TOKEN_SECRET',
      'ROCOTO_LANDING_URL',
    ]) ? 'ready' : 'unavailable',
  }

  const status = checks.supabase === 'unavailable'
    ? 'unhealthy'
    : Object.values(checks).every((check) => check === 'ready')
      ? 'healthy'
      : 'degraded'

  return {
    status,
    service: 'pigeon-crm',
    timestamp: now.toISOString(),
    checks,
  }
}
