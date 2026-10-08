import type { Lead } from '@/types'
import { isReferralLead } from './referral'

/** Console / list filter channels. */
export const LEAD_CHANNEL_VALUES = ['blog', 'web', 'partnerships'] as const
export type LeadChannel = (typeof LEAD_CHANNEL_VALUES)[number]

export const BLOG_TAG = 'blog' as const
export const BLOG_SUBSCRIBER_TAG = 'blog_subscriber' as const
export const PARTNERSHIP_TAG = 'partnership' as const
/** Generic website inbound (home, pentest, playbook) - not blog / affiliate / partnership. */
export const WEB_TAG = 'web' as const

export const LEAD_CHANNEL_FILTERS: { value: LeadChannel | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'blog', label: 'Blog' },
  { value: 'web', label: 'Web' },
  { value: 'partnerships', label: 'Partnerships' },
]

function sourceIsBlog(source: string): boolean {
  return (
    source === 'pigeonlabs_blog_subscription' ||
    source === 'landing:blog' ||
    source.startsWith('pigeonlabs_blog')
  )
}

function sourceIsPartnership(source: string): boolean {
  return source === 'landing:partnerships' || source.startsWith('pigeonlabs_partnerships')
}

function sourceIsAffiliateOrEvent(source: string): boolean {
  return (
    source === 'landing:affiliates' ||
    source === 'landing:events' ||
    source.startsWith('pigeonlabs_affiliates') ||
    source.startsWith('pigeonlabs_events') ||
    source.startsWith('event:')
  )
}

function sourceIsWebsiteInbound(source: string): boolean {
  return (
    source === 'landing' ||
    source === 'web_inbound' ||
    source.startsWith('landing:') ||
    source.startsWith('pigeonlabs_')
  )
}

/** Supabase `.or()` for real blog segment only. */
export const BLOG_CHANNEL_OR = [
  `tags.cs.{${BLOG_SUBSCRIBER_TAG}}`,
  'source.eq.pigeonlabs_blog_subscription',
  'source.eq.landing:blog',
  'source.ilike."pigeonlabs_blog%"',
].join(',')

/** Supabase `.or()` for non-blog website inbound (home / pentest / playbook). */
export const WEB_CHANNEL_OR = [
  `tags.cs.{${WEB_TAG}}`,
  'tags.cs.{web_inbound}',
  'source.eq.landing',
  'source.eq.web_inbound',
  'source.eq.landing:home',
  'source.ilike."landing:pentest%"',
  'source.ilike."pigeonlabs_pentest%"',
  'source.ilike."pigeonlabs_playbook%"',
  'source.ilike."landing:%"',
  'source.ilike."pigeonlabs_%"',
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
  return sourceIsPartnership(source)
}

/** True only for newsletter / blog-index signups, not general landing forms. */
export function isBlogLead(lead: Pick<Lead, 'source' | 'tags'>): boolean {
  if (isReferralLead(lead) || isPartnershipLead(lead)) return false
  const tags = lead.tags || []
  const source = (lead.source || '').toLowerCase()
  if (tags.includes(BLOG_SUBSCRIBER_TAG) || sourceIsBlog(source)) return true
  // `blog` tag alone is enough only when source is blog-shaped or missing
  // (legacy rows). Do not treat landing:pentest as blog just because of the tag.
  if (tags.includes(BLOG_TAG) && (!source || sourceIsBlog(source))) return true
  return false
}

export function isWebLead(lead: Pick<Lead, 'source' | 'tags'>): boolean {
  if (isReferralLead(lead) || isPartnershipLead(lead) || isBlogLead(lead)) return false
  const tags = lead.tags || []
  const source = (lead.source || '').toLowerCase()
  if (tags.includes(WEB_TAG) || tags.includes('web_inbound')) return true
  return sourceIsWebsiteInbound(source) && !sourceIsAffiliateOrEvent(source)
}

export function channelLabelForLead(
  lead: Pick<Lead, 'source' | 'tags'>,
): string | null {
  if (isPartnershipLead(lead)) return 'Partnership'
  if (isBlogLead(lead)) return 'Blog'
  if (isWebLead(lead)) return 'Web'
  return null
}

/** Infer blog / web / partnership tags when creating from source. */
export function inferChannelTags(input: {
  source?: string | null
  tags?: string[] | null
}): string[] {
  const existing = new Set(input.tags || [])
  const source = (input.source || '').toLowerCase().trim()

  if (sourceIsPartnership(source)) {
    existing.add(PARTNERSHIP_TAG)
    existing.delete(BLOG_TAG)
    existing.delete(WEB_TAG)
    return Array.from(existing)
  }

  if (sourceIsBlog(source) || existing.has(BLOG_SUBSCRIBER_TAG)) {
    existing.add(BLOG_TAG)
    if (source === 'pigeonlabs_blog_subscription' || existing.has(BLOG_SUBSCRIBER_TAG)) {
      existing.add(BLOG_SUBSCRIBER_TAG)
    }
    existing.delete(WEB_TAG)
    return Array.from(existing)
  }

  if (sourceIsAffiliateOrEvent(source)) {
    existing.delete(BLOG_TAG)
    existing.delete(WEB_TAG)
    return Array.from(existing)
  }

  // Generic website inbound (home, pentest, playbook, etc.) → Web, not Blog.
  if (sourceIsWebsiteInbound(source)) {
    existing.add(WEB_TAG)
    existing.delete(BLOG_TAG)
  }

  return Array.from(existing)
}
