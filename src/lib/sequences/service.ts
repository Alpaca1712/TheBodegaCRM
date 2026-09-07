import { db, isUniqueViolation } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { slugify, slugWithSuffix } from '@/lib/slug'
import type { Sequence, SequenceStep } from '@/types'
import { normalizeSendWindow } from './send-window'
import {
  delayMinutesFrom,
  type SequenceCreateInput,
  type SequenceUpdateInput,
  type StepInput,
  type StepUpdateInput,
} from './schemas'
import type { z } from 'zod'
import type { sequenceListQuerySchema } from './schemas'

export interface SequenceWithSteps extends Sequence {
  steps: SequenceStep[]
}

async function uniqueSlug(table: 'sequences' | 'campaigns' | 'lead_magnets' | 'email_templates', base: string, excludeId?: string) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = slugWithSuffix(base, attempt)
    let query = db().from(table).select('id').eq('slug', candidate)
    if (excludeId) query = query.neq('id', excludeId)
    const { data, error } = await query.maybeSingle()
    if (error) throw error
    if (!data) return candidate
  }
  throw ApiError.conflict('Could not find a unique slug')
}

export { uniqueSlug }

export async function listSequences(query: z.infer<typeof sequenceListQuerySchema>) {
  let builder = db().from('sequences').select('*', { count: 'exact' })
  if (query.status) builder = builder.eq('status', query.status)
  if (query.campaign_id) builder = builder.eq('campaign_id', query.campaign_id)
  const { data, error, count } = await builder
    .order('created_at', { ascending: false })
    .range(query.offset, query.offset + query.limit - 1)
  if (error) throw error
  return { data: (data || []) as Sequence[], total: count ?? 0 }
}

export async function getSequence(id: string): Promise<Sequence> {
  const { data, error } = await db().from('sequences').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) throw ApiError.notFound('Sequence not found')
  return data as Sequence
}

export async function resolveSequence(idOrSlug: string): Promise<Sequence> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)
  const { data, error } = await db().from('sequences').select('*').eq(isUuid ? 'id' : 'slug', idOrSlug).maybeSingle()
  if (error) throw error
  if (!data) throw ApiError.notFound('Sequence not found')
  return data as Sequence
}

export async function listSteps(sequenceId: string): Promise<SequenceStep[]> {
  const { data, error } = await db()
    .from('sequence_steps')
    .select('*')
    .eq('sequence_id', sequenceId)
    .order('position', { ascending: true })
  if (error) throw error
  return (data || []) as SequenceStep[]
}

export async function getSequenceWithSteps(id: string): Promise<SequenceWithSteps> {
  const sequence = await resolveSequence(id)
  return { ...sequence, steps: await listSteps(sequence.id) }
}

function stepRow(input: StepInput | StepUpdateInput) {
  const row: Record<string, unknown> = {}
  for (const key of ['name', 'subject', 'body', 'body_format', 'thread_with_previous', 'lead_magnet_id', 'condition_prompt', 'condition_model', 'active', 'position'] as const) {
    if (input[key] !== undefined) row[key] = input[key]
  }
  if (input.delay_minutes !== undefined || input.delay_hours !== undefined || input.delay_days !== undefined) {
    row.delay_minutes = delayMinutesFrom(input)
  }
  return row
}

export async function createSequence(input: SequenceCreateInput): Promise<SequenceWithSteps> {
  const slug = await uniqueSlug('sequences', slugify(input.slug || input.name))
  const { steps, ...rest } = input
  const { data, error } = await db()
    .from('sequences')
    .insert({
      ...rest,
      slug,
      send_window: normalizeSendWindow(input.send_window),
    })
    .select('*')
    .single()
  if (isUniqueViolation(error)) throw ApiError.conflict('A sequence with that slug already exists')
  if (error) throw error
  const sequence = data as Sequence

  if (steps?.length) {
    const rows = steps.map((step, index) => ({
      sequence_id: sequence.id,
      ...stepRow(step),
      position: step.position ?? index + 1,
      delay_minutes: delayMinutesFrom(step),
      body: step.body,
    }))
    const { error: stepError } = await db().from('sequence_steps').insert(rows)
    if (stepError) {
      await db().from('sequences').delete().eq('id', sequence.id)
      throw stepError
    }
  }
  return { ...sequence, steps: await listSteps(sequence.id) }
}

export async function updateSequence(id: string, input: SequenceUpdateInput): Promise<SequenceWithSteps> {
  const existing = await resolveSequence(id)
  const row: Record<string, unknown> = { ...input }
  if (input.slug) row.slug = await uniqueSlug('sequences', slugify(input.slug), existing.id)
  if (input.send_window) row.send_window = normalizeSendWindow(input.send_window)
  if (input.status === 'active') {
    const steps = await listSteps(existing.id)
    if (!steps.some((step) => step.active)) throw ApiError.unprocessable('Add at least one active step before activating a sequence')
  }
  const { data, error } = await db().from('sequences').update(row).eq('id', existing.id).select('*').single()
  if (error) throw error
  return { ...(data as Sequence), steps: await listSteps(existing.id) }
}

