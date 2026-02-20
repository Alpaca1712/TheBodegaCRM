import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getReminders,
  createReminder,
  updateReminder,
  markAsRead,
  markAsResolved,
  deleteReminder,
  generateAllReminders,
  GetRemindersFilters
} from '@/lib/api/reminders'
import type { ReminderUpdate } from '@/types/database'

export function useReminders(filters: GetRemindersFilters = {}) {
  return useQuery({
    queryKey: ['reminders', filters],
    queryFn: () => getReminders(filters),
    select: (result) => result.data || []
  })
}

export function useUnreadReminders() {
  return useQuery({
    queryKey: ['reminders', 'unread'],
    queryFn: () => getReminders({ isRead: false, isResolved: false }),
    select: (result) => result.data || []
  })
}

export function useReminder(id: string) {
  return useQuery({
    queryKey: ['reminders', id],
    queryFn: async () => {
      const { data } = await getReminders({})
      return data?.find(reminder => reminder.id === id) || null
    }
  })
}

export function useCreateReminder() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createReminder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
    }
  })
}

export function useUpdateReminder() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: ReminderUpdate }) => 
      updateReminder(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      queryClient.invalidateQueries({ queryKey: ['reminders', variables.id] })
    }
  })
}

export function useMarkAsRead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: markAsRead,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      queryClient.invalidateQueries({ queryKey: ['reminders', 'unread'] })
      queryClient.invalidateQueries({ queryKey: ['reminders', id] })
    }
  })
}

export function useMarkAsResolved() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: markAsResolved,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      queryClient.invalidateQueries({ queryKey: ['reminders', 'unread'] })
      queryClient.invalidateQueries({ queryKey: ['reminders', id] })
    }
  })
}

export function useDeleteReminder() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteReminder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      queryClient.invalidateQueries({ queryKey: ['reminders', 'unread'] })
    }
  })
}

export function useGenerateAllReminders() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: generateAllReminders,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      queryClient.invalidateQueries({ queryKey: ['reminders', 'unread'] })
    }
  })
}
