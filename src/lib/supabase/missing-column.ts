type SupabaseShapeError = { code?: string; message?: string; details?: string; hint?: string } | null

export function isMissingColumn(error: SupabaseShapeError, column: string) {
  if (!error) return false

  const errorText = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return errorText.includes(column.toLowerCase())
}

export function isMissingRelation(error: SupabaseShapeError, relation: string) {
  return Boolean(
    error &&
      (error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message?.includes(relation) ||
        error.details?.includes(relation) ||
        error.message?.includes(`Could not find the table`) ||
        error.message?.includes(`relation "${relation}" does not exist`)),
  )
}

export function omitColumn<T extends Record<string, unknown>>(payload: T, column: string) {
  const next = { ...payload }
  delete next[column]
  return next
}
