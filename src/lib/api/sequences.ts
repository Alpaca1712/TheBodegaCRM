import { createClient } from '@/lib/supabase/client'
import { getActiveOrgId } from '@/lib/api/organizations'

export interface Sequence {
  id: string
  user_id: string
  org_id: string | null
  name: string
  description: string | null
  status: 'draft' | 'active' | 'paused' | 'archived'
  tags: string[] | null
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
  steps?: SequenceStep[]
  _enrollment_count?: number
  _reply_count?: number
}

export interface SequenceStep {
  id: string
  sequence_id: string
  step_number: number
  channel: 'email' | 'linkedin' | 'call' | 'task'
  delay_days: number
  subject_template: string | null
  body_template: string | null
  ai_personalization: boolean
  ai_prompt: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SequenceEnrollment {
  id: string
  sequence_id: string
  contact_id: string
  user_id: string
  org_id: string | null
  status: 'active' | 'paused' | 'completed' | 'replied' | 'bounced' | 'opted_out' | 'removed'
  current_step: number
  enrolled_at: string
  completed_at: string | null
  paused_at: string | null
  last_activity_at: string | null
  metadata: Record<string, unknown>
  contact?: {
    id: string
    first_name: string
    last_name: string
    email?: string
    title?: string
    status: string
  }
}

export interface StepExecution {
  id: string
  enrollment_id: string
  step_id: string
  status: 'scheduled' | 'pending_review' | 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'skipped' | 'failed'
  scheduled_for: string
  executed_at: string | null
  generated_subject: string | null
  generated_body: string | null
  personalization_data: Record<string, unknown>
  error_message: string | null
  created_at: string
  updated_at: string
  step?: SequenceStep
}

export interface SequenceStats {
  total_enrolled: number
  active: number
  completed: number
  replied: number
  bounced: number
  opted_out: number
  reply_rate: number
}

// ─── Sequences CRUD ───

export async function getSequences(): Promise<{ data: Sequence[]; error?: string }> {
  const supabase = createClient()
  const orgId = await getActiveOrgId()
  if (!orgId) return { data: [], error: 'No active organization' }

  const { data, error } = await supabase
    .from('sequences')
    .select('*')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })

  if (error) return { data: [], error: error.message }

  const sequences = data || []

  const enriched = await Promise.all(
    sequences.map(async (seq) => {
      const { count: enrollCount } = await supabase
        .from('sequence_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('sequence_id', seq.id)

      const { count: replyCount } = await supabase
        .from('sequence_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('sequence_id', seq.id)
        .eq('status', 'replied')

      return { ...seq, _enrollment_count: enrollCount || 0, _reply_count: replyCount || 0 }
    })
  )

  return { data: enriched }
}

export async function getSequenceById(id: string): Promise<{ data: Sequence | null; error?: string }> {
  const supabase = createClient()
  const orgId = await getActiveOrgId()
  if (!orgId) return { data: null, error: 'No active organization' }

  const { data, error } = await supabase
    .from('sequences')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (error) return { data: null, error: error.message }

  const { data: steps } = await supabase
    .from('sequence_steps')
    .select('*')
    .eq('sequence_id', id)
    .order('step_number', { ascending: true })

  return { data: { ...data, steps: steps || [] } }
}

export async function createSequence(seq: {
  name: string
  description?: string
  tags?: string[]
  steps?: Array<{
    step_number: number
    channel: SequenceStep['channel']
    delay_days: number
    subject_template?: string
    body_template?: string
    ai_personalization?: boolean
    ai_prompt?: string
    notes?: string
  }>
}): Promise<{ data: Sequence | null; error?: string }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { data: null, error: 'Not authenticated' }

  const orgId = await getActiveOrgId()
  if (!orgId) return { data: null, error: 'No active organization' }

  const { data, error } = await supabase
    .from('sequences')
    .insert({
      user_id: session.user.id,
      org_id: orgId,
      name: seq.name,
      description: seq.description || null,
      tags: seq.tags || null,
      status: 'draft',
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  if (seq.steps && seq.steps.length > 0) {
    const stepsToInsert = seq.steps.map((s) => ({
      sequence_id: data.id,
      step_number: s.step_number,
      channel: s.channel,
      delay_days: s.delay_days,
      subject_template: s.subject_template || null,
      body_template: s.body_template || null,
      ai_personalization: s.ai_personalization ?? true,
      ai_prompt: s.ai_prompt || null,
      notes: s.notes || null,
    }))

    await supabase.from('sequence_steps').insert(stepsToInsert)
  }

  return { data }
}

export async function updateSequence(
  id: string,
  updates: Partial<Pick<Sequence, 'name' | 'description' | 'status' | 'tags' | 'settings'>>
): Promise<{ data: Sequence | null; error?: string }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sequences')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data }
}

export async function deleteSequence(id: string): Promise<{ error?: string }> {
  const supabase = createClient()
  const { error } = await supabase.from('sequences').delete().eq('id', id)
  if (error) return { error: error.message }
  return {}
}

// ─── Steps CRUD ───

export async function upsertSteps(
  sequenceId: string,
  steps: Array<{
    id?: string
    step_number: number
    channel: SequenceStep['channel']
    delay_days: number
    subject_template?: string
    body_template?: string
    ai_personalization?: boolean
    ai_prompt?: string
    notes?: string
  }>
): Promise<{ error?: string }> {
  const supabase = createClient()

  await supabase.from('sequence_steps').delete().eq('sequence_id', sequenceId)

  if (steps.length === 0) return {}

  const rows = steps.map((s) => ({
    sequence_id: sequenceId,
    step_number: s.step_number,
    channel: s.channel,
    delay_days: s.delay_days,
    subject_template: s.subject_template || null,
    body_template: s.body_template || null,
    ai_personalization: s.ai_personalization ?? true,
    ai_prompt: s.ai_prompt || null,
    notes: s.notes || null,
  }))

  const { error } = await supabase.from('sequence_steps').insert(rows)
  if (error) return { error: error.message }
  return {}
}

// ─── Enrollments ───

export async function enrollContacts(
  sequenceId: string,
  contactIds: string[]
): Promise<{ enrolled: number; error?: string }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { enrolled: 0, error: 'Not authenticated' }

  const orgId = await getActiveOrgId()
  if (!orgId) return { enrolled: 0, error: 'No active organization' }

  const { data: steps } = await supabase
    .from('sequence_steps')
    .select('*')
    .eq('sequence_id', sequenceId)
    .order('step_number', { ascending: true })

  if (!steps || steps.length === 0) return { enrolled: 0, error: 'Sequence has no steps' }

  const rows = contactIds.map((cid) => ({
    sequence_id: sequenceId,
    contact_id: cid,
    user_id: session.user.id,
    org_id: orgId,
    status: 'active' as const,
    current_step: 1,
  }))

  const { data, error } = await supabase
    .from('sequence_enrollments')
    .upsert(rows, { onConflict: 'sequence_id,contact_id', ignoreDuplicates: true })
    .select()

  if (error) return { enrolled: 0, error: error.message }

  const enrollments = data || []
  const firstStep = steps[0]

  const executions = enrollments.map((enrollment) => ({
    enrollment_id: enrollment.id,
    step_id: firstStep.id,
    status: firstStep.ai_personalization ? 'pending_review' as const : 'scheduled' as const,
    scheduled_for: new Date(Date.now() + firstStep.delay_days * 86400000).toISOString(),
  }))

  if (executions.length > 0) {
    await supabase.from('sequence_step_executions').insert(executions)
  }

  return { enrolled: enrollments.length }
}

