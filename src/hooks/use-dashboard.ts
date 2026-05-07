import { useQuery } from '@tanstack/react-query'
import type { Lead } from '@/types/leads'
import type { SalesAction } from '@/lib/dashboard/sales-actions'

export const DASHBOARD_QUERY_STALE_TIME_MS = 30_000

export type DashboardLeadTypeFilter = 'all' | 'customer' | 'investor' | 'partnership'

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
  hotLeads: Lead[]
  salesActionPlan: SalesAction[]
  pipelineCounts: Record<string, number>
  byType: { customers: number; investors: number; partnerships: number }
  closedWon: number
  activePipeline: number
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

export function useDashboard(type: DashboardLeadTypeFilter | string) {
  return useQuery({
    queryKey: ['dashboard', type || 'all'],
    queryFn: () => fetchDashboard(type),
    staleTime: DASHBOARD_QUERY_STALE_TIME_MS,
    placeholderData: (previousData) => previousData,
  })
}
