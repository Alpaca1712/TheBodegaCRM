import type { Lead } from '@/types'

/** Referral program (Coo Crew) pipeline tags. */
export const REFERRAL_TAG = 'referral' as const
export const REFERRAL_INFLUENCER_TAG = 'referral_influencer' as const
export const REFERRAL_EVENT_TAG = 'referral_event' as const

const LEGACY_AFFILIATE_TAG = 'affiliate'
const LEGACY_AFFILIATE_INFLUENCER_TAG = 'affiliate_influencer'
const LEGACY_AFFILIATE_EVENT_TAG = 'affiliate_event'

export const REFERRAL_PIPELINE_VALUES = [
  'referral',
  'referral_influencer',
  'referral_event',
] as const

export type ReferralPipeline = (typeof REFERRAL_PIPELINE_VALUES)[number]
export type ReferralTrack = 'influencer' | 'event'

export const REFERRAL_PIPELINE_FILTERS: { value: ReferralPipeline | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'referral', label: 'Referrals' },
  { value: 'referral_influencer', label: 'Influencers' },
  { value: 'referral_event', label: 'Events' },
]

export function referralTrack(
  lead: Pick<Lead, 'source' | 'tags'> & { custom?: Lead['custom'] | null },
): ReferralTrack | null {
  const tags = lead.tags || []
  const source = (lead.source || '').toLowerCase()
  const customTrack = readReferralCustomTrack(lead.custom)

  if (
    tags.includes(REFERRAL_INFLUENCER_TAG) ||
    tags.includes(LEGACY_AFFILIATE_INFLUENCER_TAG) ||
    customTrack === 'influencer'
  ) {
    return 'influencer'
  }
  if (
    tags.includes(REFERRAL_EVENT_TAG) ||
    tags.includes(LEGACY_AFFILIATE_EVENT_TAG) ||
    customTrack === 'event'
  ) {
    return 'event'
  }
  if (tags.includes(REFERRAL_TAG) || tags.includes(LEGACY_AFFILIATE_TAG)) {
    if (source.includes('event')) return 'event'
    return 'influencer'
  }
  if (
    source === 'landing:affiliates' ||
    source.startsWith('pigeonlabs_affiliates')
  ) {
    return 'influencer'
  }
  if (
    source === 'landing:events' ||
    source.startsWith('pigeonlabs_events') ||
    source.startsWith('event:')
  ) {
    return 'event'
  }
  return null
}

export function isReferralLead(
  lead: Pick<Lead, 'source' | 'tags'> & { custom?: Lead['custom'] | null },
): boolean {
  return referralTrack(lead) !== null
}

export function referralPipelineLabel(
  lead: Pick<Lead, 'source' | 'tags'> & { custom?: Lead['custom'] | null },
): string | null {
  const track = referralTrack(lead)
  if (!track) return null
  return track === 'influencer' ? 'Referral · Influencer' : 'Referral · Event'
}

export function tagsForReferralTrack(track: ReferralTrack): string[] {
  return track === 'influencer'
    ? [REFERRAL_TAG, REFERRAL_INFLUENCER_TAG]
    : [REFERRAL_TAG, REFERRAL_EVENT_TAG]
}

/** Infer referral tags from source / custom when creating. */
export function inferReferralTags(input: {
  source?: string | null
  tags?: string[] | null
  custom?: Record<string, unknown> | null
}): string[] {
  const existing = new Set(input.tags || [])

  if (existing.has(LEGACY_AFFILIATE_INFLUENCER_TAG)) {
    existing.delete(LEGACY_AFFILIATE_INFLUENCER_TAG)
    existing.add(REFERRAL_INFLUENCER_TAG)
  }
  if (existing.has(LEGACY_AFFILIATE_EVENT_TAG)) {
    existing.delete(LEGACY_AFFILIATE_EVENT_TAG)
    existing.add(REFERRAL_EVENT_TAG)
  }
  if (existing.has(LEGACY_AFFILIATE_TAG)) {
    existing.delete(LEGACY_AFFILIATE_TAG)
    existing.add(REFERRAL_TAG)
  }

  if (existing.has(REFERRAL_INFLUENCER_TAG) || existing.has(REFERRAL_EVENT_TAG)) {
    existing.add(REFERRAL_TAG)
    return Array.from(existing)
  }

  const track =
    readReferralCustomTrack(input.custom) ||
    referralTrack({
      source: input.source || null,
      tags: Array.from(existing),
      custom: input.custom || null,
    })

  if (!track) return Array.from(existing)
  for (const tag of tagsForReferralTrack(track)) existing.add(tag)
  return Array.from(existing)
}

function readReferralCustomTrack(custom: unknown): ReferralTrack | null {
  if (!custom || typeof custom !== 'object') return null
  const bag = custom as Record<string, unknown>
  const block = bag.referral ?? bag.affiliate
  if (!block || typeof block !== 'object') return null
  const track = (block as Record<string, unknown>).track
  if (track === 'influencer' || track === 'event') return track
  return null
}
