import { createClient } from '@/lib/supabase/client'
import { getActiveOrgId } from '@/lib/api/organizations'
import { getInvestorStats } from './investors'

export interface NotificationBadges {
  overdueTasks: number
  staleDeals: number
}

export interface DashboardStats {
  totalContacts: number
  totalDealValue: number
  dealsByStage: Record<string, number>
  conversionRate: number
  recentActivities: Array<{
    id: string
    type: 'call' | 'email' | 'meeting' | 'task' | 'note'
    title: string
    description: string | null
    contact_name?: string
    company_name?: string
    created_at: string
  }>
  upcomingTasks: Array<{
    id: string
    title: string
    due_date: string
    contact_name?: string
    company_name?: string
    completed: boolean
  }>
  newContactsThisMonth: number
  revenueWonThisMonth: number
  // Investor stats
  totalRaised: number
  totalPipeline: number
  activeConversations: number
  totalInvestments: number
}

export async function getDashboardStats(): Promise<{ data: DashboardStats | null; error: string | null }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { data: null, error: 'Not authenticated' }
  }

  const orgId = await getActiveOrgId()
  if (!orgId) return { data: null, error: 'No organization found' }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  try {
    // Get total contacts
    const { count: totalContacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId!)

    if (contactsError) {
      console.error('Error fetching total contacts:', contactsError)
      return { data: null, error: `Contacts error: ${contactsError.message}` }
    }

    // Get total deal value
    const { data: dealsData, error: dealsError } = await supabase
      .from('deals')
      .select('value, stage')
      .eq('org_id', orgId!)

    if (dealsError) {
      console.error('Error fetching deals:', dealsError)
      return { data: null, error: `Deals error: ${dealsError.message}` }
    }

    // Calculate total deal value and deals by stage
    let totalDealValue = 0
    const dealsByStage: Record<string, number> = {}
    
    dealsData?.forEach(deal => {
      totalDealValue += deal.value || 0
      const stage = deal.stage
      dealsByStage[stage] = (dealsByStage[stage] || 0) + 1
    })

    // Calculate conversion rate (closed_won / total deals)
    const totalDeals = dealsData?.length || 0
    const closedWonDeals = dealsData?.filter(d => d.stage === 'closed_won').length || 0
    const conversionRate = totalDeals > 0 ? (closedWonDeals / totalDeals) * 100 : 0

    // Get recent activities (last 10)
    const { data: recentActivities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        type,
        title,
        description,
        contact_id,
        company_id,
        created_at
      `)
      .eq('org_id', orgId!)
      .order('created_at', { ascending: false })
      .limit(10)

    if (activitiesError) {
      console.error('Error fetching recent activities:', activitiesError)
      return { data: null, error: `Activities error: ${activitiesError.message}` }
    }

    // Get upcoming tasks (incomplete tasks with due_date >= today)
    const { data: upcomingTasks, error: tasksError } = await supabase
      .from('activities')
      .select(`
        id,
        title,
        due_date,
        contact_id,
        company_id,
        completed
      `)
      .eq('org_id', orgId!)
      .eq('type', 'task')
      .eq('completed', false)
      .gte('due_date', startOfDay)
      .order('due_date', { ascending: true })
      .limit(10)

    if (tasksError) {
      console.error('Error fetching upcoming tasks:', tasksError)
      return { data: null, error: `Tasks error: ${tasksError.message}` }
    }

    // Get new contacts this month
    const { count: newContactsThisMonth, error: newContactsError } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId!)
      .gte('created_at', startOfMonth)

    if (newContactsError) {
      console.error('Error fetching new contacts:', newContactsError)
      return { data: null, error: `New contacts error: ${newContactsError.message}` }
    }

    // Get revenue won this month (closed_won deals created this month)
    const { data: revenueWonData, error: revenueError } = await supabase
      .from('deals')
      .select('value')
      .eq('org_id', orgId!)
      .eq('stage', 'closed_won')
      .gte('created_at', startOfMonth)

    if (revenueError) {
      console.error('Error fetching revenue won:', revenueError)
      return { data: null, error: `Revenue error: ${revenueError.message}` }
    }

    const revenueWonThisMonth = revenueWonData?.reduce((sum, deal) => sum + (deal.value || 0), 0) || 0

    // Get investor stats
    const { data: investorStats, error: investorStatsError } = await getInvestorStats()
    if (investorStatsError) {
      console.error('Error fetching investor stats:', investorStatsError)
      // Continue with default values
    }

    // Enhance activities and tasks with contact/company names
    const enhancedActivities = await Promise.all(
      (recentActivities || []).map(async (activity) => {
        let contactName: string | undefined
        let companyName: string | undefined

        if (activity.contact_id) {
          const { data: contact } = await supabase
            .from('contacts')
            .select('first_name, last_name')
            .eq('id', activity.contact_id)
            .single()
          
          if (contact) {
            contactName = `${contact.first_name} ${contact.last_name}`
          }
        }

        if (activity.company_id) {
          const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('id', activity.company_id)
            .single()
          
          if (company) {
            companyName = company.name
          }
        }

        return {
          ...activity,
          contact_name: contactName,
          company_name: companyName
        }
      })
    )

    const enhancedTasks = await Promise.all(
      (upcomingTasks || []).map(async (task) => {
        let contactName: string | undefined
        let companyName: string | undefined

        if (task.contact_id) {
          const { data: contact } = await supabase
            .from('contacts')
            .select('first_name, last_name')
            .eq('id', task.contact_id)
            .single()
          
          if (contact) {
            contactName = `${contact.first_name} ${contact.last_name}`
          }
        }

        if (task.company_id) {
          const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('id', task.company_id)
            .single()
          
          if (company) {
            companyName = company.name
          }
        }

        return {
          ...task,
          contact_name: contactName,
          company_name: companyName
        }
      })
    )

    const dashboardStats: DashboardStats = {
      totalContacts: totalContacts || 0,
      totalDealValue,
      dealsByStage,
      conversionRate,
      recentActivities: enhancedActivities,
      upcomingTasks: enhancedTasks,
      newContactsThisMonth: newContactsThisMonth || 0,
      revenueWonThisMonth,
      // Investor stats with fallback defaults
      totalRaised: investorStats?.totalRaised || 0,
      totalPipeline: investorStats?.totalPipeline || 0,
      activeConversations: 0, // TODO: Calculate active conversations from recent investor activities
      totalInvestments: investorStats?.totalInvestments || 0
    }

    return { data: dashboardStats, error: null }
  } catch (error) {
    console.error('Unexpected error in getDashboardStats:', error)
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function getNotificationBadges(): Promise<{ data: NotificationBadges | null; error: string | null }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return { data: null, error: 'Not authenticated' }
  }

  const orgId = await getActiveOrgId()
  if (!orgId) return { data: null, error: 'No organization found' }

  const now = new Date()
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString()
  const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString()

  try {
    // Get overdue tasks (incomplete tasks with due_date < today)
    const { count: overdueTasksCount, error: overdueTasksError } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId!)
      .eq('type', 'task')
      .eq('completed', false)
      .lt('due_date', now.toISOString())

    if (overdueTasksError) {
      console.error('Error fetching overdue tasks:', overdueTasksError)
      return { data: null, error: `Overdue tasks error: ${overdueTasksError.message}` }
    }

    // Get stale deals (not updated in last 7 days AND not closed)
    const { count: staleDealsCount, error: staleDealsError } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId!)
      .not('stage', 'in', '("closed_won","closed_lost")')
      .lt('updated_at', sevenDaysAgo)

    if (staleDealsError) {
      console.error('Error fetching stale deals:', staleDealsError)
      return { data: null, error: `Stale deals error: ${staleDealsError.message}` }
    }

    const badges: NotificationBadges = {
      overdueTasks: overdueTasksCount || 0,
      staleDeals: staleDealsCount || 0
    }

    return { data: badges, error: null }
  } catch (error) {
    console.error('Unexpected error in getNotificationBadges:', error)
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
