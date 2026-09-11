import { getSetting } from '@/lib/settings'
import { formatAddress, resend, resendConfigured } from '@/lib/email/resend'
import { escapeHtml } from '@/lib/email/render'
import { appBaseUrl } from '@/lib/leads/tokens'
import type { Email, InboundFlow, Lead } from '@/types'

type Kind = 'inbound_lead' | 'reply' | 'bounce'

const TOGGLE: Record<Kind, 'on_inbound_lead' | 'on_reply' | 'on_bounce'> = {
  inbound_lead: 'on_inbound_lead',
  reply: 'on_reply',
  bounce: 'on_bounce',
}

const DEFAULT_NOTIFY_TO = 'hello@pigeonlabs.ai'

function leadLine(lead: Lead) {
  return [lead.full_name || lead.email, lead.title, lead.company_name].filter(Boolean).join(' · ')
}

function consoleLink(lead: Lead) {
  return `${appBaseUrl()}/leads/${lead.id}`
}

/**
 * Owner notifications (new landing lead, reply, bounce). Best-effort: a failure
 * here must never break the request that triggered it.
 */
export async function notifyOwner(
  kind: Kind,
  subject: string,
  lines: string[],
  options?: { force?: boolean },
): Promise<boolean> {
  try {
    const settings = await getSetting('notifications')
    const emailTo = (process.env.NOTIFY_EMAIL_TO || settings.email_to || DEFAULT_NOTIFY_TO).trim()
    if (!emailTo) {
      console.warn('[notify] skipped: no recipient')
      return false
    }
    if (!options?.force && !settings[TOGGLE[kind]]) {
      console.warn('[notify] skipped: toggle off', kind)
      return false
    }
    if (!resendConfigured()) {
      console.warn('[notify] skipped: RESEND_API_KEY missing')
      return false
    }
    const sender = await getSetting('sender')
    const text = lines.join('\n')
    const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#111;">${lines
      .map((line) => {
        const url = /^https?:\/\/\S+$/.exec(line.trim())
        return url ? `<p><a href="${url[0]}">${url[0]}</a></p>` : `<p style="margin:0 0 .4em 0;white-space:pre-wrap;">${escapeHtml(line)}</p>`
      })
      .join('')}</div>`
    const { error } = await resend().emails.send({
      from: formatAddress('Bodega', sender.from_email),
      to: [emailTo],
      subject,
      text,
      html,
      tags: [{ name: 'kind', value: `notification_${kind}` }],
    })
    if (error) {
      console.warn('[notify] resend error', error.message)
      return false
    }
    return true
  } catch (error) {
    console.warn('[notify] failed', error)
    return false
  }
}

export function notifyInboundLead(lead: Lead, flow: InboundFlow | null, payload: Record<string, unknown>, createdNew: boolean) {
  const answers = Object.entries(payload)
    .filter(([key, value]) => !['flow', 'lead_token', 'name', 'email', 'contact_name', 'contact_email'].includes(key) && value != null && value !== '' && typeof value !== 'object')
    .map(([key, value]) => `${key}: ${String(value)}`)
  return notifyOwner('inbound_lead', `New website lead: ${leadLine(lead)}`, [
    `${createdNew ? 'New lead' : 'Returning lead'} via ${flow ? `${flow.name} (${flow.key})` : 'unknown flow'}.`,
    '',
    leadLine(lead),
    lead.email,
    lead.phone ? `Phone: ${lead.phone}` : '',
    lead.company_website ? `Website: ${lead.company_website}` : '',
    '',
    ...answers,
    '',
    consoleLink(lead),
  ].filter((line, index, all) => !(line === '' && all[index - 1] === '')))
}

export function notifyReply(lead: Lead, email: Email) {
  const preview = (email.text_body || '').split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith('>')).slice(0, 8).join('\n')
  return notifyOwner('reply', `Reply from ${leadLine(lead)}`, [
    `Subject: ${email.subject || '(no subject)'}`,
    '',
    preview || '(empty body)',
    '',
    consoleLink(lead),
  ])
}

export function notifyBounce(lead: Lead, reason: string) {
  return notifyOwner('bounce', `Bounce: ${lead.email}`, [leadLine(lead), reason, '', consoleLink(lead)])
}
