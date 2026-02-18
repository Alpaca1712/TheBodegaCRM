import { createClient } from '@/lib/supabase/client'

export interface Contact {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  company_id?: string
  title?: string
  status: 'active' | 'inactive' | 'lead'
  source?: string
  notes?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface ContactFilters {
  status?: 'active' | 'inactive' | 'lead'
  search?: string
}

export interface PaginationOptions {
  page?: number
  limit?: number
}

export interface SortOptions {
  field?: 'first_name' | 'last_name' | 'email' | 'status' | 'created_at'
  direction?: 'asc' | 'desc'
}

export interface ContactsResponse {
  data: Contact[]
  count: number
  error?: string
}

export async function getContacts(
  filters: ContactFilters = {},
  pagination: PaginationOptions = {},
  sort: SortOptions = {}
) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { data: [], count: 0, error: 'Not authenticated' }
  }
  
  const { page = 1, limit = 20 } = pagination
  const { field = 'created_at', direction = 'desc' } = sort
  const start = (page - 1) * limit
  const end = start + limit - 1
  
  let query = supabase
    .from('contacts')
    .select('*', { count: 'exact' })
    .eq('user_id', session.user.id)
    .range(start, end)
    .order(field, { ascending: direction === 'asc' })
  
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  
  if (filters.search) {
    query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
  }
  
  const { data, error, count } = await query
  
  if (error) {
    return { data: [], count: 0, error: error.message }
  }
  
  return { data: data as Contact[], count: count || 0, error: null }
}

export async function getContactById(id: string) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { data: null, error: 'Not authenticated' }
  }
  
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .eq('user_id', session.user.id)
    .single()
  
  if (error) {
    return { data: null, error: error.message }
  }
  
  return { data: data as Contact, error: null }
}

export async function createContact(contactData: Omit<Contact, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { data: null, error: 'Not authenticated' }
  }
  
  const { data, error } = await supabase
    .from('contacts')
    .insert([{
      ...contactData,
      user_id: session.user.id,
    }])
    .select()
    .single()
  
  if (error) {
    return { data: null, error: error.message }
  }
  
  return { data: data as Contact, error: null }
}

export async function updateContact(id: string, updates: Partial<Contact>) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { data: null, error: 'Not authenticated' }
  }
  
  // Don't allow updating user_id
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- intentionally excluding user_id
  const { user_id, ...safeUpdates } = updates
  
  const { data, error } = await supabase
    .from('contacts')
    .update(safeUpdates)
    .eq('id', id)
    .eq('user_id', session.user.id)
    .select()
    .single()
  
  if (error) {
    return { data: null, error: error.message }
  }
  
  return { data: data as Contact, error: null }
}

export async function deleteContact(id: string) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { error: 'Not authenticated' }
  }
  
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id)
  
  if (error) {
    return { error: error.message }
  }
  
  return { error: null }
}
