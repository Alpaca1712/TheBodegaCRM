import { createClient } from '@/lib/supabase/client'
import { getActiveOrgId } from '@/lib/api/organizations'

export type InvestorType = 'vc' | 'angel' | 'family_office' | 'corporate' | 'accelerator' | 'other'
export type RelationshipStatus = 'cold' | 'warm' | 'hot' | 'portfolio' | 'passed'
export type InvestmentStage = 'intro' | 'pitch' | 'due_diligence' | 'term_sheet' | 'negotiation' | 'closed' | 'passed'
export type InvestmentInstrument = 'equity' | 'safe' | 'convertible_note' | 'other'

export interface Investor {
  id: string
  user_id: string
  org_id: string | null
  name: string
  firm: string | null
  email: string | null
  phone: string | null
  website: string | null
  linkedin_url: string | null
  type: InvestorType
  check_size_min: number | null
  check_size_max: number | null
  stage_preference: string[] | null
  thesis: string | null
  notes: string | null
  relationship_status: RelationshipStatus
  last_contacted_at: string | null
  contact_id: string | null
  created_at: string
  updated_at: string
}

export interface Investment {
  id: string
  user_id: string
  org_id: string | null
  investor_id: string
  round_name: string
  amount: number | null
  valuation_pre: number | null
  valuation_post: number | null
  equity_percentage: number | null
  instrument: InvestmentInstrument
  stage: InvestmentStage
  pitch_date: string | null
  close_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InvestorFilters {
  type?: InvestorType
  relationship_status?: RelationshipStatus
  search?: string
}

export interface InvestmentFilters {
  stage?: InvestmentStage
  investor_id?: string
  search?: string
}

export interface PaginationOptions {
  page?: number
  limit?: number
}

// ─── Investors ───

export async function getInvestors(
  filters: InvestorFilters = {},
  pagination: PaginationOptions = {}
) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { data: [], count: 0, error: 'Not authenticated' }
  const orgId = await getActiveOrgId()

  const { page = 1, limit = 20 } = pagination
  const start = (page - 1) * limit
  const end = start + limit - 1

  let query = supabase
    .from('investors')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId!)
    .range(start, end)
    .order('created_at', { ascending: false })

  if (filters.type) query = query.eq('type', filters.type)
  if (filters.relationship_status) query = query.eq('relationship_status', filters.relationship_status)
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,firm.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
  }

  const { data, error, count } = await query
  if (error) return { data: [], count: 0, error: error.message }
  return { data: data as Investor[], count: count || 0, error: null }
}

export async function getInvestorById(id: string) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { data: null, error: 'Not authenticated' }
  const orgId = await getActiveOrgId()

  const { data, error } = await supabase
    .from('investors')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId!)
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as Investor, error: null }
}

export async function createInvestor(investor: Omit<Investor, 'id' | 'user_id' | 'org_id' | 'created_at' | 'updated_at'>) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { data: null, error: 'Not authenticated' }
  const orgId = await getActiveOrgId()

  const { data, error } = await supabase
    .from('investors')
    .insert([{ ...investor, user_id: session.user.id, org_id: orgId }])
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as Investor, error: null }
}

export async function updateInvestor(id: string, updates: Partial<Investor>) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { data: null, error: 'Not authenticated' }
  const orgId = await getActiveOrgId()

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- intentionally excluding user_id, org_id
  const { user_id, org_id, ...safeUpdates } = updates

  const { data, error } = await supabase
    .from('investors')
    .update(safeUpdates)
    .eq('id', id)
    .eq('org_id', orgId!)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as Investor, error: null }
}

export async function deleteInvestor(id: string) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated' }
  const orgId = await getActiveOrgId()

  const { error } = await supabase
    .from('investors')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId!)

  if (error) return { error: error.message }
  return { error: null }
}

// ─── Investments ───

export async function getInvestments(
  filters: InvestmentFilters = {},
  pagination: PaginationOptions = {}
) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { data: [], count: 0, error: 'Not authenticated' }
  const orgId = await getActiveOrgId()

  const { page = 1, limit = 20 } = pagination
  const start = (page - 1) * limit
  const end = start + limit - 1

  let query = supabase
    .from('investments')
    .select('*, investors(name, firm)', { count: 'exact' })
    .eq('org_id', orgId!)
    .range(start, end)
    .order('created_at', { ascending: false })

  if (filters.stage) query = query.eq('stage', filters.stage)
  if (filters.investor_id) query = query.eq('investor_id', filters.investor_id)
  if (filters.search) {
    query = query.ilike('round_name', `%${filters.search}%`)
  }

  const { data, error, count } = await query
  if (error) return { data: [], count: 0, error: error.message }
  return { data: data as (Investment & { investors: { name: string; firm: string | null } })[], count: count || 0, error: null }
}

export async function getInvestmentsByStage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { data: [], error: 'Not authenticated' }
  const orgId = await getActiveOrgId()

  const { data, error } = await supabase
    .from('investments')
    .select('*, investors(name, firm)')
    .eq('org_id', orgId!)
    .order('created_at', { ascending: true })

  if (error) return { data: [], error: error.message }
  return { data: data as (Investment & { investors: { name: string; firm: string | null } })[], error: null }
}

export async function createInvestment(investment: Omit<Investment, 'id' | 'user_id' | 'org_id' | 'created_at' | 'updated_at'>) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { data: null, error: 'Not authenticated' }
  const orgId = await getActiveOrgId()

  const { data, error } = await supabase
    .from('investments')
    .insert([{ ...investment, user_id: session.user.id, org_id: orgId }])
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as Investment, error: null }
}

export async function updateInvestment(id: string, updates: Partial<Investment>) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { data: null, error: 'Not authenticated' }
  const orgId = await getActiveOrgId()

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- intentionally excluding user_id, org_id
  const { user_id, org_id, ...safeUpdates } = updates

  const { data, error } = await supabase
    .from('investments')
    .update(safeUpdates)
    .eq('id', id)
    .eq('org_id', orgId!)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as Investment, error: null }
}

export async function deleteInvestment(id: string) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated' }
  const orgId = await getActiveOrgId()

  const { error } = await supabase
    .from('investments')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId!)

  if (error) return { error: error.message }
  return { error: null }
}

// ─── Stats ───

export async function getInvestorStats() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { data: null, error: 'Not authenticated' }
  const orgId = await getActiveOrgId()

  const { data: investments, error } = await supabase
    .from('investments')
    .select('amount, stage')
    .eq('org_id', orgId!)

  if (error) return { data: null, error: error.message }

  const totalRaised = investments
    .filter(i => i.stage === 'closed')
    .reduce((sum, i) => sum + (i.amount || 0), 0)

  const totalPipeline = investments
    .filter(i => !['closed', 'passed'].includes(i.stage))
    .reduce((sum, i) => sum + (i.amount || 0), 0)

  const byStage = investments.reduce((acc, inv) => {
    acc[inv.stage] = (acc[inv.stage] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    data: { totalRaised, totalPipeline, byStage, totalInvestments: investments.length },
    error: null,
  }
}
