export interface AnalyticsLeadRow {
  id: string
  type: string | null
  stage: string | null
  source: string | null
}

export interface AnalyticsEmailRow {
  lead_id: string
  direction: string | null
  cta_type: string | null
  sent_at: string | null
  created_at: string | null
}

export interface AnalyticsInteractionRow {
  lead_id: string
  channel: string | null
  occurred_at: string | null
}

export interface AnalyticsSummary {
  totalLeads: number
  totalOutbound: number
  totalInbound: number
  leadsContacted: number
  leadsWithReplies: number
  replyRate: number
  meetingsBooked: number
  funnel: Array<{ stage: string; count: number }>
  replyRateByType: Record<string, { contacted: number; replied: number; rate: number }>
  ctaPerformance: Record<string, { sent: number; replied: number; rate: number }>
  avgTouchpointsToReply: number
  channelPerformance: Array<{ channel: string; touchpoints: number; leadsReached: number }>
  replyDayBuckets: Record<string, number>
  weeklyTrend: Array<{ week: string; count: number }>
  byType: { customers: number; investors: number; partnerships: number }
  bySource: Array<{ source: string; count: number }>
}

const LEAD_TYPES = ['customer', 'investor', 'partnership'] as const
const CTA_TYPES = ['mckenna', 'hormozi'] as const
const REPLY_FUNNEL_STAGES = new Set(['replied', 'meeting_booked', 'meeting_held', 'closed_won'])
const MEETING_FUNNEL_STAGES = new Set(['meeting_booked', 'meeting_held', 'closed_won'])
const OUTREACH_FUNNEL_STAGES = new Set([
  'email_sent',
  'no_response',
  'follow_up',
  'replied',
  'meeting_booked',
  'meeting_held',
  'closed_won',
  'closed_lost',
])
const CHANNELS = ['email', 'linkedin', 'twitter', 'phone'] as const
const WEEK_MS = 7 * 86400000

function emailTime(email: AnalyticsEmailRow) {
  return new Date(email.sent_at || email.created_at || 0).getTime()
}

function earlierEmail(current: AnalyticsEmailRow | undefined, candidate: AnalyticsEmailRow) {
  if (!current) return candidate
  return emailTime(candidate) < emailTime(current) ? candidate : current
}

function addDate(map: Map<string, number[]>, key: string, value: number) {
  const dates = map.get(key)
  if (dates) {
    dates.push(value)
  } else {
    map.set(key, [value])
  }
}

function countAtOrBefore(dates: number[] | undefined, cutoff: number) {
  if (!dates) return 0
  let count = 0
  for (const date of dates) {
    if (date <= cutoff) count++
  }
  return count
}

