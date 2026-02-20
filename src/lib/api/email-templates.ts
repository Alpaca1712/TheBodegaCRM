// src/lib/api/email-templates.ts
import { supabase } from '@/lib/supabase/client'
// EmailTemplate types defined locally since not in database types
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
type EmailTemplateUpdate = Partial<Omit<EmailTemplateInsert, 'user_id'>> & { id: string }

type EmailTemplateWithUser = EmailTemplate & {
  profiles: {
    full_name: string | null
    avatar_url: string | null
  }
}

export async function getEmailTemplates({
  category,
  isShared,
}: {
  category?: EmailTemplate['category']
  isShared?: boolean
} = {}) {
  let query = supabase
    .from('email_templates')
    .select(
      `
      *,
      profiles (full_name, avatar_url)
    `
    )
    .order('name', { ascending: true })

  if (category) {
    query = query.eq('category', category)
  }

  if (isShared !== undefined) {
    query = query.eq('is_shared', isShared)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching email templates:', error)
    return { data: null, error }
  }

  return { data: data as EmailTemplateWithUser[], error: null }
}

export async function getEmailTemplate(id: string) {
  const { data, error } = await supabase
    .from('email_templates')
    .select(
      `
      *,
      profiles (full_name, avatar_url)
    `
    )
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching email template:', error)
    return { data: null, error }
  }

  return { data: data as EmailTemplateWithUser, error: null }
}

export async function createEmailTemplate(
  template: Omit<EmailTemplateInsert, 'user_id' | 'usage_count'>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: new Error('User not authenticated') }
  }

  const { data, error } = await supabase
    .from('email_templates')
    .insert([
      {
        ...template,
        user_id: user.id,
        usage_count: 0,
      },
    ])
    .select()
    .single()

  if (error) {
    console.error('Error creating email template:', error)
    return { data: null, error }
  }

  return { data: data as EmailTemplate, error: null }
}

export async function updateEmailTemplate(
  id: string,
  updates: EmailTemplateUpdate
) {
  const { data, error } = await supabase
    .from('email_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating email template:', error)
    return { data: null, error }
  }

  return { data: data as EmailTemplate, error: null }
}

export async function deleteEmailTemplate(id: string) {
  const { error } = await supabase
    .from('email_templates')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting email template:', error)
    return { error }
  }

  return { error: null }
}

export async function incrementTemplateUsage(id: string) {
  const { data, error } = await supabase
    .from('email_templates')
    .update({
      usage_count: supabase.rpc('increment', { x: 1 }),
      last_used_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('usage_count, last_used_at')
    .single()

  if (error) {
    console.error('Error incrementing template usage:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

export async function getTemplateCategories() {
  const { data, error } = await supabase
    .from('email_templates')
    .select('category')
    .order('category', { ascending: true })

  if (error) {
    console.error('Error fetching template categories:', error)
    return { data: null, error }
  }

  // Get unique categories
  const categories = Array.from(
    new Set(data.map((item) => item.category))
  ) as EmailTemplate['category'][]

  return { data: categories, error: null }
}

export async function getPopularTemplates(limit = 5) {
  const { data, error } = await supabase
    .from('email_templates')
    .select(
      `
      *,
      profiles (full_name, avatar_url)
    `
    )
    .order('usage_count', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching popular templates:', error)
    return { data: null, error }
  }

  return { data: data as EmailTemplateWithUser[], error: null }
}