export async function getEnrollments(
  sequenceId: string
): Promise<{ data: SequenceEnrollment[]; error?: string }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('sequence_enrollments')
    .select(`*, contact:contacts(id, first_name, last_name, email, title, status)`)
    .eq('sequence_id', sequenceId)
    .order('enrolled_at', { ascending: false })

  if (error) return { data: [], error: error.message }
  return { data: data || [] }
}

export async function updateEnrollmentStatus(
  enrollmentId: string,
  status: SequenceEnrollment['status']
): Promise<{ error?: string }> {
  const supabase = createClient()
  const updates: Record<string, unknown> = { status }
  if (status === 'paused') updates.paused_at = new Date().toISOString()
  if (status === 'completed') updates.completed_at = new Date().toISOString()

  const { error } = await supabase
    .from('sequence_enrollments')
    .update(updates)
    .eq('id', enrollmentId)

  if (error) return { error: error.message }
  return {}
}

export async function removeEnrollment(enrollmentId: string): Promise<{ error?: string }> {
  return updateEnrollmentStatus(enrollmentId, 'removed')
}

// ─── Step Executions ───

export async function getExecutionsForEnrollment(
  enrollmentId: string
): Promise<{ data: StepExecution[]; error?: string }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('sequence_step_executions')
    .select('*, step:sequence_steps(*)')
    .eq('enrollment_id', enrollmentId)
    .order('scheduled_for', { ascending: true })

  if (error) return { data: [], error: error.message }
  return { data: data || [] }
}

