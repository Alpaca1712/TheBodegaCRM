/**
 * Which inbound signups can credit a referrer.
 * Blog, Coo Crew (affiliates/events), and partnerships do not count.
 */
export function isCreditableReferralSource(source: string | null | undefined): boolean {
  const s = (source || '').toLowerCase().trim()
  if (!s) return false

  if (
    s === 'pigeonlabs_blog_subscription' ||
    s === 'landing:blog' ||
    s.startsWith('pigeonlabs_blog') ||
    s.includes('blog_subscription')
  ) {
    return false
  }

  if (
    s === 'landing:affiliates' ||
    s === 'landing:events' ||
    s.startsWith('pigeonlabs_affiliates') ||
    s.startsWith('pigeonlabs_events') ||
    s.startsWith('event:') ||
    s.includes('affiliates') ||
    s.includes('referral_influencer') ||
    s.includes('referral_event')
  ) {
    return false
  }

  if (
    s === 'landing:partnerships' ||
    s.startsWith('pigeonlabs_partnerships') ||
    s.includes('partnership')
  ) {
    return false
  }

  return true
}
