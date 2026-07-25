import { apiRequest } from '@/lib/api/request'

export type EmailTemplate = {
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
type EmailTemplateUpdate = Partial<Omit<EmailTemplateInsert, 'user_id'>> & { id: string }
type ApiResult<T> = { data: T | null; error: Error | null }

export async function getEmailTemplates({
  category,
  isShared,
}: {
  category?: EmailTemplate['category']
  isShared?: boolean
} = {}): Promise<ApiResult<EmailTemplate[]>> {
  try {
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (isShared !== undefined) params.set('isShared', String(isShared))
    const response = await apiRequest<{ data: EmailTemplate[] }>(
      `/api/email-templates${params.size ? `?${params}` : ''}`,
      {},
      'Failed to load email templates',
    )
    return { data: response.data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

export async function getEmailTemplate(id: string): Promise<ApiResult<EmailTemplate>> {
  try {
    const data = await apiRequest<EmailTemplate>(
      `/api/email-templates/${id}`,
      {},
      'Failed to load email template',
    )
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

export async function createEmailTemplate(
  template: Omit<EmailTemplateInsert, 'user_id' | 'usage_count'>,
): Promise<ApiResult<EmailTemplate>> {
  try {
    const data = await apiRequest<EmailTemplate>(
      '/api/email-templates',
      {
        method: 'POST',
        body: JSON.stringify({
          name: template.name,
          subject: template.subject,
          body: template.body,
          category: template.category,
          is_shared: template.is_shared,
          tags: template.tags,
        }),
      },
      'Failed to create email template',
    )
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

export async function updateEmailTemplate(
  id: string,
  updates: EmailTemplateUpdate,
): Promise<ApiResult<EmailTemplate>> {
  try {
    const {
      name,
      subject,
      body,
      category,
      is_shared,
      tags,
    } = updates
    const data = await apiRequest<EmailTemplate>(
      `/api/email-templates/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          ...(name !== undefined ? { name } : {}),
          ...(subject !== undefined ? { subject } : {}),
          ...(body !== undefined ? { body } : {}),
          ...(category !== undefined ? { category } : {}),
          ...(is_shared !== undefined ? { is_shared } : {}),
          ...(tags !== undefined ? { tags } : {}),
        }),
      },
      'Failed to update email template',
    )
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

export async function deleteEmailTemplate(id: string): Promise<{ error: Error | null }> {
  try {
    await apiRequest<{ success: true }>(
      `/api/email-templates/${id}`,
      { method: 'DELETE' },
      'Failed to delete email template',
    )
    return { error: null }
  } catch (error) {
    return { error: error as Error }
  }
}

export async function incrementTemplateUsage(id: string) {
  try {
    const data = await apiRequest<EmailTemplate>(
      `/api/email-templates/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ increment_usage: true }),
      },
      'Failed to update template usage',
    )
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

export async function getTemplateCategories() {
  const result = await getEmailTemplates()
  if (!result.data) return { data: null, error: result.error }
  return {
    data: Array.from(new Set(result.data.map((template) => template.category))),
    error: null,
  }
}

export async function getPopularTemplates(limit = 5): Promise<ApiResult<EmailTemplate[]>> {
  try {
    const response = await apiRequest<{ data: EmailTemplate[] }>(
      `/api/email-templates?popular=true&limit=${Math.min(Math.max(limit, 1), 20)}`,
      {},
      'Failed to load popular email templates',
    )
    return { data: response.data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}
