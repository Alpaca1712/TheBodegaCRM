import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  CAMPAIGN_AUTOMATION_CHANNELS,
  CAMPAIGN_AUTOMATION_EMAIL_TYPES,
} from '@/lib/campaigns/automation'
import { isMissingRelation } from '@/lib/supabase/missing-column'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024

const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  url: z.string().trim().url().max(2048).optional(),
  data: z.string().max(Math.ceil(MAX_ATTACHMENT_BYTES * 1.4)).optional(),
  mime_type: z.string().trim().max(120).optional(),
  size: z.number().int().min(0).max(MAX_ATTACHMENT_BYTES).optional(),
}).superRefine((attachment, ctx) => {
  if (!attachment.url && !attachment.data) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Attachment needs a URL or uploaded file data',
      path: ['url'],
    })
  }
  if (attachment.data && !attachment.mime_type) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Uploaded attachments need a content type',
      path: ['mime_type'],
    })
  }
})

const sequenceStepMetadataSchema = z.object({
  attachments: z.array(attachmentSchema).max(10).optional(),
}).passthrough()

const sequenceStepSchema = z.object({
  name: z.string().min(2),
  position: z.number().int().min(0).optional(),
  trigger_stage_key: z.string().min(1),
  wait_minutes: z.number().int().min(0).default(0),
  channel: z.enum(CAMPAIGN_AUTOMATION_CHANNELS).default('email'),
  email_type: z.enum(CAMPAIGN_AUTOMATION_EMAIL_TYPES).default('follow_up_1'),
  subject_template: z.string().default(''),
  body_template: z.string().default(''),
  move_to_stage_key: z.string().nullable().optional(),
  stop_on_reply: z.boolean().default(true),
  active: z.boolean().default(false),
  metadata: sequenceStepMetadataSchema.optional(),
})

async function assertCampaignAccess(supabase: Awaited<ReturnType<typeof getOrgScopedClient>>['supabase'], campaignId: string, orgId: string) {
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', campaignId)
    .eq('org_id', orgId)
    .single()

  if (error || !campaign) return false
  return true
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })
    if (!(await assertCampaignAccess(supabase, id, orgId))) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    const { data, error } = await supabase
      .from('campaign_sequence_steps')
      .select('*')
      .eq('campaign_id', id)
      .eq('org_id', orgId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })

    if (error && isMissingRelation(error, 'campaign_sequence_steps')) {
      return NextResponse.json({ data: [] })
    }
    if (error) throw error
    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('GET /api/campaigns/[id]/sequence-steps failed', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load sequence steps' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })
    if (!(await assertCampaignAccess(supabase, id, orgId))) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    const body = await request.json()
    const validation = sequenceStepSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 })
    }

    const payload = validation.data
    const { data, error } = await supabase
      .from('campaign_sequence_steps')
      .insert({
        ...payload,
        campaign_id: id,
        org_id: orgId,
        user_id: user.id,
        move_to_stage_key: payload.move_to_stage_key || null,
      })
      .select()
      .single()

    if (error && isMissingRelation(error, 'campaign_sequence_steps')) {
      return NextResponse.json(
        { error: 'Campaign sequences need database migration 037 before steps can be edited.', code: 'MIGRATION_REQUIRED' },
        { status: 503 },
      )
    }
    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('POST /api/campaigns/[id]/sequence-steps failed', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create sequence step' }, { status: 500 })
  }
}
