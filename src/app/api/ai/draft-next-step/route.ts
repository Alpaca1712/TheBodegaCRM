import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { EmailService } from '@/lib/ai/email-service'
import { requireUser, rateLimitResponse } from '@/lib/api/auth-guard'
import type { GeneratedEmail, EmailType } from '@/types/leads'

const requestSchema = z.object({
  leadId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const guard = await requireUser()
    if (guard instanceof NextResponse) return guard
    const { user, supabase } = guard

    const limited = rateLimitResponse(user.id, 'ai:draft-next-step', {
      limit: 10,
      windowMs: 60_000,
    })
    if (limited) return limited

    const body = await request.json()
    const validation = requestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    const { leadId } = validation.data

    // 1. Fetch lead and context
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('user_id', user.id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const { data: emails } = await supabase
      .from('lead_emails')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true })

    const { data: memories } = await supabase
      .from('agent_memory')
      .select('memory_type, content')
      .eq('lead_id', leadId)
      .order('relevance_score', { ascending: false })
      .limit(10)

    // 2. Determine next step
    const outbound = (emails || []).filter(e => e.direction === 'outbound')
    const outboundCount = outbound.length

    let generated: GeneratedEmail
    let emailType: EmailType

    if (lead.stage === 'researched' || outboundCount === 0) {
      generated = await EmailService.generateInitial(lead, { memories: memories || [] })
      emailType = 'initial'
    } else {
      // It's a follow-up or reply
      // If 1 outbound sent, we are on Follow-up #1
      const followUpNumber = Math.min(outboundCount, 4)
      generated = await EmailService.generateFollowup(
        lead,
        emails || [],
        followUpNumber,
        { memories: memories || [] }
      )

      if (lead.stage === 'replied') emailType = 'reply_response'
      else if (lead.stage === 'meeting_held') emailType = 'reply_response'
      else if (followUpNumber === 1) emailType = 'follow_up_1'
      else if (followUpNumber === 2) emailType = 'follow_up_2'
      else if (followUpNumber === 3) emailType = 'follow_up_3'
      else emailType = 'break_up'
    }

    // 3. Pick best variant
    const mckennaScore = generated.mckenna.quality?.score || 0
    const hormoziScore = generated.hormozi.quality?.score || 0
    const bestVariant = mckennaScore >= hormoziScore ? generated.mckenna : generated.hormozi
    const bestCta = mckennaScore >= hormoziScore ? 'mckenna' : 'hormozi'

    // 4. Save draft
    const { data: profile } = await supabase
      .from('profiles')
      .select('active_org_id')
      .eq('user_id', user.id)
      .single()

    // 4. Save draft (update existing unsent draft if it exists, otherwise insert)
    const { data: existingDraft } = await supabase
      .from('lead_emails')
      .select('id')
      .eq('lead_id', leadId)
      .eq('direction', 'outbound')
      .is('sent_at', null)
      .maybeSingle()

    if (existingDraft) {
      const { error: updateDraftError } = await supabase
        .from('lead_emails')
        .update({
          email_type: emailType,
          cta_type: bestCta,
          subject: bestVariant.subject,
          body: bestVariant.body,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingDraft.id)

      if (updateDraftError) throw updateDraftError
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_org_id')
        .eq('user_id', user.id)
        .single()

      const { error: insertError } = await supabase
        .from('lead_emails')
        .insert({
          lead_id: leadId,
          user_id: user.id,
          org_id: profile?.active_org_id || null,
          email_type: emailType,
          cta_type: bestCta,
          subject: bestVariant.subject,
          body: bestVariant.body,
          direction: 'outbound',
          sent_at: null,
        })

      if (insertError) throw insertError
    }

    // 5. Update lead stage
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        stage: 'email_drafted',
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .eq('user_id', user.id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, emailType, ctaType: bestCta })
  } catch (error) {
    console.error('Magic draft error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate magic draft' },
      { status: 500 }
    )
  }
}
