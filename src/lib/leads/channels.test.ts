import { describe, expect, it } from 'vitest'
import {
  channelLabelForLead,
  inferChannelTags,
  isBlogLead,
  isPartnershipLead,
  isWebLead,
} from './channels'

describe('lead channel helpers', () => {
  it('keeps blog for newsletter signups only', () => {
    expect(
      isBlogLead({
        source: 'pigeonlabs_blog_subscription',
        tags: ['web_inbound', 'blog_subscriber'],
      }),
    ).toBe(true)
    expect(
      channelLabelForLead({
        source: 'landing:blog',
        tags: ['web_inbound', 'blog'],
      }),
    ).toBe('Blog')
  })

  it('labels pentest / home landing as Web, not Blog', () => {
    expect(
      isBlogLead({
        source: 'landing:pentest-challenge',
        tags: ['web_inbound', 'blog'],
      }),
    ).toBe(false)
    expect(
      isWebLead({
        source: 'landing:pentest-challenge',
        tags: ['web_inbound', 'blog'],
      }),
    ).toBe(true)
    expect(
      channelLabelForLead({
        source: 'landing:home',
        tags: ['web_inbound'],
      }),
    ).toBe('Web')
  })

  it('classifies partnerships and keeps affiliates out of blog/web', () => {
    expect(
      isPartnershipLead({
        source: 'landing:partnerships',
        tags: ['web_inbound'],
      }),
    ).toBe(true)
    expect(
      isBlogLead({
        source: 'landing:affiliates',
        tags: ['web_inbound', 'referral', 'referral_influencer'],
      }),
    ).toBe(false)
    expect(
      isWebLead({
        source: 'landing:affiliates',
        tags: ['web_inbound', 'referral', 'referral_influencer'],
      }),
    ).toBe(false)
  })

  it('infers tags on create', () => {
    expect(inferChannelTags({ source: 'pigeonlabs_blog_subscription' })).toEqual(
      expect.arrayContaining(['blog', 'blog_subscriber']),
    )
    expect(inferChannelTags({ source: 'landing:pentest-challenge' })).toEqual(
      expect.arrayContaining(['web']),
    )
    expect(inferChannelTags({ source: 'landing:pentest-challenge' })).not.toEqual(
      expect.arrayContaining(['blog']),
    )
    expect(inferChannelTags({ source: 'landing:partnerships' })).toEqual(
      expect.arrayContaining(['partnership']),
    )
    expect(inferChannelTags({ source: 'landing:affiliates' })).not.toEqual(
      expect.arrayContaining(['blog']),
    )
  })
})
