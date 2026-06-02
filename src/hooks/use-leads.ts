import { useQuery } from '@tanstack/react-query'
import type { Lead, LeadType, PipelineStage } from '@/types/leads'

export const LEADS_QUERY_STALE_TIME_MS = 15_000

export interface LeadFilters {
  type?: LeadType | ''
  stage?: PipelineStage | ''
  search?: string
  view?: 'pipeline'
  page?: number
  pageSize: number
}

export interface LeadsResponse {
  data: Lead[]
  count: number
}

export function buildLeadsQueryString({ type, stage, search, view, page = 0, pageSize }: LeadFilters) {
  const params = new URLSearchParams()
  const trimmedSearch = search?.trim()

  if (type) params.set('type', type)
  if (stage) params.set('stage', stage)
  if (trimmedSearch) params.set('search', trimmedSearch)
  if (view) params.set('view', view)
  params.set('limit', String(pageSize))
  params.set('offset', String(Math.max(0, page) * pageSize))

  return params.toString()
}

export async function fetchLeads(filters: LeadFilters): Promise<LeadsResponse> {
  const query = buildLeadsQueryString(filters)
  const res = await fetch(`/api/leads?${query}`)
  const payload = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(payload?.error || `Failed to fetch leads (${res.status})`)
  }

  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
    count: Number(payload?.count ?? 0),
  }
}

export function useLeads(filters: LeadFilters) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: () => fetchLeads(filters),
    staleTime: LEADS_QUERY_STALE_TIME_MS,
    placeholderData: (previousData) => previousData,
  })
}
