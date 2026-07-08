/**
 * Gmail API integration — full thread + domain context approach.
 *
 * Capabilities:
 * - OAuth flow (connect, token refresh)
 * - Fetch recent messages (metadata + snippet)
 * - Fetch full thread (all messages in a conversation)
 * - Search messages by email domain (company-wide context)
 * - Extract plain-text body from message payloads
 */

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

// ─── OAuth ───

export function getGoogleAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: process.env.GOOGLE_REDIRECT_URI || '',
    response_type: 'code',
    scope: GMAIL_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  email: string
}> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    }),
  })

  if (!tokenRes.ok) throw new Error(`Token exchange failed: ${await tokenRes.text()}`)
  const tokens = await tokenRes.json()

  // Try userinfo endpoint first
  let email: string | undefined
  try {
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const profile = await profileRes.json()
    email = profile.email
    console.log('[Gmail OAuth] userinfo response:', { email: profile.email, id: profile.id })
  } catch (err) {
    console.warn('[Gmail OAuth] userinfo fetch failed:', err)
  }

  // Fallback: get email from Gmail API profile
  if (!email) {
    try {
      const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      const gmailProfile = await gmailRes.json()
      email = gmailProfile.emailAddress
      console.log('[Gmail OAuth] Gmail profile fallback:', { email: gmailProfile.emailAddress })
    } catch (err) {
      console.warn('[Gmail OAuth] Gmail profile fallback failed:', err)
    }
  }

  if (!email) {
    throw new Error('Could not determine email address from Google OAuth')
  }

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    email,
  }
}

export class GmailTokenExpiredError extends Error {
  constructor() {
    super('Gmail connection expired. Please reconnect your Gmail account in Settings.')
    this.name = 'GmailTokenExpiredError'
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    if (body.includes('invalid_grant') || body.includes('Token has been expired or revoked')) {
      throw new GmailTokenExpiredError()
    }
    throw new Error(`Token refresh failed: ${body}`)
  }
  return await res.json()
}

export async function sendGmailMessage(
  accessToken: string,
  input: {
    from: string
    to: string
    subject: string
    body: string
    threadId?: string | null
    attachments?: Array<{
      filename: string
      contentType: string
      data: string
    }>
  },
): Promise<{ id: string; threadId: string }> {
  const sanitizeHeader = (value: string) => value.replace(/[\r\n]+/g, ' ').trim()
  const sanitizeHeaderParam = (value: string) => sanitizeHeader(value).replace(/"/g, "'")
  const wrapBase64 = (value: string) => value.replace(/(.{76})/g, '$1\r\n')
  const encodeBase64 = (value: string) => wrapBase64(Buffer.from(value, 'utf8').toString('base64'))
  const cleanBase64 = (value: string) => value.replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '')

  const validAttachments = (input.attachments || []).filter((attachment) => {
    return attachment.filename.trim() && attachment.contentType.trim() && attachment.data.trim()
  })

  let raw: string
  if (validAttachments.length > 0) {
    const boundary = `rocoto_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const parts = [
      `From: ${sanitizeHeader(input.from)}`,
      `To: ${sanitizeHeader(input.to)}`,
      `Subject: ${sanitizeHeader(input.subject)}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: base64',
      '',
      encodeBase64(input.body),
      ...validAttachments.flatMap((attachment) => [
        `--${boundary}`,
        `Content-Type: ${sanitizeHeader(attachment.contentType)}; name="${sanitizeHeaderParam(attachment.filename)}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${sanitizeHeaderParam(attachment.filename)}"`,
        '',
        wrapBase64(cleanBase64(attachment.data)),
      ]),
      `--${boundary}--`,
      '',
    ]
    raw = parts.join('\r\n')
  } else {
    raw = [
      `From: ${sanitizeHeader(input.from)}`,
      `To: ${sanitizeHeader(input.to)}`,
      `Subject: ${sanitizeHeader(input.subject)}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      input.body,
    ].join('\r\n')
  }

  const encoded = Buffer.from(raw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')

  const res = await fetch(`${GMAIL_API}/messages/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: encoded,
      ...(input.threadId ? { threadId: input.threadId } : {}),
    }),
  })

  if (!res.ok) {
    throw new Error(`Gmail send failed: ${await res.text()}`)
  }

  return await res.json()
}

// ─── Types ───

export interface GmailMessageMetadata {
  id: string
  threadId: string
  subject: string
  from: string
  to: string[]
  date: string
  snippet: string
}

export interface GmailThreadMessage {
  id: string
  threadId: string
  subject: string
  from: string
  to: string[]
  date: string
  snippet: string
  bodyPlainText: string
  direction: 'inbound' | 'outbound'
}

export interface GmailThread {
  threadId: string
  subject: string
  messages: GmailThreadMessage[]
  participantEmails: string[]
}

// ─── Helpers ───

function getHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || ''
}

