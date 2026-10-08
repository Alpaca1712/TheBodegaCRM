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
  { value: 'referral', label: 'Affiliates' },
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
  return track === 'influencer' ? 'Affiliate · Influencer' : 'Affiliate · Event'
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

const CHANNEL_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  x: 'X',
  linkedin: 'LinkedIn',
  other: 'Other',
}

export type ReferralChannel = { id: string; label: string; value: string; href: string | null }

export type ReferralProfile = {
  track: ReferralTrack | null
  event_name: string | null
  channels: ReferralChannel[]
}

function channelHref(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('@')) return null
  if (trimmed.includes('.') && !trimmed.includes(' ')) {
    return `https://${trimmed.replace(/^\/+/, '')}`
  }
  return null
}

/** Structured Coo Crew / event fields from custom.referral (not notes). */
export function parseReferralProfile(
  lead: Pick<Lead, 'custom'> & { source?: string | null; tags?: string[] | null },
): ReferralProfile | null {
  if (!isReferralLead(lead)) return null
  const bag = (lead.custom || {}) as Record<string, unknown>
  const block = (bag.referral ?? bag.affiliate) as Record<string, unknown> | undefined
  const track = readReferralCustomTrack(lead.custom) || referralTrack(lead)
  const eventName =
    typeof block?.event_name === 'string' && block.event_name.trim()
      ? block.event_name.trim()
      : null

  const rawChannels =
    block?.channels && typeof block.channels === 'object' && !Array.isArray(block.channels)
      ? (block.channels as Record<string, unknown>)
      : {}

  const channels: ReferralChannel[] = Object.entries(rawChannels)
    .filter(([, value]) => typeof value === 'string' && value.trim())
    .map(([id, value]) => {
      const text = String(value).trim()
      return {
        id,
        label: CHANNEL_LABELS[id] || id.replace(/_/g, ' '),
        value: text,
        href: channelHref(text),
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label))

  if (!track && !eventName && channels.length === 0) return null
  return { track, event_name: eventName, channels }
}

/** Drop legacy "Channels:" blocks from notes once channels live in custom.referral. */
export function notesWithoutChannelBlock(notes: string | null | undefined): string {
  if (!notes) return ''
  const lines = notes.split(/\r?\n/)
  const kept: string[] = []
  let skippingChannels = false
  for (const line of lines) {
    if (/^Channels:\s*$/i.test(line.trim())) {
      skippingChannels = true
      continue
    }
    if (skippingChannels) {
      const trimmed = line.trim()
      if (!trimmed) continue
      // Resume notes at freeform sections that are not social channel rows.
      if (/^(Message|Event|Submitted|Coo Crew|Partnership|Phone|Lead|Notes)\b/i.test(trimmed)) {
        skippingChannels = false
      } else if (/^[A-Za-z][\w ./-]*:\s+\S+/.test(trimmed) || /^https?:\/\//i.test(trimmed)) {
        continue
      } else {
        skippingChannels = false
      }
    }
    kept.push(line)
  }
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
