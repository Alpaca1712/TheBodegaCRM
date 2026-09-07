import { createHash, randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import type { ApiKey } from '@/types'

const KEY_PREFIX = 'bdg_'

export function hashApiKey(key: string) {
  return createHash('sha256').update(key).digest('hex')
}

export function generateApiKey() {
  const secret = randomBytes(24).toString('base64url')
  const key = `${KEY_PREFIX}${secret}`
  return { key, hash: hashApiKey(key), prefix: key.slice(0, 12) }
}

export function looksLikeApiKey(value: string) {
  return value.startsWith(KEY_PREFIX)
}

const API_KEY_COLUMNS = 'id, name, key_prefix, last_used_at, created_at, revoked_at'

export async function listApiKeys(): Promise<ApiKey[]> {
  const { data, error } = await db()
    .from('api_keys')
    .select(API_KEY_COLUMNS)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as ApiKey[]
}

export async function createApiKey(name: string): Promise<{ record: ApiKey; key: string }> {
  const generated = generateApiKey()
  const { data, error } = await db()
    .from('api_keys')
    .insert({ name, key_prefix: generated.prefix, key_hash: generated.hash })
    .select(API_KEY_COLUMNS)
    .single()
  if (error) throw error
  return { record: data as ApiKey, key: generated.key }
}

export async function revokeApiKey(id: string) {
  const { data, error } = await db()
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .is('revoked_at', null)
    .select(API_KEY_COLUMNS)
    .maybeSingle()
  if (error) throw error
  if (!data) throw ApiError.notFound('API key not found')
  return data as ApiKey
}

export async function findActiveApiKey(key: string): Promise<ApiKey | null> {
  const { data, error } = await db()
    .from('api_keys')
    .select(API_KEY_COLUMNS)
    .eq('key_hash', hashApiKey(key))
    .is('revoked_at', null)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const record = data as ApiKey
  const lastUsed = record.last_used_at ? Date.parse(record.last_used_at) : 0
  if (Date.now() - lastUsed > 60_000) {
    void db().from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', record.id)
      .then(() => undefined, () => undefined)
  }
  return record
}
