import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateInitialEmailVariants, generateFollowUpVariants } from '@/lib/ai/email-service'
import type { Lead, GeneratedEmail } from '@/types/leads'

const requestSchema = z.object({
  leadId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const validation = requestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 })
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

    // 2. Determine next step and generate variants
    const emailThread = (emails || []).map(e => ({
      direction: e.direction,
      subject: e.subject,
      body: e.body,
      sent_at: e.sent_at,
      created_at: e.created_at,
    }))

    const outboundCount = emailThread.filter(e => e.direction === 'outbound').length

    let generated: GeneratedEmail
    let emailType: string

    if (outboundCount === 0) {
      generated = await generateInitialEmailVariants(lead as Lead, undefined, memories || [])
      emailType = 'initial'
    } else {
      // Logic from follow-up-suggestions.tsx to determine followUpNumber
      let followUpNumber = 1
      if (lead.stage === 'replied' || lead.stage === 'meeting_held') {
        followUpNumber = 1
      } else {
        if (outboundCount === 1) followUpNumber = 1
        else if (outboundCount === 2) followUpNumber = 2
        else if (outboundCount === 3) followUpNumber = 3
        else followUpNumber = 4
      }

      generated = await generateFollowUpVariants(
        lead as Lead,
        emailThread,
        followUpNumber,
        undefined,
        memories || []
      )

      emailType = lead.stage === 'replied' ? 'reply_response'
                : lead.stage === 'meeting_held' ? 'reply_response'
                : followUpNumber === 1 ? 'follow_up_1'
                : followUpNumber === 2 ? 'follow_up_2'
                : followUpNumber === 3 ? 'follow_up_3'
                : 'break_up'
    }

    // 3. Pick the best variant
    const mScore = generated.mckenna.quality?.score || 0
    const hScore = generated.hormozi.quality?.score || 0
    const best = mScore >= hScore ? generated.mckenna : generated.hormozi

    // 4. Save draft
    const { data: profile } = await supabase
      .from('profiles')
      .select('active_org_id')
      .eq('user_id', user.id)
      .single()

    const { data: draft, error: draftError } = await supabase
      .from('lead_emails')
      .insert({
        lead_id: leadId,
        user_id: user.id,
        org_id: profile?.active_org_id || null,
        email_type: emailType,
        cta_type: best.ctaType,
        subject: best.subject,
        body: best.body,
        direction: 'outbound',
        sent_at: null, // Draft
      })
      .select()
      .single()

    if (draftError) {
      console.error('Draft save error:', draftError)
      return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 })
    }

    // 5. Update lead stage
    await supabase
      .from('leads')
      .update({ stage: 'email_drafted' })
      .eq('id', leadId)
      .eq('user_id', user.id)

    return NextResponse.json({ success: true, draft })
  } catch (error) {
    console.error('Draft next step error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to draft next step' },
      { status: 500 }
    )
  }
}
