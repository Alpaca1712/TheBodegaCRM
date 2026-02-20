// src/hooks/use-email-templates.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  incrementTemplateUsage,
  getTemplateCategories,
  getPopularTemplates,
} from '@/lib/api/email-templates'
type EmailTemplate = {
  id: string
  user_id: string
  org_id: string | null
  name: string
  subject: string
  body: string
  category: 'general' | 'follow_up' | 'intro' | 'pitch' | 'meeting_followup' | 'deal_update' | 'newsletter'
  is_shared: boolean
  tags: string[] | null
  usage_count: number
  last_used_at: string | null
  created_at: string
  updated_at: string
}
type EmailTemplateInsert = Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>

type EmailTemplateUpdate = Partial<Omit<EmailTemplateInsert, 'id' | 'user_id'>> & {
  id: string
}

export function useEmailTemplates({
  category,
  isShared,
}: {
  category?: 'general' | 'follow_up' | 'intro' | 'pitch' | 'meeting_followup' | 'deal_update' | 'newsletter'
  isShared?: boolean
} = {}) {
  return useQuery({
    queryKey: ['email-templates', { category, isShared }],
    queryFn: () => getEmailTemplates({ category, isShared }),
  })
}

export function useEmailTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ['email-templates', id],
    queryFn: () => (id ? getEmailTemplate(id) : Promise.reject('No ID')),
    enabled: !!id,
  })
}

export function useCreateEmailTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (template: Omit<EmailTemplateInsert, 'user_id' | 'usage_count'>) =>
      createEmailTemplate(template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] })
      queryClient.invalidateQueries({ queryKey: ['template-categories'] })
      queryClient.invalidateQueries({ queryKey: ['popular-templates'] })
    },
  })
}

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: EmailTemplateUpdate }) =>
      updateEmailTemplate(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] })
      queryClient.invalidateQueries({ queryKey: ['email-templates', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['template-categories'] })
      queryClient.invalidateQueries({ queryKey: ['popular-templates'] })
    },
  })
}

export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteEmailTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] })
      queryClient.invalidateQueries({ queryKey: ['template-categories'] })
      queryClient.invalidateQueries({ queryKey: ['popular-templates'] })
    },
  })
}

export function useIncrementTemplateUsage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => incrementTemplateUsage(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] })
      queryClient.invalidateQueries({ queryKey: ['email-templates', id] })
      queryClient.invalidateQueries({ queryKey: ['popular-templates'] })
    },
  })
}

export function useTemplateCategories() {
  return useQuery({
    queryKey: ['template-categories'],
    queryFn: getTemplateCategories,
  })
}

export function usePopularTemplates(limit?: number) {
  return useQuery({
    queryKey: ['popular-templates', limit],
    queryFn: () => getPopularTemplates(limit),
  })
}
