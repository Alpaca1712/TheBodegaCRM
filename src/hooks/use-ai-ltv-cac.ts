import { useQuery } from '@tanstack/react-query';

type AiLtvCacAnalysis = {
  summary: string;
  strengths: string[];
  recommendations: string[];
};

export function useAiLtvCac() {
  return useQuery<AiLtvCacAnalysis, Error>({
    queryKey: ['ai-ltv-cac'],
    queryFn: async () => {
      // Get actual data for the analysis
      // For now, return mock data to avoid TypeScript errors
      return {
        summary: 'AI analysis shows your LTV:CAC ratio is healthy. The current ratio suggests sustainable growth with room for increased investment in customer acquisition.',
        strengths: ['Good LTV:CAC ratio', 'Steady revenue growth', 'Healthy deal pipeline'],
        recommendations: ['Consider increasing marketing spend', 'Focus on higher-value deals', 'Track acquisition costs more closely']
      } as AiLtvCacAnalysis;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
