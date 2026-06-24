import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { recordCampaignEvent } from '@/lib/campaigns/server'
import { isMissingColumn, omitColumn } from '@/lib/supabase/missing-column'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'
import type { CampaignEventType } from '@/types/campaigns'

const createSchema = z.object({
  lead_id: z.string().uuid(),
  email_type: z.enum(['initial', 'follow_up_1', 'follow_up_2', 'follow_up_3', 'reply_response', 'meeting_request', 'lead_magnet', 'break_up']),
  cta_type: z.enum(['mckenna', 'hormozi']).optional().nullable(),
  subject: z.string(),
  body: z.string(),
  sent_at: z.string().nullable().optional(),
  campaign_id: z.string().uuid().optional().nullable(),
  direction: z.enum(['inbound', 'outbound']).default('outbound'),
})

function campaignEventForEmail(email: z.infer<typeof createSchema>): CampaignEventType {
  if (email.direction === 'inbound') return 'email_replied'
  if (email.email_type === 'lead_magnet' && email.sent_at) return 'lead_magnet_sent'
  if (email.sent_at) return 'email_sent'
  return 'email_drafted'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = createSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 })
    }

    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    // Verify lead ownership before saving email
    const { data: leadOwnership } = await supabase
      .from('leads')
      .select('id')
      .eq('id', validation.data.lead_id)
      .eq('org_id', orgId)
      .single()
    if (!leadOwnership) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    if (validation.data.campaign_id) {
      const { data: enrollment } = await supabase
        .from('campaign_enrollments')
        .select('id')
        .eq('campaign_id', validation.data.campaign_id)
        .eq('lead_id', validation.data.lead_id)
        .eq('org_id', orgId)
        .maybeSingle()

      if (!enrollment) return NextResponse.json({ error: 'Lead is not enrolled in this campaign' }, { status: 400 })
    }

    let { data, error } = await supabase
      .from('lead_emails')
      .insert({
        ...validation.data,
        user_id: user.id,
        org_id: orgId,
      })
      .select()
      .single()

    if (isMissingColumn(error, 'campaign_id')) {
      const retry = await supabase
        .from('lead_emails')
        .insert({
          ...omitColumn(validation.data, 'campaign_id'),
          user_id: user.id,
          org_id: orgId,
        })
        .select()
        .single()
      data = retry.data
      error = retry.error
    }

    if (error) throw error

    if (validation.data.campaign_id) {
      await recordCampaignEvent({
        supabase,
        campaignId: validation.data.campaign_id,
        leadId: validation.data.lead_id,
        orgId,
        userId: user.id,
        eventType: campaignEventForEmail(validation.data),
        metadata: {
          lead_email_id: data.id,
          email_type: validation.data.email_type,
          direction: validation.data.direction,
        },
      })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('POST /api/lead-emails error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save email' },
      { status: 500 }
    )
  }
}
