export type AnalyticsData = {
  avgLtv: number;
  avgCac: number;
  ltvCacRatio: number;
  revenue30d: number;
  ltvCacTrend: Array<{
    month: string;
    ltv: number;
    cac: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
  }>;
  funnelData: Array<{
    stage: string;
    count: number;
  }>;
};
