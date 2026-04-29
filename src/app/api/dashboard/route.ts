import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    let leadsQuery = supabase.from('leads').select('*').eq('user_id', user.id)
    if (type) {
      leadsQuery = leadsQuery.eq('type', type)
    }

    const [leadsRes, emailsRes, interactionsRes] = await Promise.all([
      leadsQuery,
      supabase.from('lead_emails').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('lead_interactions').select('id, lead_id, channel, interaction_type, occurred_at').eq('user_id', user.id),
    ])

    const leads = leadsRes.data || []
    const leadIds = new Set(leads.map(l => l.id))

    const emails = (emailsRes.data || []).filter(e => leadIds.has(e.lead_id))
    const interactions = (interactionsRes.data || []).filter(ix => leadIds.has(ix.lead_id))

    // Build per-lead email index maps for O(1) lookups (was O(N) .filter() per lead)
    const outboundByLead = new Map<string, typeof emails>()
    const inboundByLead = new Map<string, typeof emails>()
    for (const e of emails) {
      if (e.direction === 'outbound') {
        const arr = outboundByLead.get(e.lead_id)
        if (arr) arr.push(e); else outboundByLead.set(e.lead_id, [e])
      } else {
        const arr = inboundByLead.get(e.lead_id)
        if (arr) arr.push(e); else inboundByLead.set(e.lead_id, [e])
      }
    }

    const outboundEmails = emails.filter(e => e.direction === 'outbound')
    const inboundEmails = emails.filter(e => e.direction === 'inbound')

    const thisWeekOutbound = outboundEmails.filter(e => new Date(e.created_at) >= weekAgo)
    const lastWeekOutbound = outboundEmails.filter(e => {
      const d = new Date(e.created_at)
      return d >= twoWeeksAgo && d < weekAgo
    })

    const leadsWithReplies = new Set(inboundEmails.map(e => e.lead_id))
    const leadsWithOutbound = new Set(outboundEmails.map(e => e.lead_id))
    const leadsContacted = leadsWithOutbound.size

    const meetingLeads = leads.filter(l =>
      ['meeting_booked', 'meeting_held', 'closed_won'].includes(l.stage)
    )

    // Avg days to reply: use pre-built maps instead of .find()
    const replyTimes: number[] = []
    for (const leadId of leadsWithReplies) {
      const outArr = outboundByLead.get(leadId)
      const inArr = inboundByLead.get(leadId)
      if (outArr && outArr.length > 0 && inArr && inArr.length > 0) {
        const days = (new Date(inArr[0].created_at).getTime() - new Date(outArr[0].created_at).getTime()) / (1000 * 60 * 60 * 24)
        if (days >= 0) replyTimes.push(days)
      }
    }
    const avgDaysToReply = replyTimes.length > 0
      ? replyTimes.reduce((a, b) => a + b, 0) / replyTimes.length
      : 0

    // Follow-up compliance: use map for O(1) email count per lead
    const followUpLeads = leads.filter(l =>
      ['email_sent', 'follow_up', 'no_response'].includes(l.stage)
    )
    let leadsWithMultipleOutbound = 0
    for (const l of followUpLeads) {
      if ((outboundByLead.get(l.id)?.length ?? 0) >= 2) leadsWithMultipleOutbound++
    }
    const followUpCompliance = followUpLeads.length > 0
      ? (leadsWithMultipleOutbound / followUpLeads.length) * 100
      : 100

    // Hot leads: replied/meeting_booked (7d), high ICP researched (48h), or positive signals (7d)
    const hotLeads = leads
      .filter(l => {
        // 1. Recently active in late stages
        if (['replied', 'meeting_booked'].includes(l.stage)) {
          const lastUpdate = l.last_inbound_at || l.updated_at
          if (new Date(lastUpdate) >= weekAgo) return true
        }

        // 2. High ICP leads recently researched
        if (l.stage === 'researched' && (l.icp_score ?? 0) >= 80) {
          if (new Date(l.updated_at) >= fortyEightHoursAgo) return true
        }

        // 3. Positive conversation signals detected recently
        if (l.conversation_signals && Array.isArray(l.conversation_signals)) {
          const hasRecentPositive = l.conversation_signals.some(s =>
            s.type === 'positive' && new Date(s.detected_at) >= weekAgo
          )
          if (hasRecentPositive) return true
        }

        return false
      })
      .sort((a, b) => (b.icp_score ?? 0) - (a.icp_score ?? 0))
      .slice(0, 8)

    // Build per-lead interaction count map
    const interactionsByLead = new Map<string, number>()
    for (const ix of interactions) {
      interactionsByLead.set(ix.lead_id, (interactionsByLead.get(ix.lead_id) ?? 0) + 1)
    }

    // Touchpoints per lead — single pass using maps
    const touchpointCounts: number[] = []
    for (const lead of leads) {
      const emailCount = outboundByLead.get(lead.id)?.length ?? 0
      const interactionCount = interactionsByLead.get(lead.id) ?? 0
      if (emailCount + interactionCount > 0) {
        touchpointCounts.push(emailCount + interactionCount)
      }
    }
    const avgTouchpoints = touchpointCounts.length > 0
      ? touchpointCounts.reduce((a, b) => a + b, 0) / touchpointCounts.length
      : 0

    // Pipeline counts + byType — single pass
    const pipelineCounts: Record<string, number> = {}
    let customerCount = 0, investorCount = 0, partnershipCount = 0
    let closedWon = 0, activePipeline = 0
    for (const lead of leads) {
      pipelineCounts[lead.stage] = (pipelineCounts[lead.stage] || 0) + 1
      if (lead.type === 'customer') customerCount++
      else if (lead.type === 'investor') investorCount++
      else if (lead.type === 'partnership') partnershipCount++
      if (lead.stage === 'closed_won') closedWon++
      if (!['researched', 'email_drafted', 'closed_won', 'closed_lost'].includes(lead.stage)) activePipeline++
    }

    const response = NextResponse.json({
      totalLeads: leads.length,
      outreachThisWeek: thisWeekOutbound.length,
      outreachLastWeek: lastWeekOutbound.length,
      totalOutbound: outboundEmails.length,
      totalInbound: inboundEmails.length,
      leadsContacted,
      leadsWithReplies: leadsWithReplies.size,
      replyRate: leadsContacted > 0 ? (leadsWithReplies.size / leadsContacted) * 100 : 0,
      meetingsBooked: meetingLeads.length,
      meetingConversion: leadsWithReplies.size > 0 ? (meetingLeads.length / leadsWithReplies.size) * 100 : 0,
      avgDaysToReply: Math.round(avgDaysToReply * 10) / 10,
      followUpCompliance: Math.round(followUpCompliance),
      avgTouchpoints: Math.round(avgTouchpoints * 10) / 10,
      hotLeads,
      pipelineCounts,
      byType: {
        customers: customerCount,
        investors: investorCount,
        partnerships: partnershipCount,
      },
      closedWon,
      activePipeline,
    })
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
    return response
  } catch (error) {
    console.error('GET /api/dashboard error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch dashboard' },
      { status: 500 }
    )
  }
}
