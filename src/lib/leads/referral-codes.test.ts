import { describe, expect, it } from 'vitest'
import { isCreditableReferralSource } from './referral-credit'
import {
  isEligibleReferrer,
  normalizeReferralCode,
  referralLinkForCode,
  referrerSignupEmailCopy,
} from './referral-codes'

describe('referral codes', () => {
  it('normalizes codes', () => {
    expect(normalizeReferralCode(' Jane Creator! ')).toBe('jane-creator')
    expect(normalizeReferralCode('ACME__Labs')).toBe('acme-labs')
  })

  it('builds pentest challenge referral links', () => {
    expect(referralLinkForCode('jane')).toMatch(
      /\/pentest-challenge\?ref=jane$/,
    )
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

  it('builds referrer signup congrats copy without referee PII', () => {
    const copy = referrerSignupEmailCopy({
      firstName: 'Daniel',
      link: 'https://pigeonlabs.ai/pentest-challenge?ref=daniel',
    })
    expect(copy.subject).toMatch(/Congrats/i)
    expect(copy.text).toContain('signed up using your Pigeon Labs referral link')
    expect(copy.text).toContain('closed deal')
    expect(copy.text).toContain('https://pigeonlabs.ai/pentest-challenge?ref=daniel')
    expect(copy.text).not.toMatch(/@gmail\.com/)
  })

  it('only credits customer inbound sources', () => {
    expect(isCreditableReferralSource('landing:pentest-challenge')).toBe(true)
    expect(isCreditableReferralSource('landing:home')).toBe(true)
    expect(isCreditableReferralSource('pigeonlabs_blog_subscription')).toBe(false)
    expect(isCreditableReferralSource('landing:affiliates')).toBe(false)
    expect(isCreditableReferralSource('landing:partnerships')).toBe(false)
  })
})
