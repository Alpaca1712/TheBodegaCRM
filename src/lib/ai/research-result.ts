const RESEARCH_WRAPPER_KEYS = new Set(['data', 'research', 'result', 'results'])
const REQUIRED_RESEARCH_KEYS = [
  'contact_name',
  'company_name',
  'company_description',
  'grounded_personal_facts',
  'research_sources',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function unwrapSingleItem(value: unknown): unknown {
  if (!Array.isArray(value)) return value
  return value.length === 1 ? value[0] : value
}

export function normalizeResearchResultEnvelope(value: unknown): unknown {
  const unwrapped = unwrapSingleItem(value)
  if (!isRecord(unwrapped)) return unwrapped

  const keys = Object.keys(unwrapped)
  if (keys.length !== 1 || !RESEARCH_WRAPPER_KEYS.has(keys[0])) {
    return unwrapped
  }

  return unwrapSingleItem(unwrapped[keys[0]])
}

export function hasCompleteResearchResultShape(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (!REQUIRED_RESEARCH_KEYS.every((key) => Object.hasOwn(value, key))) {
    return false
  }

  return (
    typeof value.contact_name === 'string'
    && value.contact_name.trim().length > 0
    && typeof value.company_name === 'string'
    && value.company_name.trim().length > 0
    && typeof value.company_description === 'string'
    && value.company_description.trim().length > 0
    && Array.isArray(value.grounded_personal_facts)
    && Array.isArray(value.research_sources)
    && value.research_sources.length > 0
  )
}

export function compactResearchUpdates(
  values: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => {
      if (value === null || value === undefined) return false
      if (typeof value === 'string') return value.trim().length > 0
      if (Array.isArray(value)) return value.length > 0
      return true
    }),
  )
}
