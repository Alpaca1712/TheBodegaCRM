import { z } from 'zod'

const nullableString = z.string().trim().max(500).nullable().optional()

export const sendWindowSchema = z.object({
  days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  start_hour: z.number().int().min(0).max(23),
  end_hour: z.number().int().min(1).max(24),
  timezone: z.string().min(1),
}).refine((window) => window.end_hour > window.start_hour, { message: 'end_hour must be after start_hour' })

export const bodyFormatSchema = z.enum(['text', 'markdown', 'html'])

export const stepInputSchema = z.object({
  position: z.number().int().min(1).optional(),
  name: nullableString,
  delay_minutes: z.number().int().min(0).optional(),
  delay_hours: z.number().min(0).optional(),
  delay_days: z.number().min(0).optional(),
  subject: z.string().trim().max(300).nullable().optional(),
  body: z.string().min(1).max(50000),
  body_format: bodyFormatSchema.optional(),
  thread_with_previous: z.boolean().optional(),
  lead_magnet_id: z.string().uuid().nullable().optional(),
  condition_prompt: z.string().trim().max(4000).nullable().optional(),
  condition_model: nullableString,
  active: z.boolean().optional(),
})

export const stepUpdateSchema = stepInputSchema.partial()

export const sequenceStatusSchema = z.enum(['draft', 'active', 'paused', 'archived'])

export const sequenceCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  status: sequenceStatusSchema.optional(),
  campaign_id: z.string().uuid().nullable().optional(),
  from_name: nullableString,
  from_email: z.string().trim().email().nullable().optional(),
  reply_to: z.string().trim().email().nullable().optional(),
  send_window: sendWindowSchema.optional(),
  stop_on_reply: z.boolean().optional(),
  daily_send_limit: z.number().int().min(1).max(5000).nullable().optional(),
  steps: z.array(stepInputSchema).max(20).optional(),
})

export const sequenceUpdateSchema = sequenceCreateSchema.omit({ steps: true }).partial()

export const sequenceListQuerySchema = z.object({
  status: sequenceStatusSchema.optional(),
  campaign_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export const enrollSchema = z.object({
  lead_ids: z.array(z.string().uuid()).max(500).optional(),
  emails: z.array(z.string().trim().email()).max(500).optional(),
  replace_existing: z.boolean().default(false),
  start_at: z.string().datetime({ offset: true }).optional(),
}).refine((input) => (input.lead_ids?.length || 0) + (input.emails?.length || 0) > 0, {
  message: 'Provide lead_ids or emails',
})

export const enrollmentActionSchema = z.object({
  action: z.enum(['pause', 'resume', 'exit', 'skip_step', 'reschedule']),
  reason: z.string().trim().max(500).optional(),
  next_step_due_at: z.string().datetime({ offset: true }).optional(),
})

export const enrollmentListQuerySchema = z.object({
  status: z.enum(['active', 'paused', 'completed', 'replied', 'bounced', 'unsubscribed', 'exited']).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
})

export const reorderStepsSchema = z.object({
  step_ids: z.array(z.string().uuid()).min(1),
})

export type StepInput = z.infer<typeof stepInputSchema>
export type StepUpdateInput = z.infer<typeof stepUpdateSchema>
export type SequenceCreateInput = z.infer<typeof sequenceCreateSchema>
export type SequenceUpdateInput = z.infer<typeof sequenceUpdateSchema>
export type EnrollInput = z.infer<typeof enrollSchema>
export type EnrollmentAction = z.infer<typeof enrollmentActionSchema>

export function delayMinutesFrom(input: { delay_minutes?: number; delay_hours?: number; delay_days?: number }) {
  if (input.delay_minutes !== undefined) return input.delay_minutes
  const hours = (input.delay_days || 0) * 24 + (input.delay_hours || 0)
  return Math.round(hours * 60)
}
