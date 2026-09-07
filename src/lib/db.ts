import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

let cached: SupabaseClient | null = null

/**
 * Single-tenant data access. Every table has RLS enabled with no policies, so
 * the service-role client is the only thing that can read or write.
 */
export function db(): SupabaseClient {
  if (!cached) cached = createAdminClient()
  return cached
}

export function isUniqueViolation(error: { code?: string } | null | undefined) {
  return error?.code === '23505'
}
