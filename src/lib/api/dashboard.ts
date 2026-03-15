import { createClient } from '@/lib/supabase/client'

export interface DashboardStats {
  totalLeads: number
  emailsSent: number
  replies: number
  meetingsBooked: number
  replyRate: number
  leadsByType: { customers: number; investors: number; partnerships: number }
  leadsByStage: Record<string, number>
  recentLeads: Array<{
    id: string
    contact_name: string
    company_name: string
    type: string
    stage: string
    created_at: string
  }>
  followUpsDue: number
}

export interface NotificationBadges {
  followUpsDue: number
  unreplied: number
}

export async function getDashboardStats(): Promise<{ data: DashboardStats | null; error: string | null }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) return { data: null, error: 'Not authenticated' }

  try {
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, type, stage, contact_name, company_name, created_at, last_contacted_at')
      .eq('user_id', session.user.id)

    if (leadsError) return { data: null, error: leadsError.message }

    const allLeads = leads || []

    const { count: emailsSent } = await supabase
      .from('lead_emails')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .not('sent_at', 'is', null)

    const leadsByStage: Record<string, number> = {}
    allLeads.forEach(l => {
      leadsByStage[l.stage] = (leadsByStage[l.stage] || 0) + 1
    })

    const replies = allLeads.filter(l => l.stage === 'replied').length
    const meetings = allLeads.filter(l =>
      l.stage === 'meeting_booked' || l.stage === 'meeting_held'
    ).length
    const totalWithEmail = allLeads.filter(l =>
      l.stage !== 'researched' && l.stage !== 'email_drafted'
    ).length

    const now = new Date()
    const followUpsDue = allLeads.filter(l => {
      if (!['email_sent', 'follow_up', 'no_response'].includes(l.stage)) return false
      if (!l.last_contacted_at) return true
      const daysSince = (now.getTime() - new Date(l.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24)
      return daysSince >= 3
    }).length

    const recentLeads = allLeads
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map(l => ({
        id: l.id,
        contact_name: l.contact_name,
        company_name: l.company_name,
        type: l.type,
        stage: l.stage,
        created_at: l.created_at,
      }))

    return {
      data: {
        totalLeads: allLeads.length,
        emailsSent: emailsSent || 0,
        replies,
        meetingsBooked: meetings,
        replyRate: totalWithEmail > 0 ? (replies / totalWithEmail) * 100 : 0,
        leadsByType: {
          customers: allLeads.filter(l => l.type === 'customer').length,
          investors: allLeads.filter(l => l.type === 'investor').length,
          partnerships: allLeads.filter(l => l.type === 'partnership').length,
        },
        leadsByStage,
        recentLeads,
        followUpsDue,
      },
      error: null,
    }
  } catch (error) {
    console.error('Unexpected error in getDashboardStats:', error)
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function getNotificationBadges(): Promise<{ data: NotificationBadges | null; error: string | null }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) return { data: null, error: 'Not authenticated' }

  try {
    const { data: leads } = await supabase
      .from('leads')
      .select('stage, last_contacted_at')
      .eq('user_id', session.user.id)
      .in('stage', ['email_sent', 'follow_up', 'no_response'])

    const now = new Date()
    const followUpsDue = (leads || []).filter(l => {
      if (!l.last_contacted_at) return true
      const daysSince = (now.getTime() - new Date(l.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24)
      return daysSince >= 3
    }).length

    const { count: unreplied } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('stage', 'no_response')

    return {
      data: { followUpsDue, unreplied: unreplied || 0 },
      error: null,
    }
  } catch (error) {
    console.error('Unexpected error in getNotificationBadges:', error)
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
