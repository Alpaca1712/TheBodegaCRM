import { useQuery } from '@tanstack/react-query'
import type { Lead, LeadEmail, LeadInteraction } from '@/types/leads'

export const LEAD_DETAIL_QUERY_STALE_TIME_MS = 15_000
export const LEAD_MEMORIES_QUERY_STALE_TIME_MS = 30_000

export interface RelatedLead {
  id: string
  contact_name: string
  contact_email: string | null
  contact_title: string | null
  contact_photo_url: string | null
  stage: string
  type: string
}

export interface AgentMemory {
  id: string
  memory_type: string
  content: string
  source: string | null
  relevance_score: number
  created_at: string
}

export interface LeadDetailResponse {
  lead: Lead
  emails: LeadEmail[]
  interactions: LeadInteraction[]
  relatedLeads: RelatedLead[]
}

export function leadDetailQueryKey(leadId: string) {
  return ['lead-detail', leadId] as const
}

export function leadMemoriesQueryKey(leadId: string) {
  return ['lead-memories', leadId] as const
}

export async function fetchLeadDetail(leadId: string): Promise<LeadDetailResponse> {
  const res = await fetch(`/api/leads/${encodeURIComponent(leadId)}`)
  const payload = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(payload?.error || `Failed to fetch lead (${res.status})`)
  }

  if (!payload?.lead) {
    throw new Error('Lead not found')
  }

  return {
    lead: payload.lead,
    emails: Array.isArray(payload?.emails) ? payload.emails : [],
    interactions: Array.isArray(payload?.interactions) ? payload.interactions : [],
    relatedLeads: Array.isArray(payload?.relatedLeads) ? payload.relatedLeads : [],
  }
}

export async function fetchLeadMemories(leadId: string): Promise<AgentMemory[]> {
  const params = new URLSearchParams({ leadId })
  const res = await fetch(`/api/ai/extract-memories?${params.toString()}`)
  const payload = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(payload?.error || `Failed to fetch memories (${res.status})`)
  }

  return Array.isArray(payload?.memories) ? payload.memories : []
}

export function useLeadDetail(leadId: string) {
  return useQuery({
    queryKey: leadDetailQueryKey(leadId),
    queryFn: () => fetchLeadDetail(leadId),
    staleTime: LEAD_DETAIL_QUERY_STALE_TIME_MS,
    placeholderData: (previousData) => previousData,
    retry: false,
  })
}

export function useLeadMemories(leadId: string) {
  return useQuery({
    queryKey: leadMemoriesQueryKey(leadId),
    queryFn: () => fetchLeadMemories(leadId),
    staleTime: LEAD_MEMORIES_QUERY_STALE_TIME_MS,
    placeholderData: (previousData) => previousData,
    retry: false,
  })
}
