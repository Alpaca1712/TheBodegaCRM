import { describe, expect, it } from 'vitest'
import { domainFromEmail, leadDisplayName, normalizeEmail, splitName } from './service'

describe('lead helpers', () => {
  it('normalises emails and extracts domains', () => {
    expect(normalizeEmail('  Ana@Acme.IO ')).toBe('ana@acme.io')
    expect(domainFromEmail('ana@Acme.io')).toBe('acme.io')
    expect(domainFromEmail('nope')).toBeNull()
  })

  it('splits names into first/last', () => {
    expect(splitName('Ana Maria Ruiz')).toEqual({ first_name: 'Ana', last_name: 'Maria Ruiz' })
    expect(splitName('Prince')).toEqual({ first_name: 'Prince', last_name: null })
    expect(splitName('  ')).toEqual({ first_name: null, last_name: null })
  })

  it('picks a display name', () => {
    expect(leadDisplayName({ full_name: null, first_name: 'Ana', last_name: 'Ruiz', email: 'a@b.co' })).toBe('Ana Ruiz')
    expect(leadDisplayName({ full_name: null, first_name: null, last_name: null, email: 'a@b.co' })).toBe('a@b.co')
  })
})
