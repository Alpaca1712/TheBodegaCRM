export function isMissingColumn(error: { code?: string; message?: string } | null, column: string) {
  return Boolean(
    error &&
      (error.code === 'PGRST204' ||
        error.code === '42703' ||
        error.message?.includes(column) ||
        error.message?.includes(`Could not find the '${column}' column`)),
  )
}

export function omitColumn<T extends Record<string, unknown>>(payload: T, column: string) {
  const next = { ...payload }
  delete next[column]
  return next
}
