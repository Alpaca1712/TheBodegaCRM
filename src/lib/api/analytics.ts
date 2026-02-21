import { createClient } from '@/lib/supabase/client'
import { getActiveOrgId } from '@/lib/api/organizations'
import { AnalyticsData } from '@/types/analytics'

export async function getAnalyticsData(): Promise<AnalyticsData> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('User not authenticated')

  const orgId = await getActiveOrgId()
  if (!orgId) throw new Error('No organization found')

  const { data: allDeals } = await supabase
    .from('deals')
    .select('value, stage, contact_id, created_at, updated_at')
    .eq('org_id', orgId)

  const wonDeals = allDeals?.filter(d => d.stage === 'closed_won') || []
  const totalRevenue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0)
  const uniqueCustomers = new Set(wonDeals.map(d => d.contact_id).filter(Boolean)).size
  const avgLtv = uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0

  const { data: costsData } = await supabase
    .from('acquisition_costs')
    .select('amount')
    .eq('user_id', session.user.id)

  const totalCost = costsData?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0
  const avgCac = costsData?.length ? totalCost / costsData.length : 0
  const ltvCacRatio = avgCac > 0 ? avgLtv / avgCac : 0

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const revenue30d = wonDeals
    .filter(d => new Date(d.updated_at) >= thirtyDaysAgo)
    .reduce((sum, d) => sum + (d.value || 0), 0)

  const ltvCacTrend = buildMonthlyTrend(allDeals || [], costsData || [])
  const revenueByMonth = buildRevenueByMonth(wonDeals)
  const funnelData = buildFunnel(allDeals || [])

  return { avgLtv, avgCac, ltvCacRatio, revenue30d, ltvCacTrend, revenueByMonth, funnelData }
}

function buildMonthlyTrend(
  deals: Array<{ value: number | null; stage: string; contact_id: string | null; created_at: string }>,
  costs: Array<{ amount: number }>
) {
  const now = new Date()
  const months: Array<{ month: string; ltv: number; cac: number }> = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('en-US', { month: 'short' })
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0)

    const wonBefore = deals.filter(dl =>
      dl.stage === 'closed_won' && new Date(dl.created_at) <= endOfMonth
    )
    const rev = wonBefore.reduce((s, dl) => s + (dl.value || 0), 0)
    const custs = new Set(wonBefore.map(dl => dl.contact_id).filter(Boolean)).size
    const ltv = custs > 0 ? Math.round(rev / custs) : 0

    const avgCostPerMonth = costs.length > 0
      ? Math.round(costs.reduce((s, c) => s + (c.amount || 0), 0) / costs.length)
      : 0

    months.push({ month: label, ltv, cac: avgCostPerMonth })
  }

  return months
}

function buildRevenueByMonth(wonDeals: Array<{ value: number | null; updated_at: string }>) {
  const now = new Date()
  const months: Array<{ month: string; revenue: number }> = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('en-US', { month: 'short' })
    const startOfMonth = d
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0)

    const rev = wonDeals
      .filter(dl => {
        const dt = new Date(dl.updated_at)
        return dt >= startOfMonth && dt <= endOfMonth
      })
      .reduce((s, dl) => s + (dl.value || 0), 0)

    months.push({ month: label, revenue: rev })
  }

  return months
}

function buildFunnel(deals: Array<{ stage: string }>) {
  const stages = ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']
  return stages.map(stage => ({
    stage,
    count: deals.filter(d => d.stage === stage).length,
  }))
}
