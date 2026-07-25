import type { ResearchSource } from '@/types/leads'

export interface GroundedFactInput {
  fact: string
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

  for (const source of sources) {
    const normalizedUrl = normalizeUrl(source.url)
    if (!normalizedUrl) continue

    sourceByUrl.set(normalizedUrl, {
      ...source,
      url: source.url.trim(),
      title: source.title.trim(),
      detail: cleanFact(source.detail),
      facts: [],
    })
  }

  for (const citation of citations) {
    const normalizedUrl = normalizeUrl(citation.url)
    const citedText = normalizeEvidenceText(citation.citedText)
    if (!normalizedUrl || citedText.length < 8) continue

    citationsByUrl.set(normalizedUrl, [
      ...(citationsByUrl.get(normalizedUrl) || []),
      citedText,
    ])
  }

  const acceptedFacts: Array<{ fact: string; useAsHook: boolean }> = []
  const seen = new Set<string>()

  for (const candidate of facts) {
    const normalizedUrl = normalizeUrl(candidate.source_url)
    const fact = cleanFact(candidate.fact)
    const factEvidence = normalizeEvidenceText(fact)
    const source = normalizedUrl ? sourceByUrl.get(normalizedUrl) : undefined
    const key = fact.toLowerCase()
    const citationTexts = normalizedUrl ? citationsByUrl.get(normalizedUrl) || [] : []
    const isQuotedByTrustedCitation = citationTexts.some(text =>
      text.includes(factEvidence),
    )

    if (
      !source ||
      factEvidence.length < 8 ||
      !isQuotedByTrustedCitation ||
      seen.has(key)
    ) continue

    seen.add(key)
    source.facts = [...(source.facts || []), fact]
    acceptedFacts.push({ fact, useAsHook: candidate.use_as_hook === true })
  }

  return {
    sources: [...sourceByUrl.values()],
    personalDetails: acceptedFacts.map(item => item.fact).join('\n'),
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
