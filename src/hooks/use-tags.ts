import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getTags, 
  getTagsByContactId, 
  createTag, 
  updateTag, 
  deleteTag, 
  addTagToContact, 
  removeTagFromContact, 
  getAvailableTagsForContact, 
  type TagInsert, 
  type TagUpdate 
} from '@/lib/api/tags';

export function useTags(filters: { search?: string } = {}) {
  return useQuery({
    queryKey: ['tags', filters],
    queryFn: () => getTags(filters),
  });
}

export function useTagsByContactId(contactId: string) {
  return useQuery({
    queryKey: ['tags', 'contact', contactId],
    queryFn: () => getTagsByContactId(contactId),
    enabled: !!contactId,
  });
}

export function useAvailableTagsForContact(contactId: string) {
  return useQuery({
    queryKey: ['tags', 'available', contactId],
    queryFn: () => getAvailableTagsForContact(contactId),
    enabled: !!contactId,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (tagData: TagInsert) => createTag(tagData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ tagId, tagData }: { tagId: string; tagData: TagUpdate }) => 
      updateTag(tagId, tagData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (tagId: string) => deleteTag(tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useAddTagToContact() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ contactId, tagId }: { contactId: string; tagId: string }) => 
      addTagToContact(contactId, tagId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tags', 'contact', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['tags', 'available', variables.contactId] });
    },
  });
}

export function useRemoveTagFromContact() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ contactId, tagId }: { contactId: string; tagId: string }) => 
      removeTagFromContact(contactId, tagId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tags', 'contact', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['tags', 'available', variables.contactId] });
    },
  });
}
