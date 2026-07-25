const RESEARCH_WRAPPER_KEYS = new Set(['data', 'research', 'result', 'results'])

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
