import { createClient } from '@/lib/supabase/client'

export interface Company {
  id: string
  user_id: string
  name: string
  domain?: string
  industry?: string
  size?: '1-10' | '11-50' | '51-200' | '201-500' | '500+'
  website?: string
  phone?: string
  address_line1?: string
  address_city?: string
  address_state?: string
  address_country?: string
  logo_url?: string
  created_at: string
  updated_at: string
}

export interface CompanyFilters {
  industry?: string
  search?: string
  size?: '1-10' | '11-50' | '51-200' | '201-500' | '500+'
}

export interface PaginationOptions {
  page?: number
  limit?: number
}

export interface SortOptions {
  field?: 'name' | 'industry' | 'created_at'
  direction?: 'asc' | 'desc'
}

export interface CompaniesResponse {
  data: Company[]
  count: number
  error?: string
}

export async function getCompanies(
  filters: CompanyFilters = {},
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
    .from('companies')
    .select('*', { count: 'exact' })
    .eq('user_id', session.user.id)
    .range(start, end)
    .order(field, { ascending: direction === 'asc' })
  
  if (filters.industry) {
    query = query.eq('industry', filters.industry)
  }
  
  if (filters.size) {
    query = query.eq('size', filters.size)
  }
  
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,domain.ilike.%${filters.search}%,industry.ilike.%${filters.search}%`)
  }
  
  const { data, error, count } = await query
  
  if (error) {
    return { data: [], count: 0, error: error.message }
  }
  
  return { data: data as Company[], count: count || 0, error: null }
}

export async function getCompanyById(id: string) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { data: null, error: 'Not authenticated' }
  }
  
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .eq('user_id', session.user.id)
    .single()
  
  if (error) {
    return { data: null, error: error.message }
  }
  
  return { data: data as Company, error: null }
}

export async function createCompany(companyData: Omit<Company, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { data: null, error: 'Not authenticated' }
  }
  
  const { data, error } = await supabase
    .from('companies')
    .insert([{
      ...companyData,
      user_id: session.user.id,
    }])
    .select()
    .single()
  
  if (error) {
    return { data: null, error: error.message }
  }
  
  return { data: data as Company, error: null }
}

export async function updateCompany(id: string, updates: Partial<Company>) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { data: null, error: 'Not authenticated' }
  }
  
  // Don't allow updating user_id
  const { user_id, ...safeUpdates } = updates
  
  const { data, error } = await supabase
    .from('companies')
    .update(safeUpdates)
    .eq('id', id)
    .eq('user_id', session.user.id)
    .select()
    .single()
  
  if (error) {
    return { data: null, error: error.message }
  }
  
  return { data: data as Company, error: null }
}

export async function deleteCompany(id: string) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { error: 'Not authenticated' }
  }
  
  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id)
  
  if (error) {
    return { error: error.message }
  }
  
  return { error: null }
}
