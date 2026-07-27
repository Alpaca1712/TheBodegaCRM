import type { Lead, LeadEmail } from '@/types/leads'
import { getGroundedResearchEvidence } from './research-grounding'
import {
  conflictingResearchSourceUrls,
  isConflictingResearchSource,
} from './research-identity'

export interface EmailEvidence {
  fact: string
  label: string
  sourceUrl?: string
}

export interface EvidenceAwareDraft {
  subject: string
  body: string
  channel?: 'email' | 'linkedin' | 'twitter'
  evidence_used: string[]
}

export class UngroundedEmailError extends Error {
  constructor() {
    super('Draft blocked because it included details that are not backed by CRM evidence.')
    this.name = 'UngroundedEmailError'
  }
}

export class MissingOutreachHookError extends Error {
  constructor() {
    super(
      'Auto-Research did not capture a source-backed product hook. Run Auto-Research again before generating the first email.',
    )
    this.name = 'MissingOutreachHookError'
  }
}

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalized(value: string): string {
  return clean(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function splitContext(value: string | null | undefined): string[] {
  return (value || '')
    .split(/\n+/)
    .map(clean)
    .filter(value => value.length >= 3)
}

export function buildEmailEvidence(input: {
  lead: Lead
  customContext?: string
  emailThread?: LeadEmail[]
}): EmailEvidence[] {
  const { lead, customContext, emailThread = [] } = input
  const evidence: EmailEvidence[] = []
  const seen = new Set<string>()

  const add = (label: string, fact: string | null | undefined, sourceUrl?: string) => {
    if (!fact) return
    const cleaned = clean(fact)
    const key = normalized(cleaned)
    if (!key || seen.has(key)) return
    seen.add(key)
    evidence.push({ label, fact: cleaned, sourceUrl })
  }

  add('CRM contact name', lead.contact_name)
  add('CRM contact title', lead.contact_title)
  add('CRM company name', lead.company_name)
  add('CRM product name', lead.product_name)
  add('CRM fund name', lead.fund_name)

  const conflictingSourceUrls = conflictingResearchSourceUrls(
    lead.contact_name,
    lead.research_sources,
  )
  const identitySafeSources = (lead.research_sources || []).filter(
    source => !isConflictingResearchSource(source.url, conflictingSourceUrls),
  )

  for (const source of getGroundedResearchEvidence(identitySafeSources)) {
    add(`Verified research: ${source.sourceTitle}`, source.fact, source.sourceUrl)
  }

  for (const note of splitContext(lead.notes)) {
    add('Manual CRM note', note)
  }

  for (const line of splitContext(customContext)) {
    add('Campaign or user-provided context', line)
  }

  for (const email of emailThread) {
    add('Email thread subject', email.subject)
    for (const line of splitContext(email.body)) {
      add('Email thread message', line)
    }
  }

  add('Pigeon identity', 'Pigeon helps SaaS companies stay secure.')
  add(
    'Pigeon identity',
    'Pigeon finds practical security weaknesses in SaaS products before attackers do and helps the team fix them.',
  )
  add(
    'Pigeon identity',
    'Pigeon is a new cybersecurity startup founded by Daniel Chalco.',
  )
  add(
    'Pigeon identity',
    'Daniel Chalco has 15 years of cybersecurity experience.',
  )
  add(
    'Pigeon identity',
    'Pigeon tests the security of AI agents and SaaS products.',
  )
  add(
    'Pigeon identity',
    'Daniel Chalco previously worked in restaurants as a host, busser, and barback.',
  )
  add(
    'Pigeon identity',
    'Pigeon offers a free pentest and delivers the findings within 48 hours.',
  )
  add(
    'Pigeon identity',
    'The "We Hack AI Agents" guide covers three recurring AI-agent security issues and includes checks that take about 15 minutes.',
  )
  add(
    'Pigeon identity',
    'The "Don\'t Let Security Reviews Kill Your Deals" guide explains compliance and pentest timing for SaaS teams before SOC 2 or a first enterprise security review.',
  )

  return evidence
}

export function formatEmailEvidence(evidence: EmailEvidence[]): string {
  if (evidence.length === 0) {
    return 'No verified evidence is available. Use only generic role relevance and do not add a personal anecdote.'
  }

  return evidence
    .map((item, index) => {
      const source = item.sourceUrl ? `\n  Source: ${item.sourceUrl}` : ''
      return `${index + 1}. [${item.label}] ${item.fact}${source}`
    })
    .join('\n')
}

function hasSupport(claim: string, evidence: EmailEvidence[]): boolean {
  const claimKey = normalized(claim)
  if (!claimKey) return false

  return evidence.some(item => {
    const evidenceKey = normalized(item.fact)
    return evidenceKey === claimKey || evidenceKey.includes(claimKey)
  })
}

function unsupportedNumber(text: string, evidence: EmailEvidence[]): boolean {
  const allowed = evidence.map(item => item.fact).join(' ').toLowerCase()
  const tokens = text.match(/(?:[$€£]\s*)?\d[\d,.]*(?:\s*%|\s*x|\s*-\s*[a-z]+)?/gi) || []

  return tokens.some(token => !allowed.includes(token.toLowerCase().replace(/\s+/g, ' ').trim()))
}

const BIOGRAPHY_PATTERN =
  /\b(?:you|your|they|their|he|his|she|her)\b[^.!?\n]{0,100}\b(?:wrote|said|shared|spoke|podcast|career|founded|launched|worked|studied|student|pilot|budget|grew up|between)\b/i

function hasUnsupportedBiography(body: string, usedEvidence: string[]): boolean {
  const evidenceWords = new Set(
    usedEvidence
      .flatMap(value => normalized(value).split(' '))
      .filter(word => word.length >= 5),
  )

  return body
    .split(/[.!?\n]+/)
    .filter(sentence => BIOGRAPHY_PATTERN.test(sentence))
    .some(sentence => {
      if (evidenceWords.size === 0) return true
      const sentenceWords = normalized(sentence).split(' ')
      return !sentenceWords.some(word => word.length >= 5 && evidenceWords.has(word))
    })
}

function misattributesFounderExperience(body: string): boolean {
  return body
    .split(/[.!?\n]+/)
    .filter(sentence => /\b15 years\b/i.test(sentence))
    .some(sentence =>
      /\b(?:pigeon|we|we've|we have|our company|the company)\b/i.test(sentence),
    )
}

export function validateEvidenceAwareDraft(
  value: EvidenceAwareDraft,
  evidence: EmailEvidence[],
): void {
  if (
    typeof value?.subject !== 'string' ||
    typeof value?.body !== 'string' ||
    !Array.isArray(value?.evidence_used) ||
    value.evidence_used.some(item => typeof item !== 'string')
  ) {
    throw new UngroundedEmailError()
  }

  if (value.evidence_used.some(claim => !hasSupport(claim, evidence))) {
    throw new UngroundedEmailError()
  }

  const draftText = `${value.subject}\n${value.body}`
  if (unsupportedNumber(draftText, evidence)) {
    throw new UngroundedEmailError()
  }

  if (hasUnsupportedBiography(value.body, value.evidence_used)) {
    throw new UngroundedEmailError()
  }

  if (misattributesFounderExperience(value.body)) {
    throw new UngroundedEmailError()
  }
}
