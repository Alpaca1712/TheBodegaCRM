import { apiRequest } from './request'

/** Browser-side helper for the console; relies on the Supabase session cookie. */
export function api<T>(path: string, init: RequestInit = {}, fallback = 'Request failed') {
  return apiRequest<T>(`/api/v1${path}`, init, fallback)
}

export function apiJson<T>(path: string, method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', body?: unknown, fallback?: string) {
  return api<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) }, fallback)
}

export interface Paginated<T> {
  data: T[]
  total: number
  limit: number
  offset: number
}

export function formatRelative(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  const diff = Date.now() - date.getTime()
  const minutes = Math.round(diff / 60_000)
  if (Math.abs(minutes) < 1) return 'just now'
  if (Math.abs(minutes) < 60) return minutes > 0 ? `${minutes}m ago` : `in ${-minutes}m`
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 48) return hours > 0 ? `${hours}h ago` : `in ${-hours}h`
  const days = Math.round(hours / 24)
  if (Math.abs(days) < 30) return days > 0 ? `${days}d ago` : `in ${-days}d`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
