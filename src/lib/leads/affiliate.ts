import type { Lead } from '@/types'

/** Shared affiliate pipeline tags - filterable in the console and set on intake. */
export const AFFILIATE_TAG = 'affiliate' as const
export const AFFILIATE_INFLUENCER_TAG = 'affiliate_influencer' as const
export const AFFILIATE_EVENT_TAG = 'affiliate_event' as const

export const AFFILIATE_PIPELINE_VALUES = [
  'affiliate',
  'affiliate_influencer',
  'affiliate_event',
] as const

export type AffiliatePipeline = (typeof AFFILIATE_PIPELINE_VALUES)[number]
export type AffiliateTrack = 'influencer' | 'event'

export const AFFILIATE_PIPELINE_FILTERS: { value: AffiliatePipeline | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'affiliate', label: 'Affiliates' },
  { value: 'affiliate_influencer', label: 'Influencers' },
  { value: 'affiliate_event', label: 'Events' },
]

export function affiliateTrack(
  lead: Pick<Lead, 'source' | 'tags'> & { custom?: Lead['custom'] | null },
): AffiliateTrack | null {
  const tags = lead.tags || []
  const source = (lead.source || '').toLowerCase()
  const customTrack = readAffiliateCustomTrack(lead.custom)

  if (tags.includes(AFFILIATE_INFLUENCER_TAG) || customTrack === 'influencer') return 'influencer'
  if (tags.includes(AFFILIATE_EVENT_TAG) || customTrack === 'event') return 'event'
  if (tags.includes(AFFILIATE_TAG)) {
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

export function isAffiliateLead(
  lead: Pick<Lead, 'source' | 'tags'> & { custom?: Lead['custom'] | null },
): boolean {
  return affiliateTrack(lead) !== null
}

export function affiliatePipelineLabel(
  lead: Pick<Lead, 'source' | 'tags'> & { custom?: Lead['custom'] | null },
): string | null {
  const track = affiliateTrack(lead)
  if (!track) return null
  return track === 'influencer' ? 'Affiliate · Influencer' : 'Affiliate · Event'
}

export function tagsForAffiliateTrack(track: AffiliateTrack): string[] {
  return track === 'influencer'
    ? [AFFILIATE_TAG, AFFILIATE_INFLUENCER_TAG]
    : [AFFILIATE_TAG, AFFILIATE_EVENT_TAG]
}

/** Infer affiliate tags from source / custom when creating or listing. */
export function inferAffiliateTags(input: {
  source?: string | null
  tags?: string[] | null
  custom?: Record<string, unknown> | null
}): string[] {
  const existing = new Set(input.tags || [])
  if (existing.has(AFFILIATE_INFLUENCER_TAG) || existing.has(AFFILIATE_EVENT_TAG)) {
    existing.add(AFFILIATE_TAG)
    return Array.from(existing)
  }

  const track =
    readAffiliateCustomTrack(input.custom) ||
    affiliateTrack({
      source: input.source || null,
      tags: Array.from(existing),
      custom: input.custom || null,
    })

  if (!track) return Array.from(existing)
  for (const tag of tagsForAffiliateTrack(track)) existing.add(tag)
  return Array.from(existing)
}

function readAffiliateCustomTrack(custom: unknown): AffiliateTrack | null {
  if (!custom || typeof custom !== 'object') return null
  const affiliate = (custom as Record<string, unknown>).affiliate
  if (!affiliate || typeof affiliate !== 'object') return null
  const track = (affiliate as Record<string, unknown>).track
  if (track === 'influencer' || track === 'event') return track
  return null
}
