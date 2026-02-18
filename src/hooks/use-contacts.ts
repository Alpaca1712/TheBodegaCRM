'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  type Contact,
  type ContactFilters,
  type PaginationOptions,
  type SortOptions,
  type ContactsResponse,
} from '@/lib/api/contacts';

export function useContacts(filters: ContactFilters = {}, pagination: PaginationOptions = { page: 1, limit: 20 }, sort: SortOptions = { field: 'created_at', direction: 'desc' }) {
  return useQuery({
    queryKey: ['contacts', filters, pagination, sort],
    queryFn: () => getContacts(filters, pagination, sort),
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ['contacts', id],
    queryFn: () => getContactById(id),
    enabled: !!id,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: createContact,
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        router.push('/contacts');
      }
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Contact> }) => 
      updateContact(id, data),
    onSuccess: (result, variables) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        queryClient.invalidateQueries({ queryKey: ['contacts', variables.id] });
      }
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: deleteContact,
    onSuccess: (result, id) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        router.push('/contacts');
      }
    },
  });
}

// Optimistic update for quick status changes
interface OptimisticContactUpdate {
  id: string;
  updates: Partial<Contact>;
}

export function useOptimisticContactUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: OptimisticContactUpdate) => 
      updateContact(id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['contacts', id] });
      await queryClient.cancelQueries({ queryKey: ['contacts'] });

      // Snapshot the previous value
      const previousContact = queryClient.getQueryData(['contacts', id]);
      const previousContacts = queryClient.getQueryData(['contacts']);

      // Optimistically update the specific contact
      if (previousContact) {
        queryClient.setQueryData(['contacts', id], {
          ...previousContact,
          ...updates,
        });
      }

      // Optimistically update the contact in the list
      if (previousContacts && (previousContacts as ContactsResponse).data && Array.isArray((previousContacts as ContactsResponse).data)) {
        const updatedContacts = (previousContacts as ContactsResponse).data.map((contact: Contact) =>
          contact.id === id ? { ...contact, ...updates } : contact
        );
        queryClient.setQueryData(['contacts'], {
          ...previousContacts,
          data: updatedContacts,
        });
      }

      return { previousContact, previousContacts };
    },
    onError: (err, variables, context) => {
      // Roll back to previous values on error
      if (context?.previousContact) {
        queryClient.setQueryData(['contacts', variables.id], context.previousContact);
      }
      if (context?.previousContacts) {
        queryClient.setQueryData(['contacts'], context.previousContacts);
      }
    },
    onSettled: (result, error, variables) => {
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts', variables.id] });
    },
  });
}
