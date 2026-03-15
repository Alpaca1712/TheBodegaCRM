import { createClient } from '@/lib/supabase/client'

export interface AnalyticsData {
  totalLeads: number
  emailsSent: number
  replies: number
  meetingsBooked: number
  replyRate: number
  meetingConversionRate: number
  funnelData: Array<{ stage: string; count: number }>
  byType: { customers: number; investors: number }
  byPriority: Record<string, number>
  bySource: Array<{ source: string; count: number }>
}

export async function getAnalyticsData(): Promise<AnalyticsData> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('User not authenticated')

  const { data: leads } = await supabase
    .from('leads')
    .select('type, stage, priority, source')
    .eq('user_id', session.user.id)

  const { count: emailsSent } = await supabase
    .from('lead_emails')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .not('sent_at', 'is', null)

  const allLeads = leads || []

  const stages = [
    'researched', 'email_drafted', 'email_sent', 'replied',
    'meeting_booked', 'meeting_held', 'follow_up',
    'closed_won', 'closed_lost', 'no_response',
  ]

  const funnelData = stages.map(stage => ({
    stage,
    count: allLeads.filter(l => l.stage === stage).length,
  }))

  const replies = allLeads.filter(l => l.stage === 'replied').length
  const meetings = allLeads.filter(l =>
    l.stage === 'meeting_booked' || l.stage === 'meeting_held'
  ).length
  const contacted = allLeads.filter(l =>
    !['researched', 'email_drafted'].includes(l.stage)
  ).length

  const byPriority: Record<string, number> = {}
  allLeads.forEach(l => {
    byPriority[l.priority] = (byPriority[l.priority] || 0) + 1
  })

  const sourceMap: Record<string, number> = {}
  allLeads.forEach(l => {
    const src = l.source || 'Unknown'
    sourceMap[src] = (sourceMap[src] || 0) + 1
  })
  const bySource = Object.entries(sourceMap)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)

  return {
    totalLeads: allLeads.length,
    emailsSent: emailsSent || 0,
    replies,
    meetingsBooked: meetings,
    replyRate: contacted > 0 ? (replies / contacted) * 100 : 0,
    meetingConversionRate: contacted > 0 ? (meetings / contacted) * 100 : 0,
    funnelData,
    byType: {
      customers: allLeads.filter(l => l.type === 'customer').length,
      investors: allLeads.filter(l => l.type === 'investor').length,
    },
    byPriority,
    bySource,
  }
}
