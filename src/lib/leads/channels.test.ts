import { describe, expect, it } from 'vitest'
import {
  channelLabelForLead,
  inferChannelTags,
  isBlogLead,
  isPartnershipLead,
} from './channels'

describe('lead channel helpers', () => {
  it('classifies blog and partnership leads', () => {
    expect(
      isBlogLead({
        source: 'pigeonlabs_blog_subscription',
        tags: ['web_inbound', 'blog_subscriber'],
      }),
    ).toBe(true)
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
  })

  it('labels channels for the console', () => {
    expect(
      channelLabelForLead({ source: 'landing:home', tags: ['blog', 'web_inbound'] }),
    ).toBe('Blog')
    expect(
      channelLabelForLead({
        source: 'pigeonlabs_partnerships_application',
        tags: ['partnership'],
      }),
    ).toBe('Partnership')
  })

  it('infers tags on create', () => {
    expect(inferChannelTags({ source: 'pigeonlabs_blog_subscription' })).toEqual(
      expect.arrayContaining(['blog', 'blog_subscriber']),
    )
    expect(inferChannelTags({ source: 'landing:partnerships' })).toEqual(
      expect.arrayContaining(['partnership']),
    )
    expect(inferChannelTags({ source: 'landing:home' })).toEqual(
      expect.arrayContaining(['blog']),
    )
    expect(inferChannelTags({ source: 'landing:affiliates' })).not.toEqual(
      expect.arrayContaining(['blog']),
    )
  })
})
