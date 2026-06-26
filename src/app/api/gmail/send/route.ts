import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimitResponse } from '@/lib/api/auth-guard'
import { GmailTokenExpiredError, refreshAccessToken, sendGmailMessage } from '@/lib/api/gmail'
import { recordCampaignEvent } from '@/lib/campaigns/server'
import { recordOpportunityEvent } from '@/lib/deals/server'
import { isMissingColumn, omitColumn } from '@/lib/supabase/missing-column'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'
import type { CampaignEventType } from '@/types/campaigns'

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024

const attachmentSchema = z.object({
  filename: z.string().trim().min(1).max(120),
  contentType: z.string().trim().min(1).max(120),
  data: z.string().min(1).max(Math.ceil(MAX_ATTACHMENT_BYTES * 1.4)),
})

const sendSchema = z.object({
  lead_id: z.string().uuid(),
  lead_email_id: z.string().uuid().optional().nullable(),
  campaign_id: z.string().uuid().optional().nullable(),
  email_type: z.enum(['initial', 'follow_up_1', 'follow_up_2', 'follow_up_3', 'reply_response', 'meeting_request', 'lead_magnet', 'break_up']).default('initial'),
  cta_type: z.enum(['mckenna', 'hormozi']).optional().nullable(),
  to_address: z.string().email().optional().nullable(),
  subject: z.string().min(1),
  body: z.string().min(1),
  attachments: z.array(attachmentSchema).max(10).optional(),
})

