import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const [leadsRes, emailsRes, interactionsRes] = await Promise.all([
      supabase.from('leads').select('*'),
      supabase.from('lead_emails').select('*').order('created_at', { ascending: true }),
      supabase.from('lead_interactions').select('id, lead_id, channel, interaction_type, occurred_at'),
    ])

    const leads = leadsRes.data || []
    const emails = emailsRes.data || []
    const interactions = interactionsRes.data || []

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

    // Avg days to reply: for leads that got a reply, time from first outbound to first inbound
    const replyTimes: number[] = []
    for (const leadId of leadsWithReplies) {
      const firstOut = outboundEmails.find(e => e.lead_id === leadId)
      const firstIn = inboundEmails.find(e => e.lead_id === leadId)
      if (firstOut && firstIn) {
        const days = (new Date(firstIn.created_at).getTime() - new Date(firstOut.created_at).getTime()) / (1000 * 60 * 60 * 24)
        if (days >= 0) replyTimes.push(days)
      }
    }
    const avgDaysToReply = replyTimes.length > 0
      ? replyTimes.reduce((a, b) => a + b, 0) / replyTimes.length
      : 0

    // Follow-up compliance: leads in email_sent/follow_up/no_response that have been contacted
    const followUpLeads = leads.filter(l =>
      ['email_sent', 'follow_up', 'no_response'].includes(l.stage)
    )
    const leadsWithMultipleOutbound = followUpLeads.filter(l => {
      const count = outboundEmails.filter(e => e.lead_id === l.id).length
      return count >= 2
    })
    const followUpCompliance = followUpLeads.length > 0
      ? (leadsWithMultipleOutbound.length / followUpLeads.length) * 100
      : 100

    // Hot leads: replied or meeting_booked in last 7 days
    const hotLeads = leads.filter(l => {
      if (!['replied', 'meeting_booked'].includes(l.stage)) return false
      const lastIn = l.last_inbound_at || l.updated_at
      return new Date(lastIn) >= weekAgo
    }).slice(0, 8)

    // Touchpoints per lead (for avg calculation)
    const touchpointCounts: number[] = []
    for (const lead of leads) {
      const emailCount = outboundEmails.filter(e => e.lead_id === lead.id).length
      const interactionCount = interactions.filter(ix => ix.lead_id === lead.id).length
      if (emailCount + interactionCount > 0) {
        touchpointCounts.push(emailCount + interactionCount)
      }
    }
    const avgTouchpoints = touchpointCounts.length > 0
      ? touchpointCounts.reduce((a, b) => a + b, 0) / touchpointCounts.length
      : 0

    // Pipeline counts
    const pipelineCounts: Record<string, number> = {}
    for (const lead of leads) {
      pipelineCounts[lead.stage] = (pipelineCounts[lead.stage] || 0) + 1
    }

    return NextResponse.json({
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
        customers: leads.filter(l => l.type === 'customer').length,
        investors: leads.filter(l => l.type === 'investor').length,
        partnerships: leads.filter(l => l.type === 'partnership').length,
      },
      closedWon: leads.filter(l => l.stage === 'closed_won').length,
      activePipeline: leads.filter(l =>
        !['researched', 'email_drafted', 'closed_won', 'closed_lost'].includes(l.stage)
      ).length,
    })
  } catch (error) {
    console.error('GET /api/dashboard error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch dashboard' },
      { status: 500 }
    )
  }
}
