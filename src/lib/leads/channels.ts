import type { Lead } from '@/types'
import { isReferralLead } from './referral'

/** Console / list filter channels (replaces web_inbound + cold_email). */
export const LEAD_CHANNEL_VALUES = ['blog', 'partnerships'] as const
export type LeadChannel = (typeof LEAD_CHANNEL_VALUES)[number]

export const BLOG_TAG = 'blog' as const
export const BLOG_SUBSCRIBER_TAG = 'blog_subscriber' as const
export const PARTNERSHIP_TAG = 'partnership' as const

export const LEAD_CHANNEL_FILTERS: { value: LeadChannel | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'blog', label: 'Blog' },
  { value: 'partnerships', label: 'Partnerships' },
]

/** Supabase `.or()` for blog segment (after migration tags former Web leads with `blog`). */
export const BLOG_CHANNEL_OR = [
  `tags.cs.{${BLOG_TAG}}`,
  `tags.cs.{${BLOG_SUBSCRIBER_TAG}}`,
  'source.eq.pigeonlabs_blog_subscription',
  'source.eq.landing:blog',
  'source.ilike."pigeonlabs_blog%"',
].join(',')

/** Supabase `.or()` for partnerships segment. */
export const PARTNERSHIPS_CHANNEL_OR = [
  `tags.cs.{${PARTNERSHIP_TAG}}`,
  'source.eq.landing:partnerships',
  'source.ilike."pigeonlabs_partnerships%"',
].join(',')

export function isPartnershipLead(
  lead: Pick<Lead, 'source' | 'tags'>,
): boolean {
  const tags = lead.tags || []
  const source = (lead.source || '').toLowerCase()
  if (tags.includes(PARTNERSHIP_TAG)) return true
  return (
    source === 'landing:partnerships' ||
    source.startsWith('pigeonlabs_partnerships')
  )
}

export function isBlogLead(lead: Pick<Lead, 'source' | 'tags'>): boolean {
  if (isReferralLead(lead) || isPartnershipLead(lead)) return false
  const tags = lead.tags || []
  const source = (lead.source || '').toLowerCase()
  if (tags.includes(BLOG_TAG) || tags.includes(BLOG_SUBSCRIBER_TAG)) return true
  if (
    source === 'pigeonlabs_blog_subscription' ||
    source === 'landing:blog' ||
    source.startsWith('pigeonlabs_blog')
  ) {
    return true
  }
  // Former "Web" bucket after migration (generic site inbound).
  if (tags.includes('web_inbound')) return true
  if (
    source === 'landing' ||
    source === 'web_inbound' ||
    source.startsWith('landing:') ||
    source.startsWith('pigeonlabs_')
  ) {
    return true
  }
  return false
}

export function channelLabelForLead(
  lead: Pick<Lead, 'source' | 'tags'>,
): string | null {
  if (isPartnershipLead(lead)) return 'Partnership'
  if (isBlogLead(lead)) return 'Blog'
  return null
}

/** Infer blog / partnership tags when creating or updating from source. */
export function inferChannelTags(input: {
  source?: string | null
  tags?: string[] | null
}): string[] {
  const existing = new Set(input.tags || [])
  const source = (input.source || '').toLowerCase().trim()

  if (
    source === 'landing:partnerships' ||
    source.startsWith('pigeonlabs_partnerships')
  ) {
    existing.add(PARTNERSHIP_TAG)
    return Array.from(existing)
  }

  if (
    source === 'pigeonlabs_blog_subscription' ||
    source === 'landing:blog' ||
    source.startsWith('pigeonlabs_blog') ||
    existing.has(BLOG_SUBSCRIBER_TAG)
  ) {
    existing.add(BLOG_TAG)
    if (source === 'pigeonlabs_blog_subscription' || existing.has(BLOG_SUBSCRIBER_TAG)) {
      existing.add(BLOG_SUBSCRIBER_TAG)
    }
    return Array.from(existing)
  }

  // Generic website inbound (home, pentest, playbook, etc.) → Blog segment.
  if (
    source === 'landing' ||
    source === 'web_inbound' ||
    source.startsWith('landing:') ||
    source.startsWith('pigeonlabs_')
  ) {
    // Affiliates / events keep referral tags only; do not force Blog.
    if (
      source === 'landing:affiliates' ||
      source === 'landing:events' ||
      source.startsWith('pigeonlabs_affiliates') ||
      source.startsWith('pigeonlabs_events') ||
      source.startsWith('event:')
    ) {
      return Array.from(existing)
    }
    existing.add(BLOG_TAG)
  }

  return Array.from(existing)
}