export function buildAnalyticsSummary(
  leads: AnalyticsLeadRow[],
  emails: AnalyticsEmailRow[],
  interactions: AnalyticsInteractionRow[],
  now = new Date(),
): AnalyticsSummary {
  const contactedLeadIds = new Set<string>()
  const inboundLeadIds = new Set<string>()
  const firstInboundByLead = new Map<string, AnalyticsEmailRow>()
  const firstOutboundByLead = new Map<string, AnalyticsEmailRow>()
  const outboundDatesByLead = new Map<string, number[]>()
  const interactionDatesByLead = new Map<string, number[]>()
  const ctaLeadsSent: Record<string, Set<string>> = { mckenna: new Set(), hormozi: new Set() }
  const channelStats: Record<string, { touchpoints: number; leads: Set<string> }> = {
    email: { touchpoints: 0, leads: new Set() },
    linkedin: { touchpoints: 0, leads: new Set() },
    twitter: { touchpoints: 0, leads: new Set() },
    phone: { touchpoints: 0, leads: new Set() },
  }
  const weeklyCounts = Array.from({ length: 8 }, () => 0)
  const weekWindows = Array.from({ length: 8 }, (_, index) => {
    const weeksBack = 7 - index
    return {
      start: now.getTime() - (weeksBack + 1) * WEEK_MS,
      end: now.getTime() - weeksBack * WEEK_MS,
    }
  })

  let totalOutbound = 0
  let totalInbound = 0

  for (const email of emails) {
    const leadId = email.lead_id
    const time = emailTime(email)

    if (email.direction === 'outbound') {
      totalOutbound++
      contactedLeadIds.add(leadId)
      firstOutboundByLead.set(leadId, earlierEmail(firstOutboundByLead.get(leadId), email))
      addDate(outboundDatesByLead, leadId, time)
      channelStats.email.touchpoints++
      channelStats.email.leads.add(leadId)

      const cta = email.cta_type || ''
      if (ctaLeadsSent[cta]) ctaLeadsSent[cta].add(leadId)

      for (let index = 0; index < weekWindows.length; index++) {
        const window = weekWindows[index]
        if (time >= window.start && time < window.end) {
          weeklyCounts[index]++
          break
        }
      }
    } else if (email.direction === 'inbound') {
      totalInbound++
      inboundLeadIds.add(leadId)
      firstInboundByLead.set(leadId, earlierEmail(firstInboundByLead.get(leadId), email))
    }
  }

  for (const interaction of interactions) {
    const channel = interaction.channel || ''
    if (channelStats[channel]) {
      channelStats[channel].touchpoints++
      channelStats[channel].leads.add(interaction.lead_id)
    }
    if (interaction.occurred_at) {
      addDate(interactionDatesByLead, interaction.lead_id, new Date(interaction.occurred_at).getTime())
    }
  }

  const leadsWithReplySet = new Set<string>()
  inboundLeadIds.forEach((leadId) => {
    if (contactedLeadIds.has(leadId)) leadsWithReplySet.add(leadId)
  })

  const replyRateByType: Record<string, { contacted: number; replied: number; rate: number }> = {}
  for (const type of LEAD_TYPES) {
    replyRateByType[type] = { contacted: 0, replied: 0, rate: 0 }
  }

  const byType = { customers: 0, investors: 0, partnerships: 0 }
  const sourceCounts: Record<string, number> = {}
  const funnelCounts = { email_sent: 0, replied: 0, meeting_booked: 0, closed_won: 0 }
  let meetingsBooked = 0

  for (const lead of leads) {
    if (lead.type === 'customer') byType.customers++
    else if (lead.type === 'investor') byType.investors++
    else if (lead.type === 'partnership') byType.partnerships++

    const typeStats = lead.type ? replyRateByType[lead.type] : undefined
    if (typeStats && contactedLeadIds.has(lead.id)) typeStats.contacted++
    if (typeStats && leadsWithReplySet.has(lead.id)) typeStats.replied++

    const stage = lead.stage || ''
    if (OUTREACH_FUNNEL_STAGES.has(stage)) funnelCounts.email_sent++
    if (REPLY_FUNNEL_STAGES.has(stage)) funnelCounts.replied++
    if (MEETING_FUNNEL_STAGES.has(stage)) funnelCounts.meeting_booked++
    if (stage === 'closed_won') funnelCounts.closed_won++
    if (MEETING_FUNNEL_STAGES.has(stage)) meetingsBooked++

    if (lead.source) sourceCounts[lead.source] = (sourceCounts[lead.source] || 0) + 1
  }

  for (const type of LEAD_TYPES) {
    const stats = replyRateByType[type]
    stats.rate = stats.contacted > 0 ? (stats.replied / stats.contacted) * 100 : 0
  }

  const ctaPerformance: Record<string, { sent: number; replied: number; rate: number }> = {}
  for (const cta of CTA_TYPES) {
    let replied = 0
    ctaLeadsSent[cta].forEach((leadId) => {
      if (leadsWithReplySet.has(leadId)) replied++
    })
    const sent = ctaLeadsSent[cta].size
    ctaPerformance[cta] = { sent, replied, rate: sent > 0 ? (replied / sent) * 100 : 0 }
  }

  const touchpointsToReply: number[] = []
  const replyDayBuckets: Record<string, number> = {
    '0-1': 0,
    '2-3': 0,
    '4-7': 0,
    '8-14': 0,
    '15+': 0,
  }

  leadsWithReplySet.forEach((leadId) => {
    const firstInbound = firstInboundByLead.get(leadId)
    const firstOutbound = firstOutboundByLead.get(leadId)
    if (!firstInbound || !firstOutbound) return

    const firstInboundTime = emailTime(firstInbound)
    const outboundBefore = countAtOrBefore(outboundDatesByLead.get(leadId), firstInboundTime)
    const interactionsBefore = countAtOrBefore(interactionDatesByLead.get(leadId), firstInboundTime)
    touchpointsToReply.push(outboundBefore + interactionsBefore)

    const days = Math.max(0, (firstInboundTime - emailTime(firstOutbound)) / 86400000)
    if (days <= 1) replyDayBuckets['0-1']++
    else if (days <= 3) replyDayBuckets['2-3']++
    else if (days <= 7) replyDayBuckets['4-7']++
    else if (days <= 14) replyDayBuckets['8-14']++
    else replyDayBuckets['15+']++
  })

  const avgTouchpoints = touchpointsToReply.length > 0
    ? touchpointsToReply.reduce((sum, count) => sum + count, 0) / touchpointsToReply.length
    : 0

  return {
    totalLeads: leads.length,
    totalOutbound,
    totalInbound,
    leadsContacted: contactedLeadIds.size,
    leadsWithReplies: leadsWithReplySet.size,
    replyRate: contactedLeadIds.size > 0 ? (leadsWithReplySet.size / contactedLeadIds.size) * 100 : 0,
    meetingsBooked,
    funnel: [
      { stage: 'email_sent', count: funnelCounts.email_sent },
      { stage: 'replied', count: funnelCounts.replied },
      { stage: 'meeting_booked', count: funnelCounts.meeting_booked },
      { stage: 'closed_won', count: funnelCounts.closed_won },
    ],
    replyRateByType,
    ctaPerformance,
    avgTouchpointsToReply: Math.round(avgTouchpoints * 10) / 10,
    channelPerformance: CHANNELS.map(channel => ({
      channel,
      touchpoints: channelStats[channel].touchpoints,
      leadsReached: channelStats[channel].leads.size,
    })).filter(channel => channel.touchpoints > 0),
    replyDayBuckets,
    weeklyTrend: weeklyCounts.map((count, index) => {
      const weekStart = new Date(weekWindows[index].start)
      return {
        week: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count,
      }
    }),
    byType,
    bySource: Object.entries(sourceCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
  }
}
