import { renderCampaignTemplate } from '@/lib/campaigns/automation'
import type { Lead } from '@/types/leads'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const DOCS_API = 'https://docs.googleapis.com/v1/documents'

export interface GoogleDocLeadMagnet {
  id: string
  name: string
  google_doc_id: string
  google_doc_url: string | null
  cta_phrase: string
  cta_link_text: string
  filename_template: string
}

export function extractGoogleDocId(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''

  const match = trimmed.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)
  if (match?.[1]) return match[1]

  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed
  return ''
}

export function safePdfFilename(input: string) {
  const cleaned = input
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  return `${cleaned || 'lead-magnet'}.pdf`.replace(/\.pdf\.pdf$/i, '.pdf')
}

async function googleFetch(accessToken: string, url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers || {}),
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google API failed (${res.status}): ${body}`)
  }

  return res
}

async function copyGoogleDoc(accessToken: string, sourceDocId: string, name: string) {
  const res = await googleFetch(accessToken, `${DRIVE_API}/files/${sourceDocId}/copy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  const data = await res.json()
  if (!data?.id) throw new Error('Google Drive did not return a copied document id')
  return data.id as string
}

async function trashGoogleFile(accessToken: string, fileId: string) {
  try {
    await googleFetch(accessToken, `${DRIVE_API}/files/${fileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trashed: true }),
    })
  } catch (error) {
    console.warn('Failed to trash temporary lead magnet document', { fileId, error })
  }
}

type TextRun = {
  content?: string
  startIndex?: number
  endIndex?: number
}

function collectTextRuns(value: unknown, runs: TextRun[] = []) {
  if (!value || typeof value !== 'object') return runs
  const node = value as Record<string, unknown>

  if (node.textRun && typeof node.textRun === 'object') {
    runs.push({
      content: (node.textRun as { content?: string }).content || '',
      startIndex: typeof node.startIndex === 'number' ? node.startIndex : undefined,
      endIndex: typeof node.endIndex === 'number' ? node.endIndex : undefined,
    })
  }

  for (const child of Object.values(node)) {
    if (Array.isArray(child)) {
      child.forEach((item) => collectTextRuns(item, runs))
    } else if (child && typeof child === 'object') {
      collectTextRuns(child, runs)
    }
  }

  return runs
}

function findLinkRange(document: unknown, phrase: string, linkText: string) {
  const runs = collectTextRuns(document)
    .filter((run) => run.content && typeof run.startIndex === 'number')
    .sort((a, b) => (a.startIndex || 0) - (b.startIndex || 0))

  const fullText = runs.map((run) => run.content || '').join('')
  const phraseIndex = fullText.toLowerCase().indexOf(phrase.toLowerCase())
  if (phraseIndex === -1) {
    throw new Error(`Could not find CTA phrase in Google Doc: "${phrase}"`)
  }

  const phraseText = fullText.slice(phraseIndex, phraseIndex + phrase.length)
  const linkIndexWithinPhrase = phraseText.toLowerCase().indexOf(linkText.toLowerCase())
  if (linkIndexWithinPhrase === -1) {
    throw new Error(`Could not find link text "${linkText}" inside CTA phrase.`)
  }

  const absoluteStart = phraseIndex + linkIndexWithinPhrase
  const absoluteEnd = absoluteStart + linkText.length
  let cursor = 0
  let startIndex: number | null = null
  let endIndex: number | null = null

  for (const run of runs) {
    const content = run.content || ''
    const nextCursor = cursor + content.length
    const docStart = run.startIndex || 0

    if (startIndex === null && absoluteStart >= cursor && absoluteStart <= nextCursor) {
      startIndex = docStart + (absoluteStart - cursor)
    }
    if (endIndex === null && absoluteEnd >= cursor && absoluteEnd <= nextCursor) {
      endIndex = docStart + (absoluteEnd - cursor)
      break
    }

    cursor = nextCursor
  }

  if (!startIndex || !endIndex || endIndex <= startIndex) {
    throw new Error('Could not map CTA link text to Google Doc indexes.')
  }

  return { startIndex, endIndex }
}

async function applyHyperlink(accessToken: string, docId: string, range: { startIndex: number; endIndex: number }, url: string) {
  await googleFetch(accessToken, `${DOCS_API}/${docId}:batchUpdate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          updateTextStyle: {
            range,
            textStyle: {
              link: { url },
              foregroundColor: {
                color: { rgbColor: { red: 0.85, green: 0.04, blue: 0.08 } },
              },
              underline: true,
            },
            fields: 'link,foregroundColor,underline',
          },
        },
      ],
    }),
  })
}

async function exportPdf(accessToken: string, docId: string) {
  const res = await googleFetch(accessToken, `${DRIVE_API}/files/${docId}/export?mimeType=application/pdf`)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function generateLeadMagnetPdfFromGoogleDoc({
  accessToken,
  leadMagnet,
  lead,
  challengeLink,
}: {
  accessToken: string
  leadMagnet: GoogleDocLeadMagnet
  lead: Pick<Lead, 'contact_name' | 'company_name' | 'contact_title' | 'contact_email'>
  challengeLink: string
}) {
  const filename = safePdfFilename(renderCampaignTemplate({
    template: leadMagnet.filename_template || '{{company_name}} - {{lead_magnet}}.pdf',
    lead,
    challengeLink,
    leadMagnetName: leadMagnet.name,
  }))
  const copyName = filename.replace(/\.pdf$/i, '')
  const copyId = await copyGoogleDoc(accessToken, leadMagnet.google_doc_id, copyName)

  try {
    const docRes = await googleFetch(accessToken, `${DOCS_API}/${copyId}?fields=body/content`)
    const doc = await docRes.json()
    const range = findLinkRange(doc, leadMagnet.cta_phrase, leadMagnet.cta_link_text)
    await applyHyperlink(accessToken, copyId, range, challengeLink)
    const pdf = await exportPdf(accessToken, copyId)

    return {
      filename,
      contentType: 'application/pdf',
      data: pdf,
      base64: pdf.toString('base64'),
    }
  } finally {
    await trashGoogleFile(accessToken, copyId)
  }
}
