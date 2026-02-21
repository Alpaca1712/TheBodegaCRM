import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSequences,
  getSequenceById,
  createSequence,
  updateSequence,
  deleteSequence,
  enrollContacts,
  getEnrollments,
  updateEnrollmentStatus,
  getSequenceStats,
  getStepExecutionStats,
  upsertSteps,
  type Sequence,
  type SequenceStep,
  type SequenceEnrollment,
} from '@/lib/api/sequences'

export function useSequences() {
  return useQuery({
    queryKey: ['sequences'],
    queryFn: getSequences,
  })
}

export function useSequence(id: string) {
  return useQuery({
    queryKey: ['sequence', id],
    queryFn: () => getSequenceById(id),
    enabled: !!id,
  })
}

export function useSequenceStats(id: string) {
  return useQuery({
    queryKey: ['sequence-stats', id],
    queryFn: () => getSequenceStats(id),
    enabled: !!id,
  })
}

export function useStepExecutionStats(sequenceId: string) {
  return useQuery({
    queryKey: ['step-execution-stats', sequenceId],
    queryFn: () => getStepExecutionStats(sequenceId),
    enabled: !!sequenceId,
  })
}

export function useEnrollments(sequenceId: string) {
  return useQuery({
    queryKey: ['sequence-enrollments', sequenceId],
    queryFn: () => getEnrollments(sequenceId),
    enabled: !!sequenceId,
  })
}

export function useCreateSequence() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createSequence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] })
    },
  })
}

export function useUpdateSequence() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Pick<Sequence, 'name' | 'description' | 'status' | 'tags' | 'settings'>>) =>
      updateSequence(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] })
      queryClient.invalidateQueries({ queryKey: ['sequence', variables.id] })
    },
  })
}

export function useDeleteSequence() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteSequence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] })
    },
  })
}

export function useUpsertSteps() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sequenceId, steps }: { sequenceId: string; steps: Parameters<typeof upsertSteps>[1] }) =>
      upsertSteps(sequenceId, steps),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sequence', variables.sequenceId] })
    },
  })
}

export function useEnrollContacts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sequenceId, contactIds }: { sequenceId: string; contactIds: string[] }) =>
      enrollContacts(sequenceId, contactIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sequence-enrollments', variables.sequenceId] })
      queryClient.invalidateQueries({ queryKey: ['sequence-stats', variables.sequenceId] })
    },
  })
}

export function useUpdateEnrollmentStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ enrollmentId, status }: { enrollmentId: string; status: SequenceEnrollment['status'] }) =>
      updateEnrollmentStatus(enrollmentId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequence-enrollments'] })
      queryClient.invalidateQueries({ queryKey: ['sequence-stats'] })
    },
  })
}