function campaignEventForEmail(emailType: z.infer<typeof sendSchema>['email_type']): CampaignEventType {
  if (emailType === 'lead_magnet') return 'lead_magnet_sent'
  return 'email_sent'
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const limited = rateLimitResponse(user.id, 'gmail:send', {
      limit: 30,
      windowMs: 60_000,
    })
    if (limited) return limited

    const body = await request.json()
    const validation = sendSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 })
    }

    const input = validation.data
    const { data: lead } = await supabase
      .from('leads')
      .select('id,contact_name,contact_email,stage')
      .eq('id', input.lead_id)
      .eq('org_id', orgId)
      .single()

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    const toAddress = input.to_address || lead.contact_email
    if (!toAddress) return NextResponse.json({ error: 'Lead has no email address' }, { status: 400 })

    const { data: existingEmail } = input.lead_email_id
      ? await supabase
          .from('lead_emails')
          .select('id,campaign_id')
          .eq('id', input.lead_email_id)
          .eq('lead_id', input.lead_id)
          .eq('org_id', orgId)
          .maybeSingle()
      : { data: null }

    if (input.lead_email_id && !existingEmail) {
      return NextResponse.json({ error: 'Draft email not found' }, { status: 404 })
    }

    const campaignId = input.campaign_id || existingEmail?.campaign_id || null

    if (campaignId) {
      const { data: enrollment } = await supabase
        .from('campaign_enrollments')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('lead_id', input.lead_id)
        .eq('org_id', orgId)
        .maybeSingle()

      if (!enrollment) return NextResponse.json({ error: 'Lead is not enrolled in this campaign' }, { status: 400 })
    }

    const { data: account } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('sync_enabled', true)
      .order('last_synced_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()

    if (!account) {
      return NextResponse.json(
        { error: 'No Gmail account connected. Connect Gmail in Settings to send directly.', code: 'NO_GMAIL_ACCOUNT' },
        { status: 400 },
      )
    }

    let accessToken = account.access_token
    const expiresAt = new Date(account.token_expires_at)
    if (expiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
      const newTokens = await refreshAccessToken(account.refresh_token)
      accessToken = newTokens.access_token
      await supabase
        .from('email_accounts')
        .update({
          access_token: newTokens.access_token,
          token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        })
        .eq('id', account.id)
        .eq('user_id', user.id)
    }

    const { data: latestThreadEmail } = await supabase
      .from('lead_emails')
      .select('gmail_thread_id')
      .eq('lead_id', lead.id)
      .eq('org_id', orgId)
      .not('gmail_thread_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const sent = await sendGmailMessage(accessToken, {
      from: account.email_address,
      to: toAddress,
      subject: input.subject,
      body: input.body,
      threadId: latestThreadEmail?.gmail_thread_id || null,
      attachments: input.attachments,
    })

    const sentAt = new Date().toISOString()
    const insertPayload = {
      lead_id: lead.id,
      user_id: user.id,
      org_id: orgId,
      campaign_id: campaignId,
      email_type: input.email_type,
      cta_type: input.cta_type || null,
      subject: input.subject,
      body: input.body,
      direction: 'outbound',
      sent_at: sentAt,
      gmail_message_id: sent.id,
      gmail_thread_id: sent.threadId,
      from_address: account.email_address,
      to_address: toAddress,
      sent_via: 'gmail',
    }

    let email
    let emailError
    if (existingEmail) {
      const updated = await supabase
        .from('lead_emails')
        .update(insertPayload)
        .eq('id', existingEmail.id)
        .eq('org_id', orgId)
        .select()
        .single()
      email = updated.data
      emailError = updated.error
    } else {
      const inserted = await supabase
        .from('lead_emails')
        .insert(insertPayload)
        .select()
        .single()
      email = inserted.data
      emailError = inserted.error
    }

    if (isMissingColumn(emailError, 'sent_via')) {
      const payload = omitColumn(insertPayload, 'sent_via')
      const retry = existingEmail
        ? await supabase
            .from('lead_emails')
            .update(payload)
            .eq('id', existingEmail.id)
            .eq('org_id', orgId)
            .select()
            .single()
        : await supabase
            .from('lead_emails')
            .insert(payload)
            .select()
            .single()
      email = retry.data
      emailError = retry.error
    }

    if (isMissingColumn(emailError, 'campaign_id')) {
      const payload = omitColumn(omitColumn(insertPayload, 'campaign_id'), 'sent_via')
      const retry = existingEmail
        ? await supabase
            .from('lead_emails')
            .update(payload)
            .eq('id', existingEmail.id)
            .eq('org_id', orgId)
            .select()
            .single()
        : await supabase
            .from('lead_emails')
            .insert(payload)
            .select()
            .single()
      email = retry.data
      emailError = retry.error
    }

    if (emailError) throw emailError

    if (campaignId) {
      await recordCampaignEvent({
        supabase,
        campaignId,
        leadId: lead.id,
        orgId,
        userId: user.id,
        eventType: campaignEventForEmail(input.email_type),
        metadata: {
          lead_email_id: email.id,
          email_type: input.email_type,
          direction: 'outbound',
          gmail_message_id: sent.id,
          gmail_thread_id: sent.threadId,
          source: 'gmail_send',
        },
      })
    }

    const opportunityQuery = supabase
      .from('opportunities')
      .select('id,stage')
      .eq('lead_id', lead.id)
      .eq('org_id', orgId)
      .eq('status', 'open')
      .order('updated_at', { ascending: false })
      .limit(1)

    const { data: opportunity } = campaignId
      ? await opportunityQuery.eq('campaign_id', campaignId).maybeSingle()
      : await opportunityQuery.maybeSingle()

    if (opportunity) {
      await recordOpportunityEvent({
        supabase,
        opportunityId: opportunity.id,
        orgId,
        userId: user.id,
        eventType: 'gmail_sent',
        oldStage: opportunity.stage,
        newStage: opportunity.stage,
        metadata: {
          lead_email_id: email.id,
          gmail_message_id: sent.id,
          gmail_thread_id: sent.threadId,
          email_type: input.email_type,
        },
      })
    }

    if (!['replied', 'meeting_booked', 'meeting_held', 'closed_won', 'closed_lost'].includes(lead.stage)) {
      await supabase
        .from('leads')
        .update({ stage: 'email_sent', last_outbound_at: sentAt, last_contacted_at: sentAt })
        .eq('id', lead.id)
        .eq('org_id', orgId)
    }

    return NextResponse.json({ data: email })
  } catch (error) {
    if (error instanceof GmailTokenExpiredError) {
      return NextResponse.json({ error: error.message, code: 'TOKEN_EXPIRED' }, { status: 401 })
    }
    console.error('POST /api/gmail/send error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send Gmail message' },
      { status: 500 },
    )
  }
}
