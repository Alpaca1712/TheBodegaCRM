import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Standard auth guard for API routes. Returns either a 401 NextResponse to
 * short-circuit the handler, or the authenticated user + supabase client.
 *
 * Usage:
 *   const guard = await requireUser()
 *   if (guard instanceof NextResponse) return guard
 *   const { user, supabase } = guard
 */
export async function requireUser(): Promise<
  NextResponse | { user: User; supabase: SupabaseClient }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return { user, supabase }
}

// ---------- Simple in-memory rate limiter (per-process) ----------
// Good enough to stop runaway client loops / single-attacker cost abuse on
// AI endpoints. For multi-instance prod we should move this to Upstash/Redis.
type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

export interface RateLimitOptions {
  /** Max requests per window */
  limit: number
  /** Window length in milliseconds */
  windowMs: number
}

export function checkRateLimit(
  key: string,
  opts: RateLimitOptions
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now()
  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs })
    return { ok: true }
  }
  if (existing.count >= opts.limit) {
    return { ok: false, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) }
  }
  existing.count += 1
  return { ok: true }
}

/**
 * Convenience: enforce a per-user rate limit for AI/expensive endpoints.
 * Returns a 429 response when exceeded, otherwise null.
 */
export function rateLimitResponse(
  userId: string,
  scope: string,
  opts: RateLimitOptions
): NextResponse | null {
  const result = checkRateLimit(`${scope}:${userId}`, opts)
  if (result.ok) return null
  return NextResponse.json(
    { error: 'Rate limit exceeded. Slow down.' },
    {
      status: 429,
      headers: { 'Retry-After': String(result.retryAfterSec) },
    }
  )
}

// Periodic cleanup to keep the map bounded.
if (typeof globalThis !== 'undefined' && !(globalThis as { __bodegaRateGc?: boolean }).__bodegaRateGc) {
  ;(globalThis as { __bodegaRateGc?: boolean }).__bodegaRateGc = true
  setInterval(() => {
    const now = Date.now()
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k)
    }
  }, 60_000).unref?.()
}
