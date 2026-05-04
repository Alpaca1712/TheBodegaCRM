import { NextRequest, NextResponse } from 'next/server'
import { generateInitialEmail, generateFollowUpEmail } from '@/lib/ai/email-service'
import type { Lead, LeadEmail, EmailType, PipelineStage } from '@/types/leads'
import { requireUser, rateLimitResponse } from '@/lib/api/auth-guard'

export async function POST(request: NextRequest) {
  try {
    const guard = await requireUser()
    if (guard instanceof NextResponse) return guard
    const { user, supabase } = guard

    const limited = rateLimitResponse(user.id, 'ai:draft-next-step', {
      limit: 15,
      windowMs: 60_000,
    })
    if (limited) return limited

    const { leadId } = await request.json()
    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    // 1. Fetch lead and related data
    const [leadRes, emailsRes, profileRes] = await Promise.all([
      supabase.from('leads').select('*').eq('id', leadId).eq('user_id', user.id).single(),
      supabase.from('lead_emails').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
      supabase.from('profiles').select('active_org_id').eq('user_id', user.id).single(),
    ])

    if (leadRes.error || !leadRes.data) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const lead = leadRes.data as Lead
    const emails = (emailsRes.data || []) as LeadEmail[]
    const orgId = profileRes.data?.active_org_id || null

    // 2. Fetch memories
    const { data: memories } = await supabase
      .from('agent_memory')
      .select('memory_type, content')
      .eq('lead_id', leadId)
      .order('relevance_score', { ascending: false })
      .limit(10)

    // 3. Determine outreach type
    const outbound = emails.filter(e => e.direction === 'outbound')
    const inbound = emails.filter(e => e.direction === 'inbound')
    const lastInbound = inbound[0]
    const lastOutbound = outbound[0]

    let draftSubject = ''
    let draftBody = ''
    let draftType: EmailType = 'initial'
    let ctaType: 'mckenna' | 'hormozi' = 'mckenna'

    if (outbound.length === 0) {
      // Generate initial email variants and pick the best one
      const generated = await generateInitialEmail(lead, undefined, memories || [])
      const best = (generated.mckenna.quality?.score || 0) >= (generated.hormozi.quality?.score || 0)
        ? generated.mckenna
        : generated.hormozi

      draftSubject = best.subject
      draftBody = best.body
      draftType = 'initial'
      ctaType = best.ctaType as 'mckenna' | 'hormozi'
    } else {
      // Determine follow-up step or reply
      const followUpNumber = outbound.length
      let mode: 'follow_up' | 'reply' | 'meeting' = 'follow_up'

      const inboundDate = lastInbound ? new Date(lastInbound.replied_at || lastInbound.created_at).getTime() : 0
      const outboundDate = lastOutbound ? new Date(lastOutbound.sent_at || lastOutbound.created_at).getTime() : 0

      if (inboundDate > outboundDate) {
        mode = 'reply'
      } else if (lead.stage === 'meeting_held') {
        mode = 'meeting'
      }

      // Temporarily adjust lead stage for follow-up routing in service
      const routingLead = { ...lead }
      if (mode === 'reply') routingLead.stage = 'replied'
      else if (mode === 'meeting') routingLead.stage = 'meeting_held'

      const generated = await generateFollowUpEmail(
        routingLead,
        [...emails].reverse(), // Service expects oldest first
        followUpNumber,
        undefined,
        memories || []
      )

      draftSubject = generated.subject
      draftBody = generated.body

      if (mode === 'reply' || mode === 'meeting') {
        draftType = 'reply_response'
      } else {
        const stepTypes: EmailType[] = ['follow_up_1', 'follow_up_2', 'follow_up_3', 'break_up']
        draftType = stepTypes[Math.min(outbound.length - 1, 3)]
      }
    }

    // 4. Save draft
    const { data: savedEmail, error: saveError } = await supabase
      .from('lead_emails')
      .insert({
        lead_id: leadId,
        user_id: user.id,
        org_id: orgId,
        email_type: draftType,
        cta_type: ctaType,
        subject: draftSubject,
        body: draftBody,
        direction: 'outbound',
        sent_at: null, // It's a draft
      })
      .select()
      .single()

    if (saveError) {
      console.error('Draft save error:', saveError)
      return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 })
    }

    // 5. Update lead stage
    await supabase
      .from('leads')
      .update({ stage: 'email_drafted' as PipelineStage })
      .eq('id', leadId)
      .eq('user_id', user.id)

    return NextResponse.json({
      success: true,
      email: savedEmail,
      message: 'Magic draft created'
    })
  } catch (error) {
    console.error('Draft next step error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to draft next step' },
      { status: 500 }
    )
  }
}
