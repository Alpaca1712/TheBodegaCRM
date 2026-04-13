import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [leadsRes, emailsRes, interactionsRes] = await Promise.all([
      supabase.from('leads').select('*').eq('user_id', user.id),
      supabase.from('lead_emails').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('lead_interactions').select('*').eq('user_id', user.id).order('occurred_at', { ascending: true }),
    ])

    const leads = leadsRes.data || []
    const emails = emailsRes.data || []
    const interactions = interactionsRes.data || []

    const outbound = emails.filter(e => e.direction === 'outbound')
    const inbound = emails.filter(e => e.direction === 'inbound')

    const emailDate = (e: Record<string, unknown>) => new Date((e.sent_at as string) || (e.created_at as string))

    // Funnel: count leads that ACTUALLY reached each stage
    // Each funnel stage has a set of current stages that prove the lead passed through it.
    // closed_lost does NOT count as closed_won -- those are separate outcomes.
    const funnelStages: Array<{ stage: string; qualifyingStages: string[] }> = [
      {
        stage: 'email_sent',
        qualifyingStages: ['email_sent', 'no_response', 'follow_up', 'replied', 'meeting_booked', 'meeting_held', 'closed_won', 'closed_lost'],
      },
      {
        stage: 'replied',
        qualifyingStages: ['replied', 'meeting_booked', 'meeting_held', 'closed_won'],
      },
      {
        stage: 'meeting_booked',
        qualifyingStages: ['meeting_booked', 'meeting_held', 'closed_won'],
      },
      {
        stage: 'closed_won',
        qualifyingStages: ['closed_won'],
      },
    ]
    const funnel = funnelStages.map(({ stage, qualifyingStages }) => {
      const qualSet = new Set(qualifyingStages)
      const count = leads.filter(l => qualSet.has(l.stage)).length
      return { stage, count }
    })

    // Reply rate by lead type (replied = contacted AND got an inbound reply)
    const contactedLeadIds = new Set(outbound.map(e => e.lead_id))
    const replyRateByType: Record<string, { contacted: number; replied: number; rate: number }> = {}
    for (const type of ['customer', 'investor', 'partnership']) {
      const typeLeads = leads.filter(l => l.type === type)
      const contacted = typeLeads.filter(l => contactedLeadIds.has(l.id)).length
      const replied = typeLeads.filter(l => contactedLeadIds.has(l.id) && inbound.some(e => e.lead_id === l.id)).length
      replyRateByType[type] = {
        contacted,
        replied,
        rate: contacted > 0 ? (replied / contacted) * 100 : 0,
      }
    }

    // Reply rate by CTA type (count unique leads per CTA, not individual emails)
    const leadsWithReplySet = new Set(
      inbound.filter(e => contactedLeadIds.has(e.lead_id)).map(e => e.lead_id)
    )
    const ctaLeadsSent: Record<string, Set<string>> = { mckenna: new Set(), hormozi: new Set() }
    const ctaLeadsReplied: Record<string, Set<string>> = { mckenna: new Set(), hormozi: new Set() }
    for (const email of outbound) {
      const cta = email.cta_type as string
      if (cta && ctaLeadsSent[cta]) {
        ctaLeadsSent[cta].add(email.lead_id)
        if (leadsWithReplySet.has(email.lead_id)) {
          ctaLeadsReplied[cta].add(email.lead_id)
        }
      }
    }
    const ctaPerformance: Record<string, { sent: number; replied: number; rate: number }> = {}
    for (const key of ['mckenna', 'hormozi']) {
      const sent = ctaLeadsSent[key].size
      const replied = ctaLeadsReplied[key].size
      ctaPerformance[key] = { sent, replied, rate: sent > 0 ? (replied / sent) * 100 : 0 }
    }

    // Avg touchpoints to convert (leads that replied)
    const touchpointsToReply: number[] = []
    for (const leadId of leadsWithReplySet) {
      const firstInbound = inbound.find(e => e.lead_id === leadId)
      if (!firstInbound) continue
      const firstInDate = new Date(firstInbound.created_at)
      const outboundBefore = outbound.filter(e =>
        e.lead_id === leadId && new Date(e.created_at) <= firstInDate
      ).length
      const interactionsBefore = interactions.filter(ix =>
        ix.lead_id === leadId && new Date(ix.occurred_at) <= firstInDate
      ).length
      touchpointsToReply.push(outboundBefore + interactionsBefore)
    }
    const avgTouchpointsToReply = touchpointsToReply.length > 0
      ? touchpointsToReply.reduce((a, b) => a + b, 0) / touchpointsToReply.length
      : 0

    // Channel performance
    const channelStats: Record<string, { touchpoints: number; leads: Set<string> }> = {
      email: { touchpoints: 0, leads: new Set() },
      linkedin: { touchpoints: 0, leads: new Set() },
      twitter: { touchpoints: 0, leads: new Set() },
      phone: { touchpoints: 0, leads: new Set() },
    }
    for (const e of outbound) {
      channelStats.email.touchpoints++
      channelStats.email.leads.add(e.lead_id)
    }
    for (const ix of interactions) {
      const ch = ix.channel as string
      if (channelStats[ch]) {
        channelStats[ch].touchpoints++
        channelStats[ch].leads.add(ix.lead_id)
      }
    }
    const channelPerformance = Object.entries(channelStats).map(([channel, stats]) => ({
      channel,
      touchpoints: stats.touchpoints,
      leadsReached: stats.leads.size,
    })).filter(c => c.touchpoints > 0)

    // Time-to-reply distribution (use sent_at for accurate timing)
    const replyDayBuckets: Record<string, number> = {
      '0-1': 0, '2-3': 0, '4-7': 0, '8-14': 0, '15+': 0,
    }
    for (const leadId of leadsWithReplySet) {
      const firstOut = outbound.find(e => e.lead_id === leadId)
      const firstIn = inbound.find(e => e.lead_id === leadId)
      if (firstOut && firstIn) {
        const days = Math.max(0, (emailDate(firstIn).getTime() - emailDate(firstOut).getTime()) / 86400000)
        if (days <= 1) replyDayBuckets['0-1']++
        else if (days <= 3) replyDayBuckets['2-3']++
        else if (days <= 7) replyDayBuckets['4-7']++
        else if (days <= 14) replyDayBuckets['8-14']++
        else replyDayBuckets['15+']++
      }
    }

    // Weekly outreach trend (last 8 weeks, using sent_at for accurate dates)
    const weeklyTrend: { week: string; count: number }[] = []
    const now = new Date()
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 86400000)
      const weekEnd = new Date(now.getTime() - i * 7 * 86400000)
      const count = outbound.filter(e => {
        const d = emailDate(e)
        return d >= weekStart && d < weekEnd
      }).length
      const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      weeklyTrend.push({ week: label, count })
    }

    // By source (skip leads with no source set)
    const sourceCounts: Record<string, number> = {}
    for (const lead of leads) {
      if (!lead.source) continue
      sourceCounts[lead.source] = (sourceCounts[lead.source] || 0) + 1
    }

    return NextResponse.json({
      totalLeads: leads.length,
      totalOutbound: outbound.length,
      totalInbound: inbound.length,
      leadsContacted: new Set(outbound.map(e => e.lead_id)).size,
      leadsWithReplies: leadsWithReplySet.size,
      replyRate: new Set(outbound.map(e => e.lead_id)).size > 0
        ? (leadsWithReplySet.size / new Set(outbound.map(e => e.lead_id)).size) * 100 : 0,
      meetingsBooked: leads.filter(l => ['meeting_booked', 'meeting_held', 'closed_won'].includes(l.stage)).length,
      funnel,
      replyRateByType,
      ctaPerformance,
      avgTouchpointsToReply: Math.round(avgTouchpointsToReply * 10) / 10,
      channelPerformance,
      replyDayBuckets,
      weeklyTrend,
      byType: {
        customers: leads.filter(l => l.type === 'customer').length,
        investors: leads.filter(l => l.type === 'investor').length,
        partnerships: leads.filter(l => l.type === 'partnership').length,
      },
      bySource: Object.entries(sourceCounts)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count),
    })
  } catch (error) {
    console.error('GET /api/analytics error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
