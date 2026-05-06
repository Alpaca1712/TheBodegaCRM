import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { EmailService } from '@/lib/ai/email-service'
import { requireUser, rateLimitResponse } from '@/lib/api/auth-guard'

const requestSchema = z.object({
  leadId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const guard = await requireUser()
    if (guard instanceof NextResponse) return guard
    const limited = rateLimitResponse(guard.user.id, 'ai:draft-next-step', {
      limit: 10,
      windowMs: 60_000,
    })
    if (limited) return limited
    const { user, supabase } = guard

    const body = await request.json()
    const validation = requestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    const { leadId } = validation.data

    // 1. Fetch Lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('user_id', user.id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // 2. Fetch Email History
    const { data: emails } = await supabase
      .from('lead_emails')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })

    const outbound = (emails || []).filter(e => e.direction === 'outbound')
    const followUpNumber = outbound.length // 0 outbound -> next is initial (handled differently), 1 outbound -> next is FU#1

    // 3. Determine next step and generate
    let draft;
    if (lead.stage === 'researched' && outbound.length === 0) {
      // Generate initial variants and pick best
      const [mckenna, hormozi] = await Promise.all([
        EmailService.generateInitial(lead, 'mckenna'),
        EmailService.generateInitial(lead, 'hormozi')
      ])
      draft = (mckenna.quality?.score || 0) >= (hormozi.quality?.score || 0) ? mckenna : hormozi
    } else {
      // Generate follow-up/reply variants and pick best
      const [variantA, variantB] = await Promise.all([
        EmailService.generateFollowup(lead, emails || [], Math.max(1, followUpNumber)),
        EmailService.generateFollowup(lead, emails || [], Math.max(1, followUpNumber))
      ])
      draft = (variantA.quality?.score || 0) >= (variantB.quality?.score || 0) ? variantA : variantB
    }

    // 4. Save Draft
    const { data: profile } = await supabase
      .from('profiles')
      .select('active_org_id')
      .eq('user_id', user.id)
      .single()

    const emailType = (lead.stage === 'researched' && outbound.length === 0) ? 'initial'
      : (lead.stage === 'replied') ? 'reply_response'
      : (lead.stage === 'meeting_held') ? 'reply_response'
      : `follow_up_${Math.min(3, Math.max(1, followUpNumber))}`

    const { data: savedEmail, error: emailError } = await supabase
      .from('lead_emails')
      .insert({
        lead_id: lead.id,
        user_id: user.id,
        org_id: profile?.active_org_id || null,
        email_type: emailType,
        cta_type: draft.ctaType,
        subject: draft.subject,
        body: draft.body,
        direction: 'outbound',
        sent_at: null, // Draft
      })
      .select()
      .single()

    if (emailError) throw emailError

    // 5. Update Lead Stage
    await supabase
      .from('leads')
      .update({ stage: 'email_drafted' })
      .eq('id', lead.id)

    return NextResponse.json({ success: true, email: savedEmail })
  } catch (error) {
    console.error('Magic draft error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate magic draft' },
      { status: 500 }
    )
  }
}
