import { useQuery } from '@tanstack/react-query';
import { getAnalyticsData } from '@/lib/api/analytics';
import { AnalyticsData } from '@/types/analytics';

export function useAnalytics() {
  return useQuery<AnalyticsData, Error>({
    queryKey: ['analytics'],
    queryFn: getAnalyticsData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
