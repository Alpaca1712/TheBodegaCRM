import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, rateLimitResponse } from '@/lib/api/auth-guard'
import { generateInitialOutreach, generateFollowupOutreach } from '@/lib/ai/email-service'
import { computeFollowUp } from '@/lib/follow-ups/follow-up-engine'
import { Lead, LeadEmail, EmailType } from '@/types/leads'

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
    const { supabase, user } = guard

    const body = await request.json()
    const validation = requestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid leadId' }, { status: 400 })
    }

    const { leadId } = validation.data

    // 1. Fetch lead and emails
    const [{ data: lead }, { data: emails }] = await Promise.all([
      supabase.from('leads').select('*').eq('id', leadId).eq('user_id', user.id).single(),
      supabase.from('lead_emails').select('*').eq('lead_id', leadId).eq('user_id', user.id).order('created_at', { ascending: false })
    ])

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    // 2. Determine next step
    const followUpItem = computeFollowUp(lead as Lead, (emails || []) as LeadEmail[])
    if (!followUpItem) {
      // Specialized check for meeting_held which might not be picked up by the follow-up engine
      // if it's purely stage-based but has no outbound after.
      if (lead.stage === 'meeting_held') {
        const outboundEmails = (emails || []).filter(e => e.direction === 'outbound')
        const lastOutbound = outboundEmails[0]
        const lastOutboundDate = lastOutbound?.sent_at || lastOutbound?.created_at
        const meetingDate = lead.last_contacted_at || lead.updated_at

        // If we haven't sent anything since the meeting, it's a recap candidate
        if (!lastOutboundDate || new Date(lastOutboundDate) <= new Date(meetingDate)) {
          // Continue with post_meeting logic
        } else {
          return NextResponse.json({ error: 'Recap already sent or not needed' }, { status: 400 })
        }
      } else {
        return NextResponse.json({ error: 'No immediate outreach step recommended' }, { status: 400 })
      }
    }

    const suggestedType = followUpItem?.suggestedType || (lead.stage === 'meeting_held' ? 'post_meeting' : null)
    if (!suggestedType) return NextResponse.json({ error: 'Unknown outreach step' }, { status: 400 })

    // 3. Fetch agent memories
    const { data: memories } = await supabase
      .from('agent_memory')
      .select('memory_type, content')
      .eq('lead_id', leadId)
      .order('relevance_score', { ascending: false })
      .limit(10)

    // 4. Generate variants
    let bestVariant: { subject: string; body: string; ctaType?: string }

    if (suggestedType === 'initial_outreach') {
      const result = await generateInitialOutreach(lead as Lead, undefined, memories || [])
      // Pick the one with the higher quality score
      bestVariant = (result.mckenna.quality?.score || 0) >= (result.hormozi.quality?.score || 0)
        ? result.mckenna
        : result.hormozi
    } else {
      // follow_up_1, follow_up_2, follow_up_3, break_up, reply_needed, post_meeting
      const emailThread = [...((emails || []) as LeadEmail[])]
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

      const outboundCount = (emails || []).filter(e => e.direction === 'outbound').length

      let followUpNumber = 1
      if (suggestedType === 'follow_up_1') followUpNumber = 1
      else if (suggestedType === 'follow_up_2') followUpNumber = 2
      else if (suggestedType === 'follow_up_3') followUpNumber = 3
      else if (suggestedType === 'break_up') followUpNumber = 4
      else followUpNumber = Math.max(1, outboundCount)

      // Draft next step needs a stable stage for generateFollowupOutreach
      const effectiveLead = {
        ...lead,
        stage: suggestedType === 'reply_needed' ? 'replied' :
               suggestedType === 'post_meeting' ? 'meeting_held' : lead.stage
      }

      const result = await generateFollowupOutreach({
        lead: effectiveLead as Lead,
        emailThread,
        followUpNumber,
        memories: memories || []
      })
      bestVariant = result
    }

    // 5. Save as draft
    const emailType: EmailType = suggestedType === 'initial_outreach' ? 'initial'
      : suggestedType === 'reply_needed' ? 'reply_response'
      : suggestedType === 'post_meeting' ? 'reply_response'
      : (suggestedType as EmailType)

    const { data: profile } = await supabase
      .from('profiles')
      .select('active_org_id')
      .eq('user_id', user.id)
      .single()

    const { error: saveError } = await supabase.from('lead_emails').insert({
      lead_id: leadId,
      user_id: user.id,
      org_id: profile?.active_org_id || null,
      email_type: emailType,
      cta_type: bestVariant.ctaType || 'mckenna',
      subject: bestVariant.subject,
      body: bestVariant.body,
      direction: 'outbound'
    })

    if (saveError) throw saveError

    // 6. Update lead stage
    const { error: updateError } = await supabase.from('leads').update({
      stage: 'email_drafted',
      updated_at: new Date().toISOString()
    }).eq('id', leadId)
      .eq('user_id', user.id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, variant: bestVariant })
  } catch (error) {
    console.error('Draft next step error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to draft next step' },
      { status: 500 }
    )
  }
}
