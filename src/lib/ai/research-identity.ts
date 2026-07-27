import type { ResearchSource } from '@/types/leads'

export interface ResearchIdentityConflict {
  sourceUrl: string
  sourceTitle: string
  expectedName: string
  conflictingName: string
}

const NON_SURNAME_LABELS = new Set([
  'activity',
  'article',
  'github',
  'interview',
  'linkedin',
  'podcast',
  'profile',
  'resume',
  'twitter',
])

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function nameParts(value: string): { first: string; last: string } | null {
  const parts = value
    .trim()
    .split(/\s+/)
    .map(part => part.replace(/[^\p{L}'-]/gu, ''))
    .filter(Boolean)

  if (parts.length < 2) return null
  return {
    first: parts[0],
    last: parts[parts.length - 1],
  }
}

function sourceKey(value: string): string {
  try {
    const url = new URL(value)
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return value.trim().replace(/\/$/, '')
  }
}

function conflictingNamesForSource(
  contactName: string,
  source: ResearchSource,
): string[] {
  const canonical = nameParts(contactName)
  if (!canonical) return []

  const text = [
    source.title,
    source.detail,
    ...(source.facts || []),
  ].join(' ')
  const names = new Set<string>()
  const spaced = new RegExp(
    `\\b${escapeRegExp(canonical.first)}\\s+([A-Z][\\p{L}'-]{1,})\\b`,
    'gu',
  )
  let match: RegExpExecArray | null

  while ((match = spaced.exec(text)) !== null) {
    const candidateLast = match[1]
    if (
      candidateLast.toLowerCase() !== canonical.last.toLowerCase() &&
      !NON_SURNAME_LABELS.has(candidateLast.toLowerCase())
    ) {
      names.add(`${canonical.first} ${candidateLast}`)
    }
  }

  const compact = new RegExp(
    `@?${escapeRegExp(canonical.first)}([A-Z][a-z]{2,})\\b`,
    'g',
  )
  while ((match = compact.exec(text)) !== null) {
    const candidateLast = match[1]
    if (candidateLast.toLowerCase() !== canonical.last.toLowerCase()) {
      names.add(`${canonical.first} ${candidateLast}`)
    }
  }

  return [...names]
}

export function findResearchIdentityConflicts(
  contactName: string,
  sources: ResearchSource[] | null | undefined,
): ResearchIdentityConflict[] {
  const conflicts: ResearchIdentityConflict[] = []

  for (const source of sources || []) {
    for (const conflictingName of conflictingNamesForSource(contactName, source)) {
      conflicts.push({
        sourceUrl: source.url,
        sourceTitle: source.title,
        expectedName: contactName,
        conflictingName,
      })
    }
  }

  return conflicts
}

export function conflictingResearchSourceUrls(
  contactName: string,
  sources: ResearchSource[] | null | undefined,
): Set<string> {
  return new Set(
    findResearchIdentityConflicts(contactName, sources).map(
      conflict => sourceKey(conflict.sourceUrl),
    ),
  )
}

export function isConflictingResearchSource(
  sourceUrl: string,
  conflictingUrls: Set<string>,
): boolean {
  return conflictingUrls.has(sourceKey(sourceUrl))
}
