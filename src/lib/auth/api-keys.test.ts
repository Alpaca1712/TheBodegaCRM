import { describe, expect, it } from 'vitest'
import { generateApiKey, hashApiKey, looksLikeApiKey } from './api-keys'

describe('api keys', () => {
  it('generates prefixed, unique keys whose hash matches', () => {
    const a = generateApiKey()
    const b = generateApiKey()
    expect(a.key.startsWith('bdg_')).toBe(true)
    expect(a.key).not.toBe(b.key)
    expect(a.hash).toBe(hashApiKey(a.key))
    expect(a.prefix).toBe(a.key.slice(0, 12))
    expect(a.hash).toHaveLength(64)
  })

  it('recognises the key format', () => {
    expect(looksLikeApiKey('bdg_abc')).toBe(true)
    expect(looksLikeApiKey('eyJhbGciOi')).toBe(false)
  })
})
