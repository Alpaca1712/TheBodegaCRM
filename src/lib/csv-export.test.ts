import { describe, it, expect } from 'vitest'
import { escapeCsvField, leadsToCsv } from './csv-export'
import type { Lead } from '@/types/leads'

const makeLead = (overrides: Partial<Lead> = {}): Lead =>
  ({
    id: '00000000-0000-0000-0000-000000000001',
    user_id: 'u1',
    org_id: 'o1',
    type: 'customer',
    stage: 'researched',
    priority: 'medium',
    contact_name: 'Jane Doe',
    contact_title: 'CEO',
    contact_email: 'jane@acme.com',
    contact_phone: null,
    contact_linkedin: null,
    contact_twitter: null,
    contact_photo_url: null,
    company_name: 'Acme, Inc.',
    company_website: null,
    company_logo_url: null,
    company_description: null,
    product_name: null,
    fund_name: null,
    attack_surface_notes: null,
    investment_thesis_notes: null,
    personal_details: null,
    smykm_hooks: [],
    research_sources: [],
    source: null,
    notes: 'Multi\nline\nnote',
    last_contacted_at: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
    org_chart: [],
    icp_score: 87,
    icp_reasons: [],
    conversation_summary: null,
    conversation_next_step: null,
    conversation_signals: [],
    auto_stage_reason: null,
    battle_card: null,
    battle_card_generated_at: null,
    ...overrides,
  }) as unknown as Lead

describe('escapeCsvField', () => {
  it('returns empty for null/undefined', () => {
    expect(escapeCsvField(null)).toBe('')
    expect(escapeCsvField(undefined)).toBe('')
  })

  it('quotes fields with commas or quotes', () => {
    expect(escapeCsvField('Acme, Inc.')).toBe('"Acme, Inc."')
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""')
  })

  it('prevents formula injection', () => {
    expect(escapeCsvField('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(escapeCsvField('+1-800')).toBe("'+1-800")
    expect(escapeCsvField('@user')).toBe("'@user")
  })

  it('strips newlines so rows stay on one line', () => {
    expect(escapeCsvField('a\nb\r\nc')).toBe('a b c')
  })
})

describe('leadsToCsv', () => {
  it('emits a header and a row per lead', () => {
    const csv = leadsToCsv([makeLead(), makeLead({ id: '2', contact_name: 'Bob' })])
    const lines = csv.split('\n')
    expect(lines.length).toBe(3)
    expect(lines[0]).toContain('Contact Name')
    expect(lines[0]).toContain('Company')
    expect(lines[1]).toContain('Jane Doe')
    expect(lines[1]).toContain('"Acme, Inc."')
    expect(lines[2]).toContain('Bob')
  })

  it('handles empty lead list (header only)', () => {
    const csv = leadsToCsv([])
    expect(csv.split('\n').length).toBe(1)
  })

  it('neutralizes newlines in notes', () => {
    const csv = leadsToCsv([makeLead()])
    expect(csv.split('\n').length).toBe(2) // header + 1 row, no extra lines from notes
  })
})