export async function updateExecution(
  executionId: string,
  updates: Partial<Pick<StepExecution, 'status' | 'generated_subject' | 'generated_body' | 'executed_at' | 'error_message'>>
): Promise<{ error?: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('sequence_step_executions')
    .update(updates)
    .eq('id', executionId)

  if (error) return { error: error.message }
  return {}
}

export async function markExecutionSent(executionId: string): Promise<{ error?: string }> {
  return updateExecution(executionId, {
    status: 'sent',
    executed_at: new Date().toISOString(),
  })
}

// ─── Step-level Execution Stats ───

export interface StepStats {
  step_id: string
  step_number: number
  channel: string
  scheduled: number
  pending_review: number
  sent: number
  opened: number
  clicked: number
  replied: number
  bounced: number
  skipped: number
  failed: number
}

export async function getStepExecutionStats(sequenceId: string): Promise<{ data: StepStats[]; error?: string }> {
  const supabase = createClient()

  const { data: steps } = await supabase
    .from('sequence_steps')
    .select('id, step_number, channel')
    .eq('sequence_id', sequenceId)
    .order('step_number', { ascending: true })

  if (!steps || steps.length === 0) return { data: [] }

  const { data: executions, error } = await supabase
    .from('sequence_step_executions')
    .select('step_id, status')
    .in('step_id', steps.map(s => s.id))

  if (error) return { data: [], error: error.message }

  const stepStats: StepStats[] = steps.map(step => {
    const stepExecs = (executions || []).filter(e => e.step_id === step.id)
    const counts = stepExecs.reduce((acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      step_id: step.id,
      step_number: step.step_number,
      channel: step.channel,
      scheduled: counts['scheduled'] || 0,
      pending_review: counts['pending_review'] || 0,
      sent: counts['sent'] || 0,
      opened: counts['opened'] || 0,
      clicked: counts['clicked'] || 0,
      replied: counts['replied'] || 0,
      bounced: counts['bounced'] || 0,
      skipped: counts['skipped'] || 0,
      failed: counts['failed'] || 0,
    }
  })

  return { data: stepStats }
}

// ─── Stats ───

export async function getSequenceStats(sequenceId: string): Promise<{ data: SequenceStats | null; error?: string }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('sequence_enrollments')
    .select('status')
    .eq('sequence_id', sequenceId)

  if (error) return { data: null, error: error.message }

  const enrollments = data || []
  const total = enrollments.length
  const byStatus = enrollments.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    data: {
      total_enrolled: total,
      active: byStatus['active'] || 0,
      completed: byStatus['completed'] || 0,
      replied: byStatus['replied'] || 0,
      bounced: byStatus['bounced'] || 0,
      opted_out: byStatus['opted_out'] || 0,
      reply_rate: total > 0 ? ((byStatus['replied'] || 0) / total) * 100 : 0,
    },
  }
}
