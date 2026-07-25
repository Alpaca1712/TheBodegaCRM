import { apiErrorMessage } from '@/lib/api/client-error'

export async function apiRequest<T>(
  input: string,
  init: RequestInit = {},
  fallback = 'Request failed',
): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw new Error(await apiErrorMessage(response, fallback))
  }

  return response.json() as Promise<T>
}
