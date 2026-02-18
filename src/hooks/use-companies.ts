'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  type Company,
  type CompanyFilters,
  type PaginationOptions,
  type SortOptions,
  type CompaniesResponse,
} from '@/lib/api/companies';

export function useCompanies(
  filters: CompanyFilters = {}, 
  pagination: PaginationOptions = { page: 1, limit: 20 }, 
  sort: SortOptions = { field: 'created_at', direction: 'desc' }
) {
  return useQuery({
    queryKey: ['companies', filters, pagination, sort],
    queryFn: () => getCompanies(filters, pagination, sort),
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: ['companies', id],
    queryFn: () => getCompanyById(id),
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: createCompany,
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['companies'] });
        router.push('/companies');
      }
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Company> }) => 
      updateCompany(id, data),
    onSuccess: (result, variables) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['companies'] });
        queryClient.invalidateQueries({ queryKey: ['companies', variables.id] });
      }
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: deleteCompany,
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['companies'] });
        router.push('/companies');
      }
    },
  });
}

// Optimistic update for quick status changes
interface OptimisticCompanyUpdate {
  id: string;
  updates: Partial<Company>;
}

export function useOptimisticCompanyUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: OptimisticCompanyUpdate) => 
      updateCompany(id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['companies', id] });
      await queryClient.cancelQueries({ queryKey: ['companies'] });

      // Snapshot the previous value
      const previousCompany = queryClient.getQueryData(['companies', id]);
      const previousCompanies = queryClient.getQueryData(['companies']);

      // Optimistically update the specific company
      if (previousCompany) {
        queryClient.setQueryData(['companies', id], {
          ...previousCompany,
          ...updates,
        });
      }

      // Optimistically update the company in the list
      if (previousCompanies && (previousCompanies as CompaniesResponse).data && Array.isArray((previousCompanies as CompaniesResponse).data)) {
        const updatedCompanies = (previousCompanies as CompaniesResponse).data.map((company: Company) =>
          company.id === id ? { ...company, ...updates } : company
        );
        queryClient.setQueryData(['companies'], {
          ...previousCompanies,
          data: updatedCompanies,
        });
      }

      return { previousCompany, previousCompanies };
    },
    onError: (err, variables, context) => {
      // Roll back to previous values on error
      if (context?.previousCompany) {
        queryClient.setQueryData(['companies', variables.id], context.previousCompany);
      }
      if (context?.previousCompanies) {
        queryClient.setQueryData(['companies'], context.previousCompanies);
      }
    },
    onSettled: (result, error, variables) => {
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['companies', variables.id] });
    },
  });
}
