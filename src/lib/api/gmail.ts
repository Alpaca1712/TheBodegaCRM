/**
 * Gmail API integration — metadata-only approach.
 *
 * Flow:
 * 1. User clicks "Connect Gmail" → redirected to Google OAuth consent
 * 2. Google redirects back with auth code → exchanged for tokens
 * 3. Tokens stored in email_accounts table (encrypted at rest via Supabase)
 * 4. Sync fetches message metadata + snippets (no full body stored)
 * 5. AI summarizes each email via Novita API
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_REDIRECT_URI  (e.g. https://the-bodega-crm.vercel.app/api/gmail/callback)
 */

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.metadata',
].join(' ')

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

  if (!tokenRes.ok) {
    const text = await tokenRes.text()
    throw new Error(`Token exchange failed: ${text}`)
  }

  const tokens = await tokenRes.json()

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const profile = await profileRes.json()

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    email: profile.email,
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
    const text = await res.text()
    throw new Error(`Token refresh failed: ${text}`)
  }

  return await res.json()
}

export interface GmailMessageMetadata {
  id: string
  threadId: string
  subject: string
  from: string
  to: string[]
  date: string
  snippet: string
}

export async function fetchRecentMessages(
  accessToken: string,
  maxResults = 20
): Promise<GmailMessageMetadata[]> {
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!listRes.ok) {
    throw new Error(`Gmail list failed: ${listRes.status}`)
  }

  const list = await listRes.json()
  if (!list.messages?.length) return []

  const messages: GmailMessageMetadata[] = []

  for (const msg of list.messages.slice(0, maxResults)) {
    const detailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!detailRes.ok) continue

    const detail = await detailRes.json()
    const headers = detail.payload?.headers || []

    const getHeader = (name: string) =>
      headers.find((h: { name: string; value: string }) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

    messages.push({
      id: detail.id,
      threadId: detail.threadId,
      subject: getHeader('Subject'),
      from: getHeader('From'),
      to: getHeader('To').split(',').map((t: string) => t.trim()),
      date: getHeader('Date'),
      snippet: detail.snippet || '',
    })
  }

  return messages
}