export async function deleteSequence(id: string) {
  const sequence = await resolveSequence(id)
  const { error } = await db().from('sequences').delete().eq('id', sequence.id)
  if (error) throw error
}

export async function addStep(sequenceId: string, input: StepInput): Promise<SequenceStep> {
  const sequence = await resolveSequence(sequenceId)
  const steps = await listSteps(sequence.id)
  const position = input.position ?? (steps.length ? Math.max(...steps.map((step) => step.position)) + 1 : 1)

  if (input.position !== undefined && steps.some((step) => step.position >= input.position!)) {
    for (const step of [...steps].filter((step) => step.position >= input.position!).sort((a, b) => b.position - a.position)) {
      const { error } = await db().from('sequence_steps').update({ position: step.position + 1 }).eq('id', step.id)
      if (error) throw error
    }
  }

  const { data, error } = await db()
    .from('sequence_steps')
    .insert({ sequence_id: sequence.id, ...stepRow(input), position, delay_minutes: delayMinutesFrom(input), body: input.body })
    .select('*')
    .single()
  if (error) throw error
  return data as SequenceStep
}

export async function getStep(sequenceId: string, stepId: string): Promise<SequenceStep> {
  const sequence = await resolveSequence(sequenceId)
  const { data, error } = await db().from('sequence_steps').select('*').eq('id', stepId).eq('sequence_id', sequence.id).maybeSingle()
  if (error) throw error
  if (!data) throw ApiError.notFound('Step not found')
  return data as SequenceStep
}

export async function updateStep(sequenceId: string, stepId: string, input: StepUpdateInput): Promise<SequenceStep> {
  const step = await getStep(sequenceId, stepId)
  const row = stepRow(input)
  if (Object.keys(row).length === 0) return step
  const { data, error } = await db().from('sequence_steps').update(row).eq('id', step.id).select('*').single()
  if (isUniqueViolation(error)) throw ApiError.conflict('Another step already has that position; use the reorder endpoint')
  if (error) throw error
  return data as SequenceStep
}

export async function deleteStep(sequenceId: string, stepId: string) {
  const step = await getStep(sequenceId, stepId)
  const { error } = await db().from('sequence_steps').delete().eq('id', step.id)
  if (error) throw error
  await db().from('sequence_enrollments').update({ next_step_id: null }).eq('next_step_id', step.id)
}

export async function reorderSteps(sequenceId: string, stepIds: string[]): Promise<SequenceStep[]> {
  const sequence = await resolveSequence(sequenceId)
  const steps = await listSteps(sequence.id)
  const known = new Set(steps.map((step) => step.id))
  if (stepIds.length !== steps.length || stepIds.some((id) => !known.has(id))) {
    throw ApiError.badRequest('step_ids must contain every step of the sequence exactly once')
  }
  for (const [index, id] of stepIds.entries()) {
    const { error } = await db().from('sequence_steps').update({ position: 1000 + index }).eq('id', id)
    if (error) throw error
  }
  for (const [index, id] of stepIds.entries()) {
    const { error } = await db().from('sequence_steps').update({ position: index + 1 }).eq('id', id)
    if (error) throw error
  }
  return listSteps(sequence.id)
}

export interface SequenceStats {
  enrollments: Record<string, number>
  emails: { sent: number; delivered: number; opened: number; bounced: number; replies: number }
  reply_rate: number | null
}

export async function sequenceStats(sequenceId: string): Promise<SequenceStats> {
  const [{ data: enrollments }, { data: emails }] = await Promise.all([
    db().from('sequence_enrollments').select('status').eq('sequence_id', sequenceId),
    db().from('emails').select('direction, status, opened_at').eq('sequence_id', sequenceId),
  ])
  const byStatus: Record<string, number> = {}
  for (const row of enrollments || []) byStatus[row.status] = (byStatus[row.status] || 0) + 1

  const stats = { sent: 0, delivered: 0, opened: 0, bounced: 0, replies: 0 }
  for (const row of emails || []) {
    if (row.direction === 'inbound') {
      stats.replies += 1
      continue
    }
    if (['sent', 'delivered', 'delivery_delayed', 'bounced', 'complained'].includes(row.status)) stats.sent += 1
    if (row.status === 'delivered') stats.delivered += 1
    if (row.opened_at) stats.opened += 1
    if (row.status === 'bounced') stats.bounced += 1
  }
  const enrolled = (enrollments || []).length
  return { enrollments: byStatus, emails: stats, reply_rate: enrolled ? Math.round((byStatus.replied || 0) / enrolled * 1000) / 10 : null }
}
