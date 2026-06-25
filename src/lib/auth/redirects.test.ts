import { describe, expect, it } from 'vitest'
import { getSafeInternalRedirect } from './redirects'

describe('getSafeInternalRedirect', () => {
  it('preserves internal paths with query params and hashes', () => {
    expect(
      getSafeInternalRedirect(
        '/leads/b0c68066-b71b-4c12-9873-d1d2c98a7f9f?tab=emails&campaign_id=7d6712ad-e158-4c88-b357-f3f7511da829&followup=follow_up_1#emails'
      )
    ).toBe(
      '/leads/b0c68066-b71b-4c12-9873-d1d2c98a7f9f?tab=emails&campaign_id=7d6712ad-e158-4c88-b357-f3f7511da829&followup=follow_up_1#emails'
    )
  })

  it('rejects external and auth-loop redirects', () => {
    expect(getSafeInternalRedirect('https://example.com/leads/1')).toBeNull()
    expect(getSafeInternalRedirect('//example.com/leads/1')).toBeNull()
    expect(getSafeInternalRedirect('/login?redirectedFrom=/dashboard')).toBeNull()
    expect(getSafeInternalRedirect('/signup')).toBeNull()
  })
})
