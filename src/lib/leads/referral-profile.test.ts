import { describe, expect, it } from 'vitest'
import { notesWithoutChannelBlock, parseReferralProfile } from './referral'

describe('parseReferralProfile', () => {
  it('reads channels and track from custom.referral', () => {
    const profile = parseReferralProfile({
      source: 'landing:affiliates',
      tags: ['referral', 'referral_influencer'],
      custom: {
        referral: {
          track: 'influencer',
          channels: {
            youtube: 'https://www.youtube.com/@alpacasecurity',
            x: '@pigeon',
          },
        },
      },
    })
    expect(profile?.track).toBe('influencer')
    expect(profile?.channels.map((c) => c.id).sort()).toEqual(['x', 'youtube'])
    expect(profile?.channels.find((c) => c.id === 'youtube')?.href).toContain('youtube.com')
    expect(profile?.channels.find((c) => c.id === 'x')?.href).toBeNull()
  })

  it('strips legacy Channels blocks from notes', () => {
    const notes = [
      'Submitted via pigeonlabs affiliates application',
      'Coo Crew application',
      'Channels:',
      'YouTube: https://www.youtube.com/@alpacasecurity',
      'Other: https://substack.com/@x',
      'Message: hello',
    ].join('\n')
    expect(notesWithoutChannelBlock(notes)).toBe(
      'Submitted via pigeonlabs affiliates application\nCoo Crew application\nMessage: hello',
    )
  })
})