export function extractEmailAddress(address: string): string | null {
  const match = address.match(/<([^>]+)>/) || address.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
  return match ? (match[1] || match[0]).toLowerCase() : null
}

export function extractDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() || ''
}

function decodeBase64Url(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/')
  try {
    return Buffer.from(padded, 'base64').toString('utf-8')
  } catch {
    return ''
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function extractPlainText(payload: Record<string, unknown>): string {
  if (!payload) return ''

  const mimeType = payload.mimeType as string
  const body = payload.body as { data?: string; size?: number } | undefined
  const parts = payload.parts as Array<Record<string, unknown>> | undefined

  if (mimeType === 'text/plain' && body?.data) {
    return decodeBase64Url(body.data)
  }

  if (parts) {
    for (const part of parts) {
      const text = extractPlainText(part)
      if (text) return text
    }
  }

  if (body?.data) {
    return decodeBase64Url(body.data)
  }

  return ''
}

// ─── Fetch recent messages (metadata only, for initial scan) ───

export async function fetchRecentMessages(
  accessToken: string,
  maxResults = 20
): Promise<GmailMessageMetadata[]> {
  const listRes = await fetch(
    `${GMAIL_API}/messages?maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!listRes.ok) throw new Error(`Gmail list failed: ${listRes.status}`)

  const list = await listRes.json()
  if (!list.messages?.length) return []

  const messages: GmailMessageMetadata[] = []

  for (const msg of list.messages.slice(0, maxResults)) {
    const detailRes = await fetch(
      `${GMAIL_API}/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!detailRes.ok) continue

    const detail = await detailRes.json()
    const headers = detail.payload?.headers || []

    messages.push({
      id: detail.id,
      threadId: detail.threadId,
      subject: decodeHtmlEntities(getHeader(headers, 'Subject')),
      from: getHeader(headers, 'From'),
      to: getHeader(headers, 'To').split(',').map((t: string) => t.trim()),
      date: getHeader(headers, 'Date'),
      snippet: decodeHtmlEntities(detail.snippet || ''),
    })
  }

  return messages
}

// ─── Fetch a full thread (all messages with bodies) ───

export async function fetchFullThread(
  accessToken: string,
  threadId: string,
  myEmailAddress: string
): Promise<GmailThread> {
  const res = await fetch(
    `${GMAIL_API}/threads/${threadId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) throw new Error(`Gmail thread fetch failed: ${res.status}`)

  const thread = await res.json()
  const messages: GmailThreadMessage[] = []
  const participantEmails = new Set<string>()
  let threadSubject = ''

  const myDomain = extractDomain(myEmailAddress)

  for (const msg of thread.messages || []) {
    const headers = msg.payload?.headers || []
    const from = getHeader(headers, 'From')
    const to = getHeader(headers, 'To')
    const subject = getHeader(headers, 'Subject')
    const date = getHeader(headers, 'Date')

    if (!threadSubject) threadSubject = subject

    const fromEmail = extractEmailAddress(from)
    if (fromEmail) participantEmails.add(fromEmail)

    const toEmails = to.split(',').map((t: string) => extractEmailAddress(t.trim())).filter(Boolean) as string[]
    toEmails.forEach(e => participantEmails.add(e))

    const isFromMe = fromEmail ? extractDomain(fromEmail) === myDomain : false

    const rawBody = extractPlainText(msg.payload) || msg.snippet || ''
    const bodyText = decodeHtmlEntities(rawBody)

    messages.push({
      id: msg.id,
      threadId: msg.threadId,
      subject: decodeHtmlEntities(subject),
      from,
      to: to.split(',').map((t: string) => t.trim()),
      date,
      snippet: decodeHtmlEntities(msg.snippet || ''),
      bodyPlainText: bodyText.slice(0, 3000),
      direction: isFromMe ? 'outbound' : 'inbound',
    })
  }

  return {
    threadId,
    subject: threadSubject,
    messages: messages.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    participantEmails: Array.from(participantEmails),
  }
}

// ─── Search messages by specific email address ───

export async function fetchThreadsByEmail(
  accessToken: string,
  email: string,
  maxResults = 15
): Promise<string[]> {
  const query = `from:${email} OR to:${email}`
  const url = `${GMAIL_API}/threads?q=${encodeURIComponent(query)}&maxResults=${maxResults}`
  console.log('[Gmail] fetchThreadsByEmail:', { email, query, url: url.replace(accessToken, '***') })

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })

  if (!res.ok) {
    const errorText = await res.text()
    console.error('[Gmail] Thread search failed:', res.status, errorText)
    return []
  }

  const data = await res.json()
  const threadIds = (data.threads || []).map((t: { id: string }) => t.id)
  console.log('[Gmail] fetchThreadsByEmail result:', { email, resultSizeEstimate: data.resultSizeEstimate, threadsFound: threadIds.length })
  return threadIds
}
