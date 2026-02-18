import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  getUpcomingActivities,
  getOverdueActivities,
  getActivitiesByContact,
  type Activity,
  type ActivityFilters,
  type SortOptions,
} from '@/lib/api/activities'

type Pagination = {
  page: number
  limit: number
}

export function useActivities(filters?: ActivityFilters, pagination?: Pagination, sort?: SortOptions) {
  return useQuery({
    queryKey: ['activities', filters, pagination, sort],
    queryFn: () => getActivities(filters, pagination, sort),
  })
}

export function useActivity(id: string) {
  return useQuery({
    queryKey: ['activity', id],
    queryFn: () => getActivityById(id),
    enabled: !!id,
  })
}

export function useUpcomingActivities() {
  return useQuery({
    queryKey: ['activities-upcoming'],
    queryFn: getUpcomingActivities,
  })
}

export function useOverdueActivities() {
  return useQuery({
    queryKey: ['activities-overdue'],
    queryFn: getOverdueActivities,
  })
}

export function useActivitiesByContact(contactId: string) {
  return useQuery({
    queryKey: ['activities-contact', contactId],
    queryFn: () => getActivitiesByContact(contactId),
    enabled: !!contactId,
  })
}

export function useCreateActivity() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      queryClient.invalidateQueries({ queryKey: ['activities-upcoming'] })
      queryClient.invalidateQueries({ queryKey: ['activities-overdue'] })
    },
  })
}

export function useUpdateActivity() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, ...activity }: { id: string } & Partial<Activity>) => updateActivity(id, activity),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      queryClient.invalidateQueries({ queryKey: ['activity', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['activities-upcoming'] })
      queryClient.invalidateQueries({ queryKey: ['activities-overdue'] })
      
      // Invalidate contact specific activity queries
      if (variables.contact_id) {
        queryClient.invalidateQueries({ queryKey: ['activities-contact', variables.contact_id] })
      }
    },
  })
}

export function useDeleteActivity() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteActivity,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      queryClient.invalidateQueries({ queryKey: ['activity', variables] })
      queryClient.invalidateQueries({ queryKey: ['activities-upcoming'] })
      queryClient.invalidateQueries({ queryKey: ['activities-overdue'] })
      
      // We would need to know contact associations to invalidate those
      // This could be improved by returning the deleted activity data
    },
  })
}
