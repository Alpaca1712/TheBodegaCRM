import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, rateLimitResponse } from '@/lib/api/auth-guard'
import { generateInitialEmail, generateFollowupEmail, type EmailVariant } from '@/lib/ai/email-service'

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
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { leadId } = validation.data

    // 1. Fetch Lead context
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('user_id', user.id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // 2. Fetch Email Thread
    const { data: emails, error: emailsError } = await supabase
      .from('lead_emails')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true })

    if (emailsError) {
      return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 })
    }

    // 3. Fetch Memories
    const { data: memoriesData } = await supabase
      .from('agent_memory')
      .select('memory_type, content')
      .eq('lead_id', leadId)
      .order('relevance_score', { ascending: false })
      .limit(10)
    const memories = memoriesData || []

    // 4. Detect Mode
    const hasInbound = emails.some(e => e.direction === 'inbound')
    const outbound = emails.filter(e => e.direction === 'outbound')
    const outboundCount = outbound.length

    let mode: 'initial' | 'follow_up' | 'replied' | 'meeting_held' = 'initial'
    let followUpNumber = 0

    if (hasInbound) {
      const lastInbound = [...emails].filter(e => e.direction === 'inbound')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      const lastOutbound = [...outbound]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

      const inboundDate = new Date(lastInbound?.replied_at || lastInbound?.created_at || 0)
      const outboundDate = lastOutbound ? new Date(lastOutbound.sent_at || lastOutbound.created_at) : new Date(0)

      if (inboundDate > outboundDate) {
        mode = 'replied'
        followUpNumber = 1
      } else if (outboundCount >= 1) {
        mode = 'follow_up'
        followUpNumber = Math.min(outboundCount, 4)
      }
    } else if (lead.stage === 'meeting_held') {
      mode = 'meeting_held'
      followUpNumber = 1
    } else if (outboundCount > 0) {
      mode = 'follow_up'
      followUpNumber = Math.min(outboundCount, 4)
    } else {
      mode = 'initial'
    }

    // 5. Generate best variant
    let bestVariant: EmailVariant

    if (mode === 'initial') {
      const { mckenna, hormozi } = await generateInitialEmail(lead, undefined, memories)
      bestVariant = mckenna.quality.score >= hormozi.quality.score ? mckenna : hormozi
    } else {
      const emailThread = emails.map(e => ({
        direction: e.direction as 'inbound' | 'outbound',
        subject: e.subject,
        body: e.body,
        sent_at: e.sent_at,
        created_at: e.created_at,
        email_type: e.email_type,
      }))

      const leadForPrompt = { ...lead, stage: mode === 'replied' ? 'replied' : mode === 'meeting_held' ? 'meeting_held' : lead.stage }

      // Generate two distinct variants to pick the best
      const [vA, vB] = await Promise.all([
        generateFollowupEmail({ lead: leadForPrompt, emailThread, followUpNumber, ctaStyle: 'mckenna', memories }),
        generateFollowupEmail({ lead: leadForPrompt, emailThread, followUpNumber, ctaStyle: 'hormozi', memories })
      ])

      bestVariant = vA.quality.score >= vB.quality.score ? vA : vB
    }

    // 6. Save as Draft
    const emailType = mode === 'initial' ? 'initial'
      : mode === 'replied' ? 'reply_response'
      : mode === 'meeting_held' ? 'reply_response'
      : `follow_up_${followUpNumber}`

    const { data: savedDraft, error: saveError } = await supabase
      .from('lead_emails')
      .insert({
        lead_id: leadId,
        user_id: user.id,
        email_type: emailType,
        cta_type: bestVariant.ctaType,
        subject: bestVariant.subject,
        body: bestVariant.body,
        direction: 'outbound',
      })
      .select()
      .single()

    if (saveError) throw saveError

    // 7. Update Lead Stage to email_drafted
    const { error: updateError } = await supabase
      .from('leads')
      .update({ stage: 'email_drafted' })
      .eq('id', leadId)

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      draftId: savedDraft.id,
      mode,
      emailType,
      variant: bestVariant.ctaType,
      score: bestVariant.quality.score,
    })

  } catch (error) {
    console.error('Draft next step error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to draft email' },
      { status: 500 }
    )
  }
}
