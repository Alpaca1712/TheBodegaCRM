import { supabase } from '@/lib/supabase/client';
import { AnalyticsData } from '@/types/analytics';

export async function getAnalyticsData(): Promise<AnalyticsData> {
  // Get user ID from session
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('User not authenticated');

  // 1. Calculate LTV: average revenue per customer (from closed-won deals)
  const { data: dealsData } = await supabase
    .from('deals')
    .select('amount, status, contact_id')
    .eq('user_id', userId)
    .eq('status', 'closed_won');

  const totalRevenue = dealsData?.reduce((sum, deal) => sum + (deal.amount || 0), 0) || 0;
  const uniqueCustomers = new Set(dealsData?.map(d => d.contact_id).filter(Boolean)).size;
  const avgLtv = uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0;

  // 2. Calculate CAC proxy: average acquisition cost from acquisition_costs table
  const { data: costsData } = await supabase
    .from('acquisition_costs')
    .select('amount')
    .eq('user_id', userId);

  const totalCost = costsData?.reduce((sum, cost) => sum + (cost.amount || 0), 0) || 0;
  const avgCac = costsData?.length ? totalCost / costsData.length : 0;

  // 3. LTV:CAC ratio
  const ltvCacRatio = avgCac > 0 ? avgLtv / avgCac : 0;

  // 4. Revenue last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentDeals } = await supabase
    .from('deals')
    .select('amount')
    .eq('user_id', userId)
    .eq('status', 'closed_won')
    .gte('closed_at', thirtyDaysAgo.toISOString());

  const revenue30d = recentDeals?.reduce((sum, deal) => sum + (deal.amount || 0), 0) || 0;

  // 5. LTV/CAC trend over last 6 months
  const ltvCacTrend = await getLtvCacTrend();

  // 6. Revenue by month
  const revenueByMonth = await getRevenueByMonth();

  // 7. Deal conversion funnel
  const funnelData = await getFunnelData();

  return {
    avgLtv,
    avgCac,
    ltvCacRatio,
    revenue30d,
    ltvCacTrend,
    revenueByMonth,
    funnelData,
  };
}

async function getLtvCacTrend() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Simplified: just return placeholder trend
  return [
    { month: 'Jan', ltv: 1200, cac: 400 },
    { month: 'Feb', ltv: 1400, cac: 450 },
    { month: 'Mar', ltv: 1600, cac: 500 },
    { month: 'Apr', ltv: 1800, cac: 550 },
    { month: 'May', ltv: 2000, cac: 600 },
    { month: 'Jun', ltv: 2200, cac: 650 },
  ];
}

async function getRevenueByMonth() {
  return [
    { month: 'Jan', revenue: 12000 },
    { month: 'Feb', revenue: 15000 },
    { month: 'Mar', revenue: 18000 },
    { month: 'Apr', revenue: 14000 },
    { month: 'May', revenue: 22000 },
    { month: 'Jun', revenue: 19000 },
  ];
}

async function getFunnelData() {
  // Count deals by stage
  // Get user ID from session
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return [];

  const { data } = await supabase
    .from('deals')
    .select('stage')
    .eq('user_id', userId);

  const stages = ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
  const counts: Record<string, number> = {};

  stages.forEach(stage => {
    counts[stage] = data?.filter(d => d.stage === stage).length || 0;
  });

  return stages.map(stage => ({
    stage,
    count: counts[stage],
  }));
}
