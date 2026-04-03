import { supabase } from '@/lib/supabase/client'
import type {
  Lead,
  LeadEmail,
  LeadInsert,
  LeadUpdate,
  LeadEmailInsert,
  LeadType,
  PipelineStage,
  Priority,
  PipelineStats,
  DashboardStats,
  FollowUpSuggestion,
  EmailType,
} from '@/types/leads'

// ─── Lead CRUD ───

export async function getLeads(filters?: {
  type?: LeadType
  stage?: PipelineStage
  priority?: Priority
  search?: string
  limit?: number
  offset?: number
}): Promise<{ data: Lead[]; count: number }> {
  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })

  if (filters?.type) query = query.eq('type', filters.type)
  if (filters?.stage) query = query.eq('stage', filters.stage)
  if (filters?.priority) query = query.eq('priority', filters.priority)
  if (filters?.search) {
    query = query.or(
      `contact_name.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%,contact_email.ilike.%${filters.search}%`
    )
  }
  if (filters?.limit) query = query.limit(filters.limit)
  if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)

  const { data, error, count } = await query
  if (error) throw error
  return { data: (data as Lead[]) || [], count: count || 0 }
}

export async function getLead(id: string): Promise<Lead> {
  const { data, error } = await supabase.from('leads').select('*').eq('id', id).single()
  if (error) throw error
  return data as Lead
}

export async function createLead(lead: LeadInsert): Promise<Lead> {
  const { data, error } = await supabase.from('leads').insert(lead).select().single()
  if (error) throw error
  return data as Lead
}

export async function updateLead(id: string, updates: LeadUpdate): Promise<Lead> {
  const { data, error } = await supabase.from('leads').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data as Lead
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) throw error
}

// ─── Lead Email CRUD ───

export async function getLeadEmails(leadId: string): Promise<LeadEmail[]> {
  const { data, error } = await supabase
    .from('lead_emails')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as LeadEmail[]) || []
}

export async function createLeadEmail(email: LeadEmailInsert): Promise<LeadEmail> {
  const { data, error } = await supabase.from('lead_emails').insert(email).select().single()
  if (error) throw error
  return data as LeadEmail
}

export async function updateLeadEmail(
  id: string,
  updates: Partial<Pick<LeadEmail, 'sent_at' | 'replied_at' | 'reply_content' | 'subject' | 'body'>>
): Promise<LeadEmail> {
  const { data, error } = await supabase.from('lead_emails').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data as LeadEmail
}

// ─── Pipeline Stats ───

export async function getPipelineStats(): Promise<PipelineStats[]> {
  const { data, error } = await supabase.from('leads').select('stage')
  if (error) throw error

  const counts: Record<string, number> = {}
  for (const row of data || []) {
    counts[row.stage] = (counts[row.stage] || 0) + 1
  }

  return Object.entries(counts).map(([stage, count]) => ({
    stage: stage as PipelineStage,
    count,
  }))
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const weekStr = oneWeekAgo.toISOString()

  const [leadsRes, emailsRes, pipelineRes] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact' }),
    supabase.from('lead_emails').select('id, email_type, sent_at, replied_at'),
    getPipelineStats(),
  ])

  const allEmails = emailsRes.data || []
  const emailsSentThisWeek = allEmails.filter(
    (e) => e.sent_at && new Date(e.sent_at) >= new Date(weekStr)
  ).length
  const repliesThisWeek = allEmails.filter(
    (e) => e.replied_at && new Date(e.replied_at) >= new Date(weekStr)
  ).length

  const meetingsBooked = pipelineRes.find((s) => s.stage === 'meeting_booked')?.count || 0

  return {
    totalLeads: leadsRes.count || 0,
    emailsSentThisWeek,
    repliesThisWeek,
    meetingsBooked,
    pipelineByStage: pipelineRes,
  }
}

// ─── Follow-Up Suggestions ───

export async function getFollowUpSuggestions(): Promise<FollowUpSuggestion[]> {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .in('stage', ['email_sent', 'follow_up'])
    .order('last_contacted_at', { ascending: true })

  if (error) throw error
  if (!leads?.length) return []

  const suggestions: FollowUpSuggestion[] = []

  for (const lead of leads as Lead[]) {
    const { data: emails } = await supabase
      .from('lead_emails')
      .select('*')
      .eq('lead_id', lead.id)
      .not('sent_at', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(1)

    const lastEmail = emails?.[0] as LeadEmail | undefined
    if (!lastEmail?.sent_at) continue

    const daysSince = Math.floor(
      (Date.now() - new Date(lastEmail.sent_at).getTime()) / (1000 * 60 * 60 * 24)
    )

    let suggestedType: EmailType = 'follow_up_1'
    let suggestedChannel: 'email' | 'linkedin' | 'twitter' = 'email'

    if (daysSince >= 21) {
      suggestedType = 'break_up'
    } else if (daysSince >= 14) {
      suggestedType = 'follow_up_3'
      suggestedChannel = 'linkedin'
    } else if (daysSince >= 9) {
      suggestedType = 'follow_up_2'
    } else if (daysSince >= 4) {
      suggestedType = 'follow_up_1'
    } else {
      continue
    }

    suggestions.push({
      lead: lead,
      lastEmail: lastEmail || null,
      daysSinceLastEmail: daysSince,
      suggestedFollowUpType: suggestedType,
      suggestedChannel,
    })
  }

  return suggestions.sort((a, b) => b.daysSinceLastEmail - a.daysSinceLastEmail)
}

// ─── CSV Import ───

export async function importLeadsFromCSV(
  rows: Record<string, string>[],
  userId: string
): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = []
  let imported = 0

  // NOTE: Duplicate detection - CSV imports may contain leads that already exist
  // in the database. Consider checking for duplicates by contact_email or
  // company_name + contact_name before inserting. For now, duplicates will be
  // created as separate records. A future improvement could query existing leads
  // and skip/merge rows that match on (contact_email) or (company_name + contact_name).

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const lead: LeadInsert = {
        user_id: userId,
        type: (row.type as LeadType) || 'customer',
        company_name: row.company_name || row.company || '',
        product_name: row.product_name || null,
        fund_name: row.fund_name || null,
        contact_name: row.contact_name || row.name || '',
        contact_title: row.contact_title || row.title || null,
        contact_email: row.contact_email || row.email || null,
        contact_twitter: row.contact_twitter || row.twitter || null,
        contact_linkedin: row.contact_linkedin || row.linkedin || null,
        company_description: row.company_description || null,
        attack_surface_notes: row.attack_surface_notes || null,
        investment_thesis_notes: row.investment_thesis_notes || null,
        personal_details: row.personal_details || null,
        smykm_hooks: row.smykm_hooks ? row.smykm_hooks.split('|') : [],
        stage: 'researched',
        source: row.source || 'csv_import',
        priority: (row.priority as Priority) || 'medium',
        notes: row.notes || null,
      }

      if (!lead.company_name || !lead.contact_name) {
        errors.push(`Row ${i + 1}: Missing required fields (company_name, contact_name)`)
        continue
      }

      await createLead(lead)
      imported++
    } catch (e) {
      errors.push(`Row ${i + 1}: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  return { imported, errors }
}
