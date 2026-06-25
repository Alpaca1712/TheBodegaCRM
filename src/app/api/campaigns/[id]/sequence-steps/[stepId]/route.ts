import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  CAMPAIGN_AUTOMATION_CHANNELS,
  CAMPAIGN_AUTOMATION_EMAIL_TYPES,
} from '@/lib/campaigns/automation'
import { isMissingRelation } from '@/lib/supabase/missing-column'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'

const updateSequenceStepSchema = z.object({
  name: z.string().min(2).optional(),
  position: z.number().int().min(0).optional(),
  trigger_stage_key: z.string().min(1).optional(),
  wait_minutes: z.number().int().min(0).optional(),
  channel: z.enum(CAMPAIGN_AUTOMATION_CHANNELS).optional(),
  email_type: z.enum(CAMPAIGN_AUTOMATION_EMAIL_TYPES).optional(),
  subject_template: z.string().optional(),
  body_template: z.string().optional(),
  move_to_stage_key: z.string().nullable().optional(),
  stop_on_reply: z.boolean().optional(),
  active: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  try {
    const { id, stepId } = await params
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const body = await request.json()
    const validation = updateSequenceStepSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 })
    }

    const updates = { ...validation.data }
    if (updates.move_to_stage_key === '') updates.move_to_stage_key = null

    const { data, error } = await supabase
      .from('campaign_sequence_steps')
      .update(updates)
      .eq('id', stepId)
      .eq('campaign_id', id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error && isMissingRelation(error, 'campaign_sequence_steps')) {
      return NextResponse.json(
        { error: 'Campaign sequences need database migration 037 before steps can be edited.', code: 'MIGRATION_REQUIRED' },
        { status: 503 },
      )
    }
    if (error) throw error
    return NextResponse.json({ data })
  } catch (error) {
    console.error('PATCH /api/campaigns/[id]/sequence-steps/[stepId] failed', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update sequence step' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  try {
    const { id, stepId } = await params
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const { error, count } = await supabase
      .from('campaign_sequence_steps')
      .delete({ count: 'exact' })
      .eq('id', stepId)
      .eq('campaign_id', id)
      .eq('org_id', orgId)

    if (error && isMissingRelation(error, 'campaign_sequence_steps')) {
      return NextResponse.json(
        { error: 'Campaign sequences need database migration 037 before steps can be edited.', code: 'MIGRATION_REQUIRED' },
        { status: 503 },
      )
    }
    if (error) throw error
    if (count === 0) return NextResponse.json({ error: 'Sequence step not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/campaigns/[id]/sequence-steps/[stepId] failed', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete sequence step' }, { status: 500 })
  }
}
