import { createClient } from '@/lib/supabase/client'
import { Reminder, ReminderInsert, ReminderUpdate } from '@/types/database'

type ReminderType = 'stale_deal' | 'stale_contact' | 'overdue_activity' | 'upcoming_followup'
type EntityType = 'contact' | 'company' | 'deal' | 'activity' | 'investor' | 'lead'

export interface GetRemindersFilters {
  isRead?: boolean
  isResolved?: boolean
  type?: ReminderType
  entityType?: EntityType
  limit?: number
}

export async function getReminders(filters: GetRemindersFilters = {}): Promise<{
  data: Reminder[] | null
  error: Error | null
}> {
  const supabase = createClient()

  try {
    let query = supabase
      .from('reminders')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters.isRead !== undefined) query = query.eq('is_read', filters.isRead)
    if (filters.isResolved !== undefined) query = query.eq('is_resolved', filters.isResolved)
    if (filters.type) query = query.eq('type', filters.type)
    if (filters.entityType) query = query.eq('entity_type', filters.entityType)
    if (filters.limit) query = query.limit(filters.limit)

    const { data, error } = await query
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching reminders:', error)
    return { data: null, error: error as Error }
  }
}

export async function createReminder(reminder: ReminderInsert): Promise<{
  data: Reminder | null
  error: Error | null
}> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('reminders')
      .insert(reminder)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error creating reminder:', error)
    return { data: null, error: error as Error }
  }
}

export async function updateReminder(id: string, updates: ReminderUpdate): Promise<{
  data: Reminder | null
  error: Error | null
}> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('reminders')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating reminder:', error)
    return { data: null, error: error as Error }
  }
}

export async function markAsRead(id: string) {
  return updateReminder(id, { is_read: true })
}

export async function markAsResolved(id: string) {
  return updateReminder(id, { is_resolved: true, resolved_at: new Date().toISOString() })
}

export async function deleteReminder(id: string): Promise<{
  success: boolean
  error: Error | null
}> {
  const supabase = createClient()

  try {
    const { error } = await supabase.from('reminders').delete().eq('id', id)
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('Error deleting reminder:', error)
    return { success: false, error: error as Error }
  }
}

export async function generateFollowUpReminders(): Promise<{
  success: boolean
  count: number
  error: Error | null
}> {
  const supabase = createClient()

  try {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, contact_name, company_name, stage, last_contacted_at, user_id')
      .in('stage', ['email_sent', 'follow_up', 'no_response'])
      .lt('last_contacted_at', threeDaysAgo.toISOString())

    if (leadsError) throw leadsError

    const leadIds = (leads || []).map(l => l.id)
    const { data: existingReminders } = await supabase
      .from('reminders')
      .select('entity_id')
      .in('entity_id', leadIds.length > 0 ? leadIds : ['none'])
      .eq('type', 'upcoming_followup')
      .eq('is_resolved', false)

    const existingIds = new Set(existingReminders?.map(r => r.entity_id) || [])
    const newLeads = (leads || []).filter(l => !existingIds.has(l.id))

    let createdCount = 0
    for (const lead of newLeads) {
      const reminder: ReminderInsert = {
        user_id: lead.user_id,
        type: 'upcoming_followup',
        title: `Follow up: ${lead.contact_name} at ${lead.company_name}`,
        description: `Lead has been in "${lead.stage}" stage. Time to send a follow-up.`,
        entity_type: 'lead',
        entity_id: lead.id,
        due_date: new Date().toISOString(),
      }

      const { error } = await supabase.from('reminders').insert(reminder)
      if (!error) createdCount++
    }

    return { success: true, count: createdCount, error: null }
  } catch (error) {
    console.error('Error generating follow-up reminders:', error)
    return { success: false, count: 0, error: error as Error }
  }
}

export async function generateAllReminders(): Promise<{
  success: boolean
  followUps: number
  error: Error | null
}> {
  try {
    const result = await generateFollowUpReminders()
    return { success: result.success, followUps: result.count, error: result.error }
  } catch (error) {
    console.error('Error generating all reminders:', error)
    return { success: false, followUps: 0, error: error as Error }
  }
}
