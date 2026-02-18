import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getDeals,
  getDealById,
  createDeal,
  updateDeal,
  deleteDeal,
  getDealsByStage,
  getDealStats,
  type Deal,
} from '@/lib/api/deals'

export function useDeals(filters?: { stage?: string; contactId?: string; companyId?: string }) {
  return useQuery({
    queryKey: ['deals', filters],
    queryFn: () => getDeals(filters),
  })
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: ['deal', id],
    queryFn: () => getDealById(id),
    enabled: !!id,
  })
}

export function useDealsByStage() {
  return useQuery({
    queryKey: ['deals-by-stage'],
    queryFn: getDealsByStage,
  })
}

export function useDealStats() {
  return useQuery({
    queryKey: ['deal-stats'],
    queryFn: getDealStats,
  })
}

export function useCreateDeal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createDeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      queryClient.invalidateQueries({ queryKey: ['deals-by-stage'] })
      queryClient.invalidateQueries({ queryKey: ['deal-stats'] })
    },
  })
}

export function useUpdateDeal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Deal> }) => updateDeal(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      queryClient.invalidateQueries({ queryKey: ['deal', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['deals-by-stage'] })
      queryClient.invalidateQueries({ queryKey: ['deal-stats'] })
    },
  })
}

export function useDeleteDeal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteDeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      queryClient.invalidateQueries({ queryKey: ['deals-by-stage'] })
      queryClient.invalidateQueries({ queryKey: ['deal-stats'] })
    },
  })
}
