import { useQuery } from '@tanstack/react-query'
import type { Lead } from '@/types/leads'
import type { SalesAction } from '@/lib/dashboard/sales-actions'

export const DASHBOARD_QUERY_STALE_TIME_MS = 30_000

export type DashboardLeadTypeFilter = 'all' | 'customer' | 'investor' | 'partnership'

export type DashboardHotLead = Pick<
  Lead,
  | 'id'
  | 'contact_name'
  | 'company_name'
  | 'stage'
  | 'type'
  | 'icp_score'
  | 'conversation_signals'
>

export interface DashboardData {
  totalLeads: number
  outreachThisWeek: number
  outreachLastWeek: number
  totalOutbound: number
  totalInbound: number
  leadsContacted: number
  leadsWithReplies: number
  replyRate: number
  meetingsBooked: number
  meetingConversion: number
  avgDaysToReply: number
  followUpCompliance: number
  avgTouchpoints: number
  hotLeads: DashboardHotLead[]
  salesActionPlan: SalesAction[]
  pipelineCounts: Record<string, number>
  byType: { customers: number; investors: number; partnerships: number }
  closedWon: number
  activePipeline: number
}

export interface PipelineHealthData {
  overall_score: number
  total_leads: number
  at_risk_count: number
  healthy_count: number
  leads: Array<{
    lead_id: string
    contact_name: string
    company_name: string
    stage: string
    risk_score: number
    risk_factors: string[]
    recommendation: string
  }>
  ai_summary: string
}

export function buildDashboardQueryString(type: DashboardLeadTypeFilter | string) {
  return type && type !== 'all' ? `?type=${encodeURIComponent(type)}` : ''
}

export async function fetchDashboard(type: DashboardLeadTypeFilter | string): Promise<DashboardData> {
  const res = await fetch(`/api/dashboard${buildDashboardQueryString(type)}`)
  const payload = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(payload?.error || `Dashboard request failed (${res.status})`)
  }

  return {
    ...payload,
    salesActionPlan: Array.isArray(payload?.salesActionPlan) ? payload.salesActionPlan : [],
  }
}

export async function fetchPipelineHealth(type: DashboardLeadTypeFilter | string): Promise<PipelineHealthData | null> {
  const res = await fetch(`/api/ai/pipeline-health${buildDashboardQueryString(type)}`)
  const payload = await res.json().catch(() => null)

  if (!res.ok) {
    return null
  }

  return payload as PipelineHealthData
}

export function useDashboard(type: DashboardLeadTypeFilter | string) {
  return useQuery({
    queryKey: ['dashboard', type || 'all'],
    queryFn: () => fetchDashboard(type),
    staleTime: DASHBOARD_QUERY_STALE_TIME_MS,
    placeholderData: (previousData) => previousData,
  })
}

export function usePipelineHealth(type: DashboardLeadTypeFilter | string) {
  return useQuery({
    queryKey: ['pipeline-health', type || 'all'],
    queryFn: () => fetchPipelineHealth(type),
    staleTime: DASHBOARD_QUERY_STALE_TIME_MS,
    placeholderData: (previousData) => previousData,
    retry: false,
  })
}
