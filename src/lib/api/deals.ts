import { createClient } from '@/lib/supabase/client'
import { getActiveOrgId } from '@/lib/api/organizations'

export interface Deal {
  id: string
  user_id: string
  org_id: string | null
  title: string
  value: number | null
  currency: string
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
  contact_id: string | null
  company_id: string | null
  expected_close_date: string | null
  probability: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DealFilters {
  stage?: string
  search?: string
  contact_id?: string
  company_id?: string
}

export interface PaginationOptions {
  page?: number
  limit?: number
}

export interface SortOptions {
  field?: 'title' | 'value' | 'expected_close_date' | 'created_at' | 'stage'
  direction?: 'asc' | 'desc'
}

export interface DealsResponse {
  data: Deal[]
  count: number
  error?: string
}

export async function getDeals(
  filters: DealFilters = {},
  pagination: PaginationOptions = {},
  sort: SortOptions = {}
) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { data: [], count: 0, error: 'Not authenticated' }
  }

  const orgId = await getActiveOrgId()
  
  const { page = 1, limit = 20 } = pagination
  const { field = 'created_at', direction = 'desc' } = sort
  const start = (page - 1) * limit
  const end = start + limit - 1
  
  let query = supabase
    .from('deals')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId!)
    .range(start, end)
    .order(field, { ascending: direction === 'asc' })
  
  if (filters.stage) {
    query = query.eq('stage', filters.stage)
  }
  
  if (filters.contact_id) {
    query = query.eq('contact_id', filters.contact_id)
  }
  
  if (filters.company_id) {
    query = query.eq('company_id', filters.company_id)
  }
  
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`)
  }
  
  const { data, error, count } = await query
  
  if (error) {
    return { data: [], count: 0, error: error.message }
  }
  
  return { data: data as Deal[], count: count || 0, error: null }
}

export async function getDealById(id: string) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { data: null, error: 'Not authenticated' }
  }

  const orgId = await getActiveOrgId()
  
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId!)
    .single()
  
  if (error) {
    return { data: null, error: error.message }
  }
  
  return { data: data as Deal, error: null }
}

export async function createDeal(dealData: Omit<Deal, 'id' | 'user_id' | 'org_id' | 'created_at' | 'updated_at'>) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { data: null, error: 'Not authenticated' }
  }

  const orgId = await getActiveOrgId()
  
  const { data, error } = await supabase
    .from('deals')
    .insert([{
      ...dealData,
      user_id: session.user.id,
      org_id: orgId,
    }])
    .select()
    .single()
  
  if (error) {
    return { data: null, error: error.message }
  }
  
  return { data: data as Deal, error: null }
}

export async function updateDeal(id: string, updates: Partial<Deal>) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { data: null, error: 'Not authenticated' }
  }

  const orgId = await getActiveOrgId()
  
  // Don't allow updating user_id or org_id
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- intentionally excluding user_id, org_id
  const { user_id, org_id, ...safeUpdates } = updates
  
  const { data, error } = await supabase
    .from('deals')
    .update(safeUpdates)
    .eq('id', id)
    .eq('org_id', orgId!)
    .select()
    .single()
  
  if (error) {
    return { data: null, error: error.message }
  }
  
  return { data: data as Deal, error: null }
}

export async function deleteDeal(id: string) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { error: 'Not authenticated' }
  }

  const orgId = await getActiveOrgId()
  
  const { error } = await supabase
    .from('deals')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId!)
  
  if (error) {
    return { error: error.message }
  }
  
  return { error: null }
}

export async function getDealsByStage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { data: [], error: 'Not authenticated' }
  }

  const orgId = await getActiveOrgId()
  
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('org_id', orgId!)
    .order('expected_close_date', { ascending: true, nullsFirst: false })
  
  if (error) {
    return { data: [], error: error.message }
  }
  
  return { data: data as Deal[], error: null }
}

export async function getDealStats() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { data: null, error: 'Not authenticated' }
  }

  const orgId = await getActiveOrgId()
  
  // Get total deal value by stage
  const { data: stageData, error: stageError } = await supabase
    .from('deals')
    .select('stage, value')
    .eq('org_id', orgId!)
  
  if (stageError) {
    return { data: null, error: stageError.message }
  }
  
  // Get total and average values
  const { data: statsData, error: statsError } = await supabase
    .from('deals')
    .select('value')
    .eq('org_id', orgId!)
  
  if (statsError) {
    return { data: null, error: statsError.message }
  }
  
  const totalValue = statsData.reduce((sum, deal) => sum + (deal.value || 0), 0)
  const avgValue = statsData.length > 0 ? totalValue / statsData.length : 0
  
  const dealsByStage = stageData.reduce((acc, deal) => {
    const stage = deal.stage
    if (!acc[stage]) {
      acc[stage] = { count: 0, totalValue: 0 }
    }
    acc[stage].count += 1
    acc[stage].totalValue += deal.value || 0
    return acc
  }, {} as Record<string, { count: number; totalValue: number }>)
  
  return {
    data: {
      totalDeals: statsData.length,
      totalValue,
      averageValue: avgValue,
      dealsByStage,
    },
    error: null
  }
}
