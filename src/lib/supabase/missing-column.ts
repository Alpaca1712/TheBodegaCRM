type SupabaseShapeError = { code?: string; message?: string; details?: string; hint?: string } | null

export function isMissingColumn(error: SupabaseShapeError, column: string) {
  return Boolean(
    error &&
      (error.code === 'PGRST204' ||
        error.code === '42703' ||
        error.message?.includes(column) ||
        error.message?.includes(`Could not find the '${column}' column`)),
  )
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
