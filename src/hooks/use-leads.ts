import { useQuery } from '@tanstack/react-query'
import type { Lead, LeadType, PipelineStage } from '@/types/leads'

export const LEADS_QUERY_STALE_TIME_MS = 15_000
export const LEADS_EXPORT_PAGE_SIZE = 200

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

export type LeadExportFilters = Omit<LeadFilters, 'page' | 'pageSize' | 'view'>

export async function fetchAllLeadsForExport(filters: LeadExportFilters): Promise<Lead[]> {
  const firstPage = await fetchLeads({ ...filters, page: 0, pageSize: LEADS_EXPORT_PAGE_SIZE })
  const total = Math.max(firstPage.count, firstPage.data.length)
  const totalPages = Math.max(1, Math.ceil(total / LEADS_EXPORT_PAGE_SIZE))

  if (totalPages === 1) return firstPage.data

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchLeads({
        ...filters,
        page: index + 1,
        pageSize: LEADS_EXPORT_PAGE_SIZE,
      }),
    ),
  )

  return [firstPage, ...remainingPages]
    .flatMap((page) => page.data)
    .slice(0, total)
}

export function useLeads(filters: LeadFilters) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: () => fetchLeads(filters),
    staleTime: LEADS_QUERY_STALE_TIME_MS,
    placeholderData: (previousData) => previousData,
  })
}
