import { describe, expect, it } from 'vitest'
import {
  inferReferralTags,
  referralPipelineLabel,
  referralTrack,
  tagsForReferralTrack,
} from './referral'

describe('referral pipeline helpers', () => {
  it('classifies influencer and event tracks from tags/source', () => {
    expect(
      referralTrack({ source: 'landing:affiliates', tags: ['web_inbound'], custom: null }),
    ).toBe('influencer')
    expect(
      referralTrack({ source: 'event:TECH WEEK', tags: [], custom: null }),
    ).toBe('event')
    expect(
      referralTrack({
        source: 'cold_email',
        tags: ['referral', 'referral_influencer'],
        custom: null,
      }),
    ).toBe('influencer')
    expect(
      referralTrack({
        source: 'cold_email',
        tags: ['affiliate', 'affiliate_influencer'],
        custom: null,
      }),
    ).toBe('influencer')
  })

  it('labels channel column for referral leads', () => {
    expect(
      referralPipelineLabel({
        source: 'landing:events',
        tags: ['referral', 'referral_event'],
        custom: null,
      }),
    ).toBe('Affiliate · Event')
  })

  it('infers tags for create_lead', () => {
    expect(inferReferralTags({ source: 'landing:affiliates' })).toEqual(
      expect.arrayContaining(['referral', 'referral_influencer']),
    )
    expect(
      inferReferralTags({
        source: 'event:RSA',
        custom: { referral: { track: 'event', event_name: 'RSA' } },
      }),
    ).toEqual(expect.arrayContaining(['referral', 'referral_event']))
    expect(tagsForReferralTrack('influencer')).toEqual(['referral', 'referral_influencer'])
  })
})
