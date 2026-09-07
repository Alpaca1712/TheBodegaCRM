import { describe, expect, it } from 'vitest'
import { isEmailStatusSendable, leadSendBlockReason } from './email-guard'
import type { Lead } from '@/types'

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'test@example.com',
    email_status: 'unverified',
    email_score: null,
    email_verified_at: null,
    first_name: null,
    last_name: null,
    full_name: null,
    title: null,
    linkedin_url: null,
    twitter_url: null,
    phone: null,
    company_name: null,
    company_domain: null,
    company_website: null,
    company_industry: null,
    company_size: null,
    company_location: null,
    company_description: null,
    stage: 'new',
    source: null,
    campaign_id: null,
    tags: [],
    notes: null,
    research: {},
    enrichment: {},
    custom: {},
    lead_token: null,
    do_not_contact: false,
    unsubscribed_at: null,
    bounced_at: null,
    replied_at: null,
    last_contacted_at: null,
    last_inbound_at: null,
    last_outbound_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('email-guard', () => {
  it('allows only verified sendable statuses', () => {
    expect(isEmailStatusSendable('valid')).toBe(true)
    expect(isEmailStatusSendable('accept_all')).toBe(true)
    expect(isEmailStatusSendable('webmail')).toBe(true)
    expect(isEmailStatusSendable('unverified')).toBe(false)
    expect(isEmailStatusSendable('unknown')).toBe(false)
    expect(isEmailStatusSendable('invalid')).toBe(false)
    expect(isEmailStatusSendable('disposable')).toBe(false)
  })

  it('blocks unverified leads from sending', () => {
    expect(leadSendBlockReason(lead({ email_status: 'unverified' }))).toBe('unverified_email')
    expect(leadSendBlockReason(lead({ email_status: 'unknown' }))).toBe('unverified_email')
    expect(leadSendBlockReason(lead({ email_status: 'valid' }))).toBeNull()
    expect(leadSendBlockReason(lead({ email_status: 'webmail' }))).toBeNull()
    expect(leadSendBlockReason(lead({ email_status: 'invalid' }))).toBe('invalid_email')
    expect(leadSendBlockReason(lead({ email_status: 'disposable' }))).toBe('disposable_email')
  })
})
