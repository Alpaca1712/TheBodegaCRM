interface ApiErrorPayload {
  error?: string | { message?: string }
  message?: string
  details?: string
}

export async function apiErrorMessage(response: Response, fallback: string) {
  try {
    const payload = await response.json() as ApiErrorPayload
    if (typeof payload.error === 'string' && payload.error.trim()) return payload.error
    if (typeof payload.error === 'object' && payload.error?.message?.trim()) return payload.error.message
    if (payload.message?.trim()) return payload.message
    if (payload.details?.trim()) return payload.details
  } catch {
    // Some upstream failures return HTML or an empty body.
  }

  return response.status ? `${fallback} (${response.status})` : fallback
}

export function clientErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}
