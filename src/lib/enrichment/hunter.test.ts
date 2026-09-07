import { describe, expect, it } from 'vitest'
import { emailStatusFromHunter, type HunterVerifyResult } from './hunter'

const base: HunterVerifyResult = {
  email: 'a@b.co', status: 'valid', result: 'deliverable', score: 90, disposable: false, webmail: false,
  accept_all: false, mx_records: true, smtp_server: true, smtp_check: true, block: false, sources: [],
}

describe('emailStatusFromHunter', () => {
  it('maps hunter statuses onto lead email_status', () => {
    expect(emailStatusFromHunter(base)).toBe('valid')
    expect(emailStatusFromHunter({ ...base, status: 'invalid' })).toBe('invalid')
    expect(emailStatusFromHunter({ ...base, status: 'accept_all' })).toBe('accept_all')
    expect(emailStatusFromHunter({ ...base, status: 'webmail' })).toBe('webmail')
    expect(emailStatusFromHunter({ ...base, status: 'disposable' })).toBe('disposable')
    expect(emailStatusFromHunter({ ...base, status: 'something_new' })).toBe('unknown')
  })
})
