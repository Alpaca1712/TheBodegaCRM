import type { EmailStatus, Lead } from '@/types'

/** Statuses that mean Hunter (or equivalent) verified the address as sendable. */
export const SENDABLE_EMAIL_STATUSES: readonly EmailStatus[] = ['valid', 'accept_all', 'webmail']

export function isEmailStatusSendable(status: EmailStatus | string | null | undefined): boolean {
  return SENDABLE_EMAIL_STATUSES.includes((status || 'unverified') as EmailStatus)
}

/** Why this lead must not receive outbound mail, or null if ok. */
export function leadSendBlockReason(lead: Pick<Lead, 'email' | 'email_status' | 'do_not_contact' | 'unsubscribed_at' | 'bounced_at'>): string | null {
  if (lead.do_not_contact) return 'do_not_contact'
  if (lead.unsubscribed_at) return 'unsubscribed'
  if (lead.bounced_at) return 'bounced'
  if (lead.email_status === 'invalid') return 'invalid_email'
  if (lead.email_status === 'disposable') return 'disposable_email'
  if (!isEmailStatusSendable(lead.email_status)) return 'unverified_email'
  return null
}
