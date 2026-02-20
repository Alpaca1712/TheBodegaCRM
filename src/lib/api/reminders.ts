import { createClient } from '@/lib/supabase/client'
import { Reminder, ReminderInsert, ReminderUpdate } from '@/types/database'

type ReminderType = 'stale_deal' | 'stale_contact' | 'overdue_activity' | 'upcoming_followup'
type EntityType = 'contact' | 'company' | 'deal' | 'activity' | 'investor'

export interface GetRemindersFilters {
  isRead?: boolean
  isResolved?: boolean
  type?: ReminderType
  entityType?: EntityType
  limit?: number
}

// Client-side functions

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
    
    if (filters.isRead !== undefined) {
      query = query.eq('is_read', filters.isRead)
    }
    
    if (filters.isResolved !== undefined) {
      query = query.eq('is_resolved', filters.isResolved)
    }
    
    if (filters.type) {
      query = query.eq('type', filters.type)
    }
    
    if (filters.entityType) {
      query = query.eq('entity_type', filters.entityType)
    }
    
    if (filters.limit) {
      query = query.limit(filters.limit)
    }
    
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

export async function updateReminder(
  id: string,
  updates: ReminderUpdate
): Promise<{
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

export async function markAsRead(id: string): Promise<{
  data: Reminder | null
  error: Error | null
}> {
  return updateReminder(id, { is_read: true })
}

export async function markAsResolved(id: string): Promise<{
  data: Reminder | null
  error: Error | null
}> {
  return updateReminder(id, { 
    is_resolved: true,
    resolved_at: new Date().toISOString()
  })
}

export async function deleteReminder(id: string): Promise<{
  success: boolean
  error: Error | null
}> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return { success: true, error: null }
  } catch (error) {
    console.error('Error deleting reminder:', error)
    return { success: false, error: error as Error }
  }
}

// Server-side functions

