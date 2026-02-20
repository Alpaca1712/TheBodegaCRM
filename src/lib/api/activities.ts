import { createClient } from '@/lib/supabase/client'
import { getActiveOrgId } from '@/lib/api/organizations'

export interface Activity {
  id: string
  user_id: string
  type: 'call' | 'email' | 'meeting' | 'task' | 'note'
  title: string
  description?: string
  contact_id?: string
  company_id?: string
  deal_id?: string
  due_date?: string
  completed: boolean
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface ActivityFilters {
  type?: Activity['type']
  contact_id?: string
  company_id?: string
  deal_id?: string
  completed?: boolean
  due_date_from?: string
  due_date_to?: string
}

export interface PaginationOptions {
  page?: number
  limit?: number
}

export interface SortOptions {
  field?: 'title' | 'type' | 'due_date' | 'completed' | 'created_at'
  direction?: 'asc' | 'desc'
}

export interface ActivitiesResponse {
  data: Activity[]
  count: number
  error?: string
}

export async function getActivities(
  filters: ActivityFilters = {},
  pagination: PaginationOptions = {},
  sort: SortOptions = {}
): Promise<ActivitiesResponse> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { data: [], count: 0, error: 'Not authenticated' }
  }

  const orgId = await getActiveOrgId()
  if (!orgId) return { data: [], count: 0, error: 'No organization found' }

  const { page = 1, limit = 50 } = pagination
  const { field = 'due_date', direction = 'asc' } = sort

  let query = supabase
    .from('activities')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)

  if (filters.type) {
    query = query.eq('type', filters.type)
  }
  
  if (filters.contact_id) {
    query = query.eq('contact_id', filters.contact_id)
  }
  
  if (filters.company_id) {
    query = query.eq('company_id', filters.company_id)
  }
  
  if (filters.deal_id) {
    query = query.eq('deal_id', filters.deal_id)
  }
  
  if (filters.completed !== undefined) {
    query = query.eq('completed', filters.completed)
  }
  
  if (filters.due_date_from) {
    query = query.gte('due_date', filters.due_date_from)
  }
  
  if (filters.due_date_to) {
    query = query.lte('due_date', filters.due_date_to)
  }

  query = query.order(field, { ascending: direction === 'asc' })
  
  const start = (page - 1) * limit
  const end = start + limit - 1
  query = query.range(start, end)

  const { data, error, count } = await query

  if (error) {
    return { data: [], count: 0, error: error.message }
  }

  return { data: data || [], count: count || 0 }
}

export async function getActivitiesByContact(contactId: string): Promise<ActivitiesResponse> {
  return getActivities({ contact_id: contactId }, {}, { field: 'due_date', direction: 'asc' })
}

export async function getUpcomingActivities(): Promise<ActivitiesResponse> {
  const today = new Date().toISOString().split('T')[0]
  return getActivities(
    { completed: false, due_date_from: today },
    { limit: 10 },
    { field: 'due_date', direction: 'asc' }
  )
}

export async function getOverdueActivities(): Promise<ActivitiesResponse> {
  const today = new Date().toISOString().split('T')[0]
  return getActivities(
    { completed: false, due_date_to: today },
    {},
    { field: 'due_date', direction: 'asc' }
  )
}

export async function getActivityById(id: string): Promise<{ data: Activity | null; error?: string }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { data: null, error: 'Not authenticated' }
  }

  const orgId = await getActiveOrgId()
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId!)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data }
}

export async function createActivity(activity: Omit<Activity, 'id' | 'user_id' | 'org_id' | 'created_at' | 'updated_at'>): Promise<{ data: Activity | null; error?: string }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { data: null, error: 'Not authenticated' }
  }

  const orgId = await getActiveOrgId()

  const { data, error } = await supabase
    .from('activities')
    .insert({
      ...activity,
      user_id: session.user.id,
      org_id: orgId,
    })
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data }
}

export async function updateActivity(id: string, activity: Partial<Activity>): Promise<{ data: Activity | null; error?: string }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { data: null, error: 'Not authenticated' }
  }

  const orgId = await getActiveOrgId()

  const { data, error } = await supabase
    .from('activities')
    .update(activity)
    .eq('id', id)
    .eq('org_id', orgId!)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data }
}

export async function deleteActivity(id: string): Promise<{ error?: string }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { error: 'Not authenticated' }
  }

  const orgId = await getActiveOrgId()

  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId!)

  if (error) {
    return { error: error.message }
  }

  return {}
}
