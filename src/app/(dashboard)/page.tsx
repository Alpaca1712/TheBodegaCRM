'use client'

import { useEffect, useState } from 'react'
import { Users, DollarSign, Target, Calendar, TrendingUp, Clock } from 'lucide-react'
import { getDashboardStats } from '@/lib/api/dashboard'
import KpiCard from '@/components/dashboard/kpi-card'
import PipelineChart from '@/components/dashboard/pipeline-chart'
import RecentActivity from '@/components/dashboard/recent-activity'
import { DashboardStats } from '@/lib/api/dashboard'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await getDashboardStats()
      
      if (error) {
        setError(error)
      } else {
        setStats(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow p-6 animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-slate-200 rounded-lg h-10 w-10"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                <div className="h-8 bg-slate-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-6 animate-pulse h-64"></div>
          <div className="bg-white rounded-xl shadow p-6 animate-pulse h-64"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error loading dashboard</h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadDashboardData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const pipelineData = stats ? Object.entries(stats.dealsByStage).map(([stage, count]) => {
    // Calculate value for this stage (approximate: total value * (count/total deals))
    const totalDeals = Object.values(stats.dealsByStage).reduce((sum, c) => sum + c, 0)
    const stageValue = totalDeals > 0 ? (stats.totalDealValue * (count / totalDeals)) : 0
    
    const color = {
      lead: 'lead',
      qualified: 'qualified',
      proposal: 'proposal',
      negotiation: 'negotiation',
      closed_won: 'closed_won',
      closed_lost: 'closed_lost'
    }[stage] || 'lead'

    return {
      stage,
      value: Math.round(stageValue),
      count,
      color
    }
  }) : []

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <div className="text-sm text-slate-500">
          Welcome back! Here&apos;s what&apos;s happening with your CRM.
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard
          title="Total Contacts"
          value={stats?.totalContacts.toLocaleString() || '0'}
          icon={Users}
          trend="up"
          trendValue={`+${stats?.newContactsThisMonth || 0} this month`}
        />
        <KpiCard
          title="Total Pipeline Value"
          value={`$${stats?.totalDealValue.toLocaleString() || '0'}`}
          icon={DollarSign}
          trend="up"
          trendValue={`$${stats?.revenueWonThisMonth.toLocaleString() || '0'} won this month`}
        />
        <KpiCard
          title="Conversion Rate"
          value={`${stats ? stats.conversionRate.toFixed(1) : '0'}%`}
          icon={Target}
          trend={stats && stats.conversionRate > 25 ? 'up' : stats && stats.conversionRate < 10 ? 'down' : 'neutral'}
          description="Lead to won rate"
        />
        <KpiCard
          title="Tasks Due"
          value={stats?.upcomingTasks.length || 0}
          icon={Calendar}
          trend={stats && stats.upcomingTasks.length > 5 ? 'up' : 'neutral'}
          description="Upcoming tasks"
        />
      </div>

      {/* Charts & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <PipelineChart
          data={pipelineData}
          totalValue={stats?.totalDealValue || 0}
        />
        <RecentActivity
          activities={stats?.recentActivities || []}
        />
      </div>

      {/* Upcoming Tasks & New Contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Tasks */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Upcoming Tasks</h3>
            <Clock className="h-5 w-5 text-slate-400" />
          </div>
          
          {stats?.upcomingTasks && stats.upcomingTasks.length > 0 ? (
            <div className="space-y-4">
              {stats.upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{task.title}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      {task.contact_name && (
                        <span className="text-xs text-slate-500 truncate">
                          {task.contact_name}
                        </span>
                      )}
                      {task.company_name && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-500 truncate">
                            {task.company_name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-slate-500 whitespace-nowrap ml-4">
                    {new Date(task.due_date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              No upcoming tasks
            </div>
          )}
        </div>

        {/* Recent Performance */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Recent Performance</h3>
            <TrendingUp className="h-5 w-5 text-slate-400" />
          </div>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">New Contacts This Month</span>
                <span className="text-lg font-bold text-slate-900">
                  {stats?.newContactsThisMonth || 0}
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 rounded-full" 
                  style={{ 
                    width: `${stats && stats.totalContacts > 0 
                      ? Math.min((stats.newContactsThisMonth / stats.totalContacts) * 100, 100) 
                      : 0}%` 
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">Revenue Won This Month</span>
                <span className="text-lg font-bold text-slate-900">
                  ${(stats?.revenueWonThisMonth || 0).toLocaleString()}
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-600 rounded-full" 
                  style={{ 
                    width: `${stats && stats.totalDealValue > 0 
                      ? Math.min((stats.revenueWonThisMonth / stats.totalDealValue) * 100, 100) 
                      : 0}%` 
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">Deal Stages Distribution</span>
              </div>
              <div className="text-sm text-slate-500 space-y-2">
                {pipelineData.map((item) => (
                  <div key={item.stage} className="flex items-center justify-between">
                    <span className="truncate">
                      {item.stage === 'lead' ? 'Lead' : 
                       item.stage === 'qualified' ? 'Qualified' : 
                       item.stage === 'proposal' ? 'Proposal' : 
                       item.stage === 'negotiation' ? 'Negotiation' : 
                       item.stage === 'closed_won' ? 'Won' : 'Lost'}
                    </span>
                    <span className="font-medium">
                      {item.count} deal{item.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