export async function getRemindersServer(filters: GetRemindersFilters = {}): Promise<{
  data: Reminder[] | null
  error: Error | null
}> {
  // Note: Server client temporarily unavailable due to build issues
  const supabase = createClient()
  
  try {
    let query = supabase
      .from('reminders')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (filters.isRead !== undefined) {
      query = query.eq('is_read', filters.isRead)
    }
    
    if (filters.isResolved !== undefined) {
      query = query.eq('is_resolved', filters.isResolved)
    }
    
    if (filters.type) {
      query = query.eq('type', filters.type)
    }
    
    if (filters.entityType) {
      query = query.eq('entity_type', filters.entityType)
    }
    
    if (filters.limit) {
      query = query.limit(filters.limit)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching reminders:', error)
    return { data: null, error: error as Error }
  }
}

// Smart reminder generation functions

export async function generateStaleDealReminders(): Promise<{
  success: boolean
  count: number
  error: Error | null
}> {
  const supabase = createClient()
  
  try {
    // Find deals with no activity in 7+ days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select('id, title, updated_at, user_id, org_id')
      .lt('updated_at', sevenDaysAgo.toISOString())
      .neq('stage', 'closed_won')
      .neq('stage', 'closed_lost')
      .is('archived', false)
    
    if (dealsError) throw dealsError
    
    // Check if reminders already exist for these deals
    const dealIds = deals.map(deal => deal.id)
    const { data: existingReminders, error: remindersError } = await supabase
      .from('reminders')
      .select('entity_id')
      .in('entity_id', dealIds)
      .eq('type', 'stale_deal')
      .eq('is_resolved', false)
    
    if (remindersError) throw remindersError
    
    const existingDealIds = new Set(existingReminders?.map(r => r.entity_id) || [])
    const newDeals = deals.filter(deal => !existingDealIds.has(deal.id))
    
    // Create reminders for new stale deals
    let createdCount = 0
    
    for (const deal of newDeals) {
      const reminder: ReminderInsert = {
        user_id: deal.user_id,
        org_id: deal.org_id,
        type: 'stale_deal',
        title: `Stale Deal: ${deal.title}`,
        description: 'No activity in 7+ days. Consider following up or updating the deal stage.',
        entity_type: 'deal',
        entity_id: deal.id,
        due_date: null
      }
      
      const { error } = await supabase
        .from('reminders')
        .insert(reminder)
      
      if (!error) {
        createdCount++
      }
    }
    
    return { success: true, count: createdCount, error: null }
  } catch (error) {
    console.error('Error generating stale deal reminders:', error)
    return { success: false, count: 0, error: error as Error }
  }
}

export async function generateStaleContactReminders(): Promise<{
  success: boolean
  count: number
  error: Error | null
}> {
  const supabase = createClient()
  
  try {
    // Find contacts with no activity in 30+ days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, updated_at, user_id, org_id')
      .lt('updated_at', thirtyDaysAgo.toISOString())
      .is('archived', false)
    
    if (contactsError) throw contactsError
    
    // Check if reminders already exist for these contacts
    const contactIds = contacts.map(contact => contact.id)
    const { data: existingReminders, error: remindersError } = await supabase
      .from('reminders')
      .select('entity_id')
      .in('entity_id', contactIds)
      .eq('type', 'stale_contact')
      .eq('is_resolved', false)
    
    if (remindersError) throw remindersError
    
    const existingContactIds = new Set(existingReminders?.map(r => r.entity_id) || [])
    const newContacts = contacts.filter(contact => !existingContactIds.has(contact.id))
    
    // Create reminders for new stale contacts
    let createdCount = 0
    
    for (const contact of newContacts) {
      const reminder: ReminderInsert = {
        user_id: contact.user_id,
        org_id: contact.org_id,
        type: 'stale_contact',
        title: `Stale Contact: ${contact.first_name} ${contact.last_name}`,
        description: 'No contact in 30+ days. Consider reaching out to maintain the relationship.',
        entity_type: 'contact',
        entity_id: contact.id,
        due_date: null
      }
      
      const { error } = await supabase
        .from('reminders')
        .insert(reminder)
      
      if (!error) {
        createdCount++
      }
    }
    
    return { success: true, count: createdCount, error: null }
  } catch (error) {
    console.error('Error generating stale contact reminders:', error)
    return { success: false, count: 0, error: error as Error }
  }
}

export async function generateOverdueActivityReminders(): Promise<{
  success: boolean
  count: number
  error: Error | null
}> {
  const supabase = createClient()
  
  try {
    // Find activities with due_date in the past and not completed
    const now = new Date()
    
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('id, title, due_date, user_id, org_id')
      .lt('due_date', now.toISOString())
      .eq('completed', false)
    
    if (activitiesError) throw activitiesError
    
    // Check if reminders already exist for these activities
    const activityIds = activities.map(activity => activity.id)
    const { data: existingReminders, error: remindersError } = await supabase
      .from('reminders')
      .select('entity_id')
      .in('entity_id', activityIds)
      .eq('type', 'overdue_activity')
      .eq('is_resolved', false)
    
    if (remindersError) throw remindersError
    
    const existingActivityIds = new Set(existingReminders?.map(r => r.entity_id) || [])
    const newActivities = activities.filter(activity => !existingActivityIds.has(activity.id))
    
    // Create reminders for new overdue activities
    let createdCount = 0
    
    for (const activity of newActivities) {
      const reminder: ReminderInsert = {
        user_id: activity.user_id,
        org_id: activity.org_id,
        type: 'overdue_activity',
        title: `Overdue Activity: ${activity.title}`,
        description: 'This activity is past its due date. Please complete or reschedule.',
        entity_type: 'activity',
        entity_id: activity.id,
        due_date: activity.due_date
      }
      
      const { error } = await supabase
        .from('reminders')
        .insert(reminder)
      
      if (!error) {
        createdCount++
      }
    }
    
    return { success: true, count: createdCount, error: null }
  } catch (error) {
    console.error('Error generating overdue activity reminders:', error)
    return { success: false, count: 0, error: error as Error }
  }
}

export async function generateAllReminders(): Promise<{
  success: boolean
  staleDeals: number
  staleContacts: number
  overdueActivities: number
  error: Error | null
}> {
  try {
    const [staleDealsResult, staleContactsResult, overdueActivitiesResult] = await Promise.all([
      generateStaleDealReminders(),
      generateStaleContactReminders(),
      generateOverdueActivityReminders()
    ])
    
    const success = staleDealsResult.success && staleContactsResult.success && overdueActivitiesResult.success
    
    return {
      success,
      staleDeals: staleDealsResult.count,
      staleContacts: staleContactsResult.count,
      overdueActivities: overdueActivitiesResult.count,
      error: staleDealsResult.error || staleContactsResult.error || overdueActivitiesResult.error || null
    }
  } catch (error) {
    console.error('Error generating all reminders:', error)
    return {
      success: false,
      staleDeals: 0,
      staleContacts: 0,
      overdueActivities: 0,
      error: error as Error
    }
  }
}
