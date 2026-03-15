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
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`)
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
      subject: getHeader(headers, 'Subject'),
      from: getHeader(headers, 'From'),
      to: getHeader(headers, 'To').split(',').map((t: string) => t.trim()),
      date: getHeader(headers, 'Date'),
      snippet: detail.snippet || '',
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

    const bodyText = extractPlainText(msg.payload) || msg.snippet || ''

    messages.push({
      id: msg.id,
      threadId: msg.threadId,
      subject,
      from,
      to: to.split(',').map((t: string) => t.trim()),
      date,
      snippet: msg.snippet || '',
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

// ─── Search messages by domain (company-wide context) ───

export async function fetchThreadsByDomain(
  accessToken: string,
  domain: string,
  maxResults = 10
): Promise<string[]> {
  const query = `from:@${domain} OR to:@${domain}`
  const url = `${GMAIL_API}/threads?q=${encodeURIComponent(query)}&maxResults=${maxResults}`
  console.log('[Gmail] fetchThreadsByDomain:', { domain, query })

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })

  if (!res.ok) {
    const errorText = await res.text()
    console.error('[Gmail] Domain thread search failed:', res.status, errorText)
    return []
  }

  const data = await res.json()
  const threadIds = (data.threads || []).map((t: { id: string }) => t.id)
  console.log('[Gmail] fetchThreadsByDomain result:', { domain, threadsFound: threadIds.length })
  return threadIds
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

// ─── Build full conversation context for a lead ───

export async function buildConversationContext(
  accessToken: string,
  myEmailAddress: string,
  contactEmail: string,
  options?: { includeDomainContext?: boolean; maxThreads?: number }
): Promise<{
  directThreads: GmailThread[]
  domainThreads: GmailThread[]
  totalMessages: number
  allParticipants: string[]
}> {
  const maxThreads = options?.maxThreads ?? 10
  const domain = extractDomain(contactEmail)

  const directThreadIds = await fetchThreadsByEmail(accessToken, contactEmail, maxThreads)
  const directThreads: GmailThread[] = []

  for (const threadId of directThreadIds) {
    try {
      const thread = await fetchFullThread(accessToken, threadId, myEmailAddress)
      directThreads.push(thread)
    } catch (err) {
      console.error(`Failed to fetch thread ${threadId}:`, err)
    }
  }

  let domainThreads: GmailThread[] = []
  if (options?.includeDomainContext && domain) {
    const domainThreadIds = await fetchThreadsByDomain(accessToken, domain, maxThreads)
    const newDomainIds = domainThreadIds.filter(id => !directThreadIds.includes(id))

    for (const threadId of newDomainIds.slice(0, 5)) {
      try {
        const thread = await fetchFullThread(accessToken, threadId, myEmailAddress)
        domainThreads.push(thread)
      } catch (err) {
        console.error(`Failed to fetch domain thread ${threadId}:`, err)
      }
    }
  }

  const allParticipants = new Set<string>()
  const allThreads = [...directThreads, ...domainThreads]
  allThreads.forEach(t => t.participantEmails.forEach(e => allParticipants.add(e)))

  const totalMessages = allThreads.reduce((sum, t) => sum + t.messages.length, 0)

  return {
    directThreads,
    domainThreads,
    totalMessages,
    allParticipants: Array.from(allParticipants),
  }
}
