import { describe, expect, it } from 'vitest'
import { isMissingColumn } from './missing-column'

describe('isMissingColumn', () => {
  it('matches the column named by a PostgREST schema-cache error', () => {
    const error = {
      code: 'PGRST204',
      message: "Could not find the 'source_type' column of 'leads' in the schema cache",
    }

    expect(isMissingColumn(error, 'source_type')).toBe(true)
    expect(isMissingColumn(error, 'lead_token')).toBe(false)
  })

  it('matches PostgreSQL missing-column errors', () => {
    const error = {
      code: '42703',
      message: 'column leads.contact_phone does not exist',
    }

    expect(isMissingColumn(error, 'contact_phone')).toBe(true)
    expect(isMissingColumn(error, 'source_type')).toBe(false)
  })

  it('does not treat every schema error as every optional column', () => {
    expect(isMissingColumn({ code: 'PGRST204', message: 'Schema cache miss' }, 'source_type')).toBe(false)
  })
})
