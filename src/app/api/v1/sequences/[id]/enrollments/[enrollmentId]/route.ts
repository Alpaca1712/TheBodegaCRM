import { ApiError } from '@/lib/api/errors'
import { parseBody, route } from '@/lib/api/route'
import { db } from '@/lib/db'
import { applyEnrollmentAction, getEnrollment } from '@/lib/sequences/enrollments'
import { enrollmentActionSchema } from '@/lib/sequences/schemas'
import { resolveSequence } from '@/lib/sequences/service'

type Params = { id: string; enrollmentId: string }

async function scoped(params: Params) {
  const sequence = await resolveSequence(params.id)
  const enrollment = await getEnrollment(params.enrollmentId)
  if (enrollment.sequence_id !== sequence.id) throw ApiError.notFound('Enrollment not found in this sequence')
  return enrollment
}

export const GET = route<Params>(async ({ params }) => {
  const enrollment = await scoped(params)
  const { data: executions } = await db()
    .from('step_executions')
    .select('*')
    .eq('enrollment_id', enrollment.id)
    .order('executed_at', { ascending: true })
  return { data: { ...enrollment, executions: executions || [] } }
})

export const PATCH = route<Params>(async ({ request, params }) => {
  await scoped(params)
  const action = await parseBody(request, enrollmentActionSchema)
  return { data: await applyEnrollmentAction(params.enrollmentId, action) }
})

export const DELETE = route<Params>(async ({ params }) => {
  await scoped(params)
  return { data: await applyEnrollmentAction(params.enrollmentId, { action: 'exit', reason: 'Removed via API' }) }
})
