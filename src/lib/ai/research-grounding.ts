import type { ResearchSource } from '@/types/leads'

export interface GroundedFactInput {
  fact: string
  evidence_quote: string
  source_url: string
  use_as_hook?: boolean
}

export interface TrustedResearchCitation {
  url: string
  citedText: string
}

export interface GroundedResearchEvidence {
  fact: string
  sourceUrl: string
  sourceTitle: string
}

export interface GroundedResearchPass {
  sources: ResearchSource[]
  facts: GroundedFactInput[]
  citations: TrustedResearchCitation[]
}

export function combineGroundedResearchPasses(
  ...passes: GroundedResearchPass[]
): GroundedResearchPass {
  return {
    sources: passes.flatMap(pass => pass.sources),
    facts: passes.flatMap(pass => pass.facts),
    citations: passes.flatMap(pass => pass.citations),
  }
}

function normalizeUrl(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

function cleanFact(value: string): string {
  return value.replace(/[\u2013\u2014]/g, ',').replace(/\s+/g, ' ').trim()
}

function normalizeEvidenceText(value: string): string {
  return cleanFact(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

const SUMMARY_STOP_WORDS = new Set([
  'about',
  'after',
  'also',
  'been',
  'being',
  'from',
  'have',
  'into',
  'that',
  'their',
  'them',
  'they',
  'this',
  'with',
  'would',
])

function contentTokens(value: string): string[] {
  return [...new Set(
    normalizeEvidenceText(value)
      .split(' ')
      .filter(token => token.length >= 4 && !SUMMARY_STOP_WORDS.has(token)),
  )]
}

function summaryIsSupportedByQuote(summary: string, quote: string): boolean {
  const normalizedQuote = normalizeEvidenceText(quote)
  const numbers = summary.match(/\d[\d,.]*/g) || []
  if (numbers.some(number => !normalizedQuote.includes(number.toLowerCase()))) {
    return false
  }

  const summaryTokens = contentTokens(summary)
  const quoteTokens = new Set(contentTokens(quote))
  if (summaryTokens.length === 0) return false

  const overlap = summaryTokens.filter(token => quoteTokens.has(token)).length
  const requiredOverlap = Math.max(1, Math.ceil(summaryTokens.length / 2))
  return overlap >= requiredOverlap
}

function isRecognitionHook(fact: string): boolean {
  const titleContext =
    /\b(?:is|serves as|works as|joined as)\b.{0,50}\b(?:cto|ceo|founder|cofounder|co-founder|president|director|vp|vice president|engineer)\b/i
  const specificAction =
    /\b(?:built|designed|created|launched|reads?|sends?|submits?|scores?|ranks?|routes?|schedules?|integrates?|wrote|said|spoke|published|authored|explained|described)\b/i

  return !titleContext.test(fact) || specificAction.test(fact)
}

export function attachGroundedFacts(
  sources: ResearchSource[],
  facts: GroundedFactInput[],
  citations: TrustedResearchCitation[],
): {
  sources: ResearchSource[]
  personalDetails: string
  smykmHooks: string[]
} {
  const sourceByUrl = new Map<string, ResearchSource>()
  const citationsByUrl = new Map<string, string[]>()
  const sourceDetailByUrl = new Map<string, string>()

  for (const citation of citations) {
    const normalizedUrl = normalizeUrl(citation.url)
    const cleanCitation = cleanFact(citation.citedText)
    const citedText = normalizeEvidenceText(cleanCitation)
    if (!normalizedUrl || citedText.length < 8) continue

    citationsByUrl.set(normalizedUrl, [
      ...(citationsByUrl.get(normalizedUrl) || []),
      citedText,
    ])
    if (!sourceDetailByUrl.has(normalizedUrl)) {
      sourceDetailByUrl.set(normalizedUrl, cleanCitation)
    }
  }

  for (const source of sources) {
    const normalizedUrl = normalizeUrl(source.url)
    if (!normalizedUrl) continue

    sourceByUrl.set(normalizedUrl, {
      ...source,
      url: source.url.trim(),
      title: source.title.trim(),
      detail: sourceDetailByUrl.get(normalizedUrl) || '',
      facts: [],
    })
  }

  const acceptedFacts: Array<{ fact: string; useAsHook: boolean; isPersonal: boolean }> = []
  const seen = new Set<string>()

  for (const candidate of facts) {
    const normalizedUrl = normalizeUrl(candidate.source_url)
    const fact = cleanFact(candidate.fact)
    const factEvidence = normalizeEvidenceText(fact)
    const evidenceQuote = cleanFact(candidate.evidence_quote)
    const normalizedQuote = normalizeEvidenceText(evidenceQuote)
    const source = normalizedUrl ? sourceByUrl.get(normalizedUrl) : undefined
    const key = fact.toLowerCase()
    const citationTexts = normalizedUrl ? citationsByUrl.get(normalizedUrl) || [] : []
    const isQuotedByTrustedCitation = citationTexts.some(text =>
      text.includes(normalizedQuote),
    )

    if (
      !source ||
      factEvidence.length < 8 ||
      normalizedQuote.length < 8 ||
      !isQuotedByTrustedCitation ||
      !summaryIsSupportedByQuote(fact, evidenceQuote) ||
      seen.has(key)
    ) continue

    seen.add(key)
    source.facts = [...(source.facts || []), fact]
    acceptedFacts.push({
      fact,
      useAsHook: candidate.use_as_hook === true && isRecognitionHook(fact),
      isPersonal: /\b(?:founder|cofounder|co-founder|cto|ceo|wrote|said|spoke|published|authored|joined|worked|studied)\b/i.test(fact),
    })
  }

  return {
    sources: [...sourceByUrl.values()],
    personalDetails: acceptedFacts
      .filter(item => item.isPersonal)
      .map(item => item.fact)
      .join('\n'),
    smykmHooks: acceptedFacts.filter(item => item.useAsHook).map(item => item.fact),
  }
}

export function getGroundedResearchEvidence(
  sources: ResearchSource[] | null | undefined,
): GroundedResearchEvidence[] {
  const evidence: GroundedResearchEvidence[] = []
  const seen = new Set<string>()

  for (const source of sources || []) {
    const sourceUrl = normalizeUrl(source.url)
    if (!sourceUrl) continue

    const facts = Array.isArray(source.facts) ? source.facts : []
    for (const value of facts) {
      const fact = cleanFact(value)
      const key = `${sourceUrl}:${fact.toLowerCase()}`
      if (fact.length < 8 || seen.has(key)) continue

      seen.add(key)
      evidence.push({
        fact,
        sourceUrl,
        sourceTitle: source.title.trim() || sourceUrl,
      })
    }
  }

  return evidence
}
