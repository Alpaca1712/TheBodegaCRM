import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { recordCampaignEvent } from '@/lib/campaigns/server'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'
import type { CampaignEventType } from '@/types/campaigns'

const updateSchema = z.object({
  subject: z.string().optional(),
  body: z.string().optional(),
  sent_at: z.string().nullable().optional(),
  email_type: z.string().optional(),
  cta_type: z.enum(['mckenna', 'hormozi']).optional().nullable(),
})

function campaignEventForPatchedEmail(email: {
  direction: string
  email_type: string
  sent_at: string | null
}): CampaignEventType {
  if (email.direction === 'inbound') return 'email_replied'
  if (email.email_type === 'lead_magnet' && email.sent_at) return 'lead_magnet_sent'
  if (email.sent_at) return 'email_sent'
  return 'email_drafted'
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const body = await request.json()
    const validation = updateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 })
    }

    // Verify email ownership before updating
    const { data: email, error: fetchError } = await supabase
      .from('lead_emails')
      .select('id, org_id, campaign_id, lead_id, email_type, direction, sent_at')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (fetchError || !email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('lead_emails')
      .update(validation.data)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) throw error

    if (data.campaign_id && validation.data.sent_at && !email.sent_at) {
      await recordCampaignEvent({
        supabase,
        campaignId: data.campaign_id,
        leadId: data.lead_id,
        orgId,
        userId: user.id,
        eventType: campaignEventForPatchedEmail({
          direction: data.direction,
          email_type: data.email_type,
          sent_at: data.sent_at,
        }),
        metadata: {
          lead_email_id: data.id,
          email_type: data.email_type,
          direction: data.direction,
        },
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('PATCH /api/lead-emails/[id] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update email' },
      { status: 500 }
    )
  }
}
