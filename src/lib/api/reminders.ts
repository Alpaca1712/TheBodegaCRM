import { apiRequest } from '@/lib/api/request'
import type { Reminder, ReminderInsert, ReminderUpdate } from '@/types/database'

type ReminderType = 'stale_deal' | 'stale_contact' | 'overdue_activity' | 'upcoming_followup'
type EntityType = 'contact' | 'company' | 'deal' | 'activity' | 'investor' | 'lead'

export interface GetRemindersFilters {
  isRead?: boolean
  isResolved?: boolean
  type?: ReminderType
  entityType?: EntityType
  limit?: number
}

type ApiResult<T> = {
  data: T | null
  error: Error | null
}

export async function getReminders(filters: GetRemindersFilters = {}): Promise<ApiResult<Reminder[]>> {
  try {
    const params = new URLSearchParams()
    if (filters.isRead !== undefined) params.set('isRead', String(filters.isRead))
    if (filters.isResolved !== undefined) params.set('isResolved', String(filters.isResolved))
    if (filters.type) params.set('type', filters.type)
    if (filters.entityType) params.set('entityType', filters.entityType)
    if (filters.limit) params.set('limit', String(filters.limit))

    const result = await apiRequest<{ data: Reminder[] }>(
      `/api/reminders${params.size ? `?${params}` : ''}`,
      {},
      'Failed to load reminders',
    )
    return { data: result.data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

export async function createReminder(reminder: ReminderInsert): Promise<ApiResult<Reminder>> {
  try {
    const data = await apiRequest<Reminder>(
      '/api/reminders',
      {
        method: 'POST',
        body: JSON.stringify({
          type: reminder.type,
          title: reminder.title,
          description: reminder.description,
          entity_type: reminder.entity_type,
          entity_id: reminder.entity_id,
          due_date: reminder.due_date,
        }),
      },
      'Failed to create reminder',
    )
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

export async function updateReminder(id: string, updates: ReminderUpdate): Promise<ApiResult<Reminder>> {
  try {
    const {
      title,
      description,
      due_date,
      is_read,
      is_resolved,
      resolved_at,
    } = updates
    const data = await apiRequest<Reminder>(
      `/api/reminders/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          ...(title !== undefined ? { title } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(due_date !== undefined ? { due_date } : {}),
          ...(is_read !== undefined ? { is_read } : {}),
          ...(is_resolved !== undefined ? { is_resolved } : {}),
          ...(resolved_at !== undefined ? { resolved_at } : {}),
        }),
      },
      'Failed to update reminder',
    )
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

export function markAsRead(id: string) {
  return updateReminder(id, { is_read: true })
}

export function markAsResolved(id: string) {
  return updateReminder(id, {
    is_resolved: true,
    resolved_at: new Date().toISOString(),
  })
}

export async function deleteReminder(id: string): Promise<{
  success: boolean
  error: Error | null
}> {
  try {
    await apiRequest<{ success: true }>(
      `/api/reminders/${id}`,
      { method: 'DELETE' },
      'Failed to delete reminder',
    )
    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error as Error }
  }
}
