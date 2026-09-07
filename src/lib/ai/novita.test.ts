import { describe, expect, it } from 'vitest'
import { extractJson } from './novita'

describe('extractJson', () => {
  it('parses bare, fenced, and prose-wrapped JSON', () => {
    expect(extractJson('{"should_send": true}')).toEqual({ should_send: true })
    expect(extractJson('```json\n{"should_send": false, "reason": "asked for pricing"}\n```')).toEqual({ should_send: false, reason: 'asked for pricing' })
    expect(extractJson('Sure! Here you go: {"a": 1} hope that helps')).toEqual({ a: 1 })
  })

  it('returns null when nothing parseable is present', () => {
    expect(extractJson('no json here')).toBeNull()
    expect(extractJson('{broken')).toBeNull()
  })
})
