import { createClient } from '@/lib/supabase/client'
import { getActiveOrgId } from '@/lib/api/organizations'

export interface Contact {
  id: string
  user_id: string
  org_id: string | null
  first_name: string
  last_name: string
  email?: string
  phone?: string
  company_id?: string
  company_name?: string
  title?: string
  status: 'active' | 'inactive' | 'lead'
  source?: string
  notes?: string
  avatar_url?: string
  tags?: string[]
  linkedin_url?: string
  twitter_url?: string
  city?: string
  state?: string
  country?: string
  headline?: string
  seniority?: string
  enriched_at?: string
  enrichment_data?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ContactFilters {
  status?: 'active' | 'inactive' | 'lead'
  search?: string
  tag_id?: string
  date_from?: string
  date_to?: string
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

  const orgId = await getActiveOrgId()
  if (!orgId) return { data: [], count: 0, error: 'No organization found' }
  
  const { page = 1, limit = 20 } = pagination
  const { field = 'created_at', direction = 'desc' } = sort
  const start = (page - 1) * limit
  const end = start + limit - 1
  
  let query = supabase
    .from('contacts')
    .select('*, companies:company_id(name)', { count: 'exact' })
    .eq('org_id', orgId)
    .range(start, end)
    .order(field, { ascending: direction === 'asc' })
  
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  
  if (filters.search) {
    query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
  }

  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from)
  }
  if (filters.date_to) {
    query = query.lte('created_at', `${filters.date_to}T23:59:59`)
  }

  if (filters.tag_id) {
    const supabaseForTags = createClient()
    const { data: taggedContactIds } = await supabaseForTags
      .from('contact_tags')
      .select('contact_id')
      .eq('tag_id', filters.tag_id)
    if (taggedContactIds && taggedContactIds.length > 0) {
      query = query.in('id', taggedContactIds.map(r => r.contact_id))
    } else {
      return { data: [], count: 0, error: null }
    }
  }

  const { data, error, count } = await query
  
  if (error) {
    return { data: [], count: 0, error: error.message }
  }

  const contacts = (data || []).map((row: Record<string, unknown>) => {
    const { companies, ...rest } = row
    const companyData = companies as { name: string } | null
    return {
      ...rest,
      company_name: companyData?.name || undefined,
    }
  }) as Contact[]
  
  return { data: contacts, count: count || 0, error: null }
}

export async function getContactById(id: string) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { data: null, error: 'Not authenticated' }
  }
  
  const orgId = await getActiveOrgId()
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId!)
    .single()
  
  if (error) {
    return { data: null, error: error.message }
  }
  
  return { data: data as Contact, error: null }
}

export async function createContact(contactData: Omit<Contact, 'id' | 'user_id' | 'org_id' | 'created_at' | 'updated_at'>) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { data: null, error: 'Not authenticated' }
  }
  
  const orgId = await getActiveOrgId()
  const { data, error } = await supabase
    .from('contacts')
    .insert([{
      ...contactData,
      user_id: session.user.id,
      org_id: orgId,
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
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- intentionally excluding user_id and org_id
  const { user_id, org_id, ...safeUpdates } = updates
  const orgId = await getActiveOrgId()
  
  const { data, error } = await supabase
    .from('contacts')
    .update(safeUpdates)
    .eq('id', id)
    .eq('org_id', orgId!)
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
  
  const orgId = await getActiveOrgId()
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId!)
  
  if (error) {
    return { error: error.message }
  }
  
  return { error: null }
}

export async function bulkDeleteContacts(contactIds: string[]) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { error: 'Not authenticated' }
  }
  
  if (contactIds.length === 0) {
    return { error: 'No contacts selected' }
  }
  
  const orgId = await getActiveOrgId()
  const { error } = await supabase
    .from('contacts')
    .delete()
    .in('id', contactIds)
    .eq('org_id', orgId!)
  
  if (error) {
    return { error: error.message }
  }
  
  return { error: null }
}

export async function bulkUpdateContacts(contactIds: string[], updates: { status?: 'active' | 'inactive' | 'lead'; tags?: string[] }) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { error: 'Not authenticated' }
  }
  
  if (contactIds.length === 0) {
    return { error: 'No contacts selected' }
  }
  
  const orgId = await getActiveOrgId()
  const { error } = await supabase
    .from('contacts')
    .update({
      status: updates.status,
      updated_at: new Date().toISOString(),
    })
    .in('id', contactIds)
    .eq('org_id', orgId!)
  
  if (error) {
    return { error: error.message }
  }
  
  return { error: null }
}

export async function bulkTagContacts(contactIds: string[], tags: string[]) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { error: 'Not authenticated' }
  }
  
  if (contactIds.length === 0) {
    return { error: 'No contacts selected' }
  }
  
  const orgId = await getActiveOrgId()
  // Note: This assumes a contact_tags table exists
  // For now, we'll store tags as JSON array in contacts table
  // First get current tags
  const { data: contacts, error: fetchError } = await supabase
    .from('contacts')
    .select('id, tags')
    .in('id', contactIds)
    .eq('org_id', orgId!)
  
  if (fetchError) {
    return { error: fetchError.message }
  }
  
  // Update each contact with merged tags
  const updates = contacts.map(contact => {
    const currentTags = contact.tags || []
    const newTags = Array.from(new Set([...currentTags, ...tags]))
    
    return supabase
      .from('contacts')
      .update({ 
        tags: newTags,
        updated_at: new Date().toISOString() 
      })
      .eq('id', contact.id)
      .eq('org_id', orgId!)
  })
  
  const results = await Promise.all(updates)
  const error = results.find(result => result.error)?.error
  
  if (error) {
    return { error: error.message }
  }
  
  return { error: null }
}
