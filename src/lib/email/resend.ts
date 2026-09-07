import { Resend } from 'resend'

let client: Resend | null = null

export function resendConfigured() {
  return Boolean(process.env.RESEND_API_KEY)
}

export function resend(): Resend {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured')
  if (!client) client = new Resend(process.env.RESEND_API_KEY)
  return client
}

export function formatAddress(name: string | null | undefined, email: string) {
  const clean = (name || '').replace(/[\r\n"<>]/g, '').trim()
  return clean ? `"${clean}" <${email}>` : email
}

export function parseAddress(value: string): { name: string | null; email: string } {
  const match = /^\s*(?:"?([^"<]*)"?\s*)?<([^>]+)>\s*$/.exec(value)
  if (match) return { name: match[1]?.trim() || null, email: match[2].trim().toLowerCase() }
  return { name: null, email: value.trim().toLowerCase() }
}
