import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getErrorMessage, hydrateOpportunityRelations, recordOpportunityEvent, statusForDealStage } from '@/lib/deals/server'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'
import { DEAL_STAGE_PROBABILITY, DEAL_STAGES, type DealStage, type Opportunity } from '@/types/deals'

const updateDealSchema = z.object({
  name: z.string().min(1).optional(),
  stage: z.enum(DEAL_STAGES).optional(),
  estimated_value: z.number().nonnegative().optional().nullable(),
  probability: z.number().int().min(0).max(100).optional(),
  discovery_booked_at: z.string().optional().nullable(),
  discovery_held_at: z.string().optional().nullable(),
  expected_close_date: z.string().optional().nullable(),
  next_step: z.string().optional().nullable(),
  next_step_due_at: z.string().optional().nullable(),
  lost_reason: z.string().optional().nullable(),
})

function eventTypeForStage(stage: DealStage) {
  if (stage === 'discovery_held') return 'meeting_held'
  if (stage === 'closed_won') return 'closed_won'
  if (stage === 'closed_lost') return 'closed_lost'
  return 'stage_changed'
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const body = await request.json()
    const validation = updateDealSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 })
    }

    const { data: existing, error: existingError } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (existingError || !existing) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

    const input = validation.data
    const nextStage = (input.stage || existing.stage) as DealStage
    const stageChanged = input.stage && input.stage !== existing.stage
    const now = new Date().toISOString()

    const updatePayload: Record<string, unknown> = {
      ...input,
    }

    if (input.stage) {
      updatePayload.status = statusForDealStage(nextStage)
      updatePayload.probability = input.probability ?? DEAL_STAGE_PROBABILITY[nextStage]
      if (nextStage === 'discovery_held' && !input.discovery_held_at && !existing.discovery_held_at) {
        updatePayload.discovery_held_at = now
      }
      if ((nextStage === 'closed_won' || nextStage === 'closed_lost') && !existing.closed_at) {
        updatePayload.closed_at = now
      }
      if (nextStage !== 'closed_won' && nextStage !== 'closed_lost') {
        updatePayload.closed_at = null
      }
    }

    const { data, error } = await supabase
      .from('opportunities')
      .update(updatePayload)
      .eq('id', id)
      .eq('org_id', orgId)
      .select('*')
      .single()

    if (error) throw error
    const [hydratedDeal] = await hydrateOpportunityRelations({
      supabase,
      orgId,
      opportunities: [data as Opportunity],
    })

    if (stageChanged) {
      await recordOpportunityEvent({
        supabase,
        opportunityId: existing.id,
        orgId,
        userId: user.id,
        eventType: eventTypeForStage(nextStage),
        oldStage: existing.stage,
        newStage: nextStage,
        metadata: {
          estimated_value: data.estimated_value,
          probability: data.probability,
          lost_reason: data.lost_reason,
        },
      })

      const leadStage = nextStage === 'closed_won'
        ? 'closed_won'
        : nextStage === 'closed_lost'
          ? 'closed_lost'
          : nextStage === 'discovery_held'
            ? 'meeting_held'
            : null

      if (leadStage) {
        await supabase
          .from('leads')
          .update({ stage: leadStage })
          .eq('id', existing.lead_id)
          .eq('org_id', orgId)
      }
    } else if ('next_step' in input || 'next_step_due_at' in input) {
      await recordOpportunityEvent({
        supabase,
        opportunityId: existing.id,
        orgId,
        userId: user.id,
        eventType: 'next_step_updated',
        oldStage: existing.stage,
        newStage: existing.stage,
        metadata: {
          next_step: input.next_step,
          next_step_due_at: input.next_step_due_at,
        },
      })
    }

    return NextResponse.json({ data: hydratedDeal })
  } catch (error) {
    console.error('PATCH /api/deals/[id] error:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to update deal') },
      { status: 500 },
    )
  }
}
