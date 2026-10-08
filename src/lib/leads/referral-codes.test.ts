import { describe, expect, it } from 'vitest'
import {
  isEligibleReferrer,
  normalizeReferralCode,
  referralLinkForCode,
} from './referral-codes'

describe('referral codes', () => {
  it('normalizes codes', () => {
    expect(normalizeReferralCode(' Jane Creator! ')).toBe('jane-creator')
    expect(normalizeReferralCode('ACME__Labs')).toBe('acme-labs')
  })

  it('builds landing links', () => {
    expect(referralLinkForCode('jane')).toMatch(/\?ref=jane$/)
  })

  it('marks Coo Crew and partnership leads eligible', () => {
    expect(
      isEligibleReferrer({
        source: 'landing:affiliates',
        tags: ['referral', 'referral_influencer'],
      }),
    ).toBe(true)
    expect(
      isEligibleReferrer({
        source: 'landing:partnerships',
        tags: ['partnership'],
      }),
    ).toBe(true)
    expect(
      isEligibleReferrer({
        source: 'landing:home',
        tags: ['web'],
      }),
    ).toBe(false)
  })
})
