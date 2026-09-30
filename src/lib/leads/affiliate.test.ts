import { describe, expect, it } from 'vitest'
import {
  affiliatePipelineLabel,
  affiliateTrack,
  inferAffiliateTags,
  tagsForAffiliateTrack,
} from './affiliate'

describe('affiliate pipeline helpers', () => {
  it('classifies influencer and event tracks from tags/source', () => {
    expect(
      affiliateTrack({ source: 'landing:affiliates', tags: ['web_inbound'], custom: null }),
    ).toBe('influencer')
    expect(
      affiliateTrack({ source: 'event:TECH WEEK', tags: [], custom: null }),
    ).toBe('event')
    expect(
      affiliateTrack({
        source: 'cold_email',
        tags: ['affiliate', 'affiliate_influencer'],
        custom: null,
      }),
    ).toBe('influencer')
  })

  it('labels channel column for affiliates', () => {
    expect(
      affiliatePipelineLabel({
        source: 'landing:events',
        tags: ['affiliate', 'affiliate_event'],
        custom: null,
      }),
    ).toBe('Affiliate · Event')
  })

  it('infers tags for create_lead', () => {
    expect(inferAffiliateTags({ source: 'landing:affiliates' })).toEqual(
      expect.arrayContaining(['affiliate', 'affiliate_influencer']),
    )
    expect(
      inferAffiliateTags({
        source: 'event:RSA',
        custom: { affiliate: { track: 'event', event_name: 'RSA' } },
      }),
    ).toEqual(expect.arrayContaining(['affiliate', 'affiliate_event']))
    expect(tagsForAffiliateTrack('influencer')).toEqual(['affiliate', 'affiliate_influencer'])
  })
})
