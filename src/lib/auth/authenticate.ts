import { ApiError } from '@/lib/api/errors'
import { createClient } from '@/lib/supabase/server'
import { findActiveApiKey, looksLikeApiKey } from './api-keys'

export type Actor =
  | { type: 'api_key'; id: string; name: string }
  | { type: 'user'; id: string; email: string | null }

export function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') || ''
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  if (match) return match[1].trim()
  const apiKeyHeader = request.headers.get('x-api-key')
  return apiKeyHeader?.trim() || null
}

/**
 * Resolves who is calling: an API key (agents, MCP clients) or a logged-in
 * console user (Supabase session cookie). Returns null when neither is valid.
 */
export async function authenticate(request: Request): Promise<Actor | null> {
  const token = bearerToken(request)
  if (token && looksLikeApiKey(token)) {
    const key = await findActiveApiKey(token)
    return key ? { type: 'api_key', id: key.id, name: key.name } : null
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) return { type: 'user', id: user.id, email: user.email ?? null }
  } catch {
    // No cookie store available (e.g. called outside a request scope).
  }
  return null
}

export async function requireActor(request: Request, options: { sessionOnly?: boolean } = {}): Promise<Actor> {
  const actor = await authenticate(request)
  if (!actor) throw ApiError.unauthorized('Provide an API key as "Authorization: Bearer bdg_..." or sign in.')
  if (options.sessionOnly && actor.type !== 'user') {
    throw ApiError.forbidden('This endpoint is only available from the console session.')
  }
  return actor
}

export function requireSharedSecret(request: Request, secret: string | undefined, label: string) {
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') return
    throw new ApiError(500, `${label} is not configured`)
  }
  const provided = bearerToken(request) || request.headers.get('x-webhook-secret')
  if (provided !== secret) throw ApiError.unauthorized(`Invalid ${label}`)
}
