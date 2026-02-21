import { useQuery } from '@tanstack/react-query';
import { getAnalyticsData } from '@/lib/api/analytics';

type AiLtvCacAnalysis = {
  summary: string;
  strengths: string[];
  recommendations: string[];
};

export function useAiLtvCac() {
  return useQuery<AiLtvCacAnalysis, Error>({
    queryKey: ['ai-ltv-cac'],
    queryFn: async () => {
      const data = await getAnalyticsData();

      const strengths: string[] = [];
      const recommendations: string[] = [];

      if (data.ltvCacRatio >= 3) {
        strengths.push(`Strong LTV:CAC ratio of ${data.ltvCacRatio.toFixed(1)}x (3x+ is healthy)`);
      } else if (data.ltvCacRatio > 0) {
        recommendations.push(`LTV:CAC ratio is ${data.ltvCacRatio.toFixed(1)}x — aim for 3x or higher`);
      }

      if (data.revenue30d > 0) {
        strengths.push(`$${data.revenue30d.toLocaleString()} revenue in the last 30 days`);
      } else {
        recommendations.push('No closed-won deals in the last 30 days — focus on pipeline conversion');
      }

      const recentRevenue = data.revenueByMonth.slice(-3);
      const isGrowing = recentRevenue.length >= 2 &&
        recentRevenue[recentRevenue.length - 1].revenue >= recentRevenue[recentRevenue.length - 2].revenue;

      if (isGrowing) {
        strengths.push('Revenue trending upward over recent months');
      } else if (recentRevenue.some(m => m.revenue > 0)) {
        recommendations.push('Revenue has declined recently — review deal velocity and win rates');
      }

      const totalFunnel = data.funnelData.reduce((s, f) => s + f.count, 0);
      const wonCount = data.funnelData.find(f => f.stage === 'closed_won')?.count || 0;
      if (totalFunnel > 0 && wonCount / totalFunnel > 0.2) {
        strengths.push(`${Math.round((wonCount / totalFunnel) * 100)}% win rate across pipeline`);
      } else if (totalFunnel > 0) {
        recommendations.push('Win rate is below 20% — review qualification criteria and proposal process');
      }

      if (data.avgCac === 0) {
        recommendations.push('No acquisition cost data tracked — add costs for accurate CAC calculation');
      }

      if (strengths.length === 0) strengths.push('Building your data foundation');
      if (recommendations.length === 0) recommendations.push('Keep tracking deals to unlock deeper insights');

      const summary = data.avgLtv > 0
        ? `Average customer lifetime value is $${Math.round(data.avgLtv).toLocaleString()}${data.avgCac > 0 ? ` with a CAC of $${Math.round(data.avgCac).toLocaleString()}` : ''}. ${isGrowing ? 'Revenue is trending up.' : 'Focus on pipeline health to drive growth.'}`
        : 'Not enough closed deals yet to calculate LTV. Focus on converting pipeline deals to build your baseline.';

      return { summary, strengths, recommendations };
    },
    staleTime: 10 * 60 * 1000,
  });
}
