'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  getInvestors,
  getInvestorById,
  createInvestor,
  updateInvestor,
  deleteInvestor,
  getInvestments,
  getInvestmentsByStage,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  getInvestorStats,
  type Investor,
  type Investment,
  type InvestorFilters,
  type InvestmentFilters,
  type PaginationOptions,
} from '@/lib/api/investors';



export function useInvestors(filters: InvestorFilters = {}, pagination: PaginationOptions = { page: 1, limit: 20 }) {
  return useQuery({
    queryKey: ['investors', filters, pagination],
    queryFn: () => getInvestors(filters, pagination),
  });
}

export function useInvestor(id: string) {
  return useQuery({
    queryKey: ['investors', id],
    queryFn: () => getInvestorById(id),
    enabled: !!id,
  });
}

export function useInvestments(filters: InvestmentFilters = {}, pagination: PaginationOptions = { page: 1, limit: 50 }) {
  return useQuery({
    queryKey: ['investments', filters, pagination],
    queryFn: () => getInvestments(filters, pagination),
  });
}

export function useInvestmentsByStage() {
  return useQuery({
    queryKey: ['investments-by-stage'],
    queryFn: () => getInvestmentsByStage(),
  });
}

export function useInvestorStats() {
  return useQuery({
    queryKey: ['investor-stats'],
    queryFn: () => getInvestorStats(),
  });
}

export function useCreateInvestor() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: createInvestor,
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['investors'] });
        router.push('/investors');
      }
    },
  });
}

export function useUpdateInvestor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Investor> }) => updateInvestor(id, updates),
    onSuccess: (result, variables) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['investors'] });
        queryClient.invalidateQueries({ queryKey: ['investors', variables.id] });
      }
    },
  });
}

export function useDeleteInvestor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteInvestor,
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['investors'] });
      }
    },
  });
}

export function useCreateInvestment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInvestment,
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['investments'] });
        queryClient.invalidateQueries({ queryKey: ['investor-stats'] });
      }
    },
  });
}

export function useUpdateInvestment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Investment> }) => updateInvestment(id, updates),
    onSuccess: (result, variables) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['investments'] });
        queryClient.invalidateQueries({ queryKey: ['investments', variables.id] });
        queryClient.invalidateQueries({ queryKey: ['investor-stats'] });
      }
    },
  });
}

export function useDeleteInvestment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteInvestment,
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['investments'] });
        queryClient.invalidateQueries({ queryKey: ['investor-stats'] });
      }
    },
  });
}
