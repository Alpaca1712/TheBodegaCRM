'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Users, DollarSign, Target, Handshake, Clock, AlertTriangle, ArrowRight,
  CheckCircle2, Phone, Mail, CalendarDays, MessageSquare, TrendingUp, Plus, Zap,
  ArrowUpRight, Sparkles,
} from 'lucide-react'
import { getDashboardStats, type DashboardStats } from '@/lib/api/dashboard'
import { updateActivity } from '@/lib/api/activities'
import { toast } from 'sonner'

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set())

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await getDashboardStats()
      if (error) setError(error)
      else setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const handleCompleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (completingTasks.has(taskId)) return

    setCompletingTasks(prev => new Set(prev).add(taskId))
    try {
      const result = await updateActivity(taskId, { completed: true, completed_at: new Date().toISOString() })
      if (result.error) {
        toast.error('Failed to complete task')
      } else {
        toast.success('Task completed')
        setStats(prev => {
          if (!prev) return prev
          return {
            ...prev,
            upcomingTasks: prev.upcomingTasks.map(t =>
              t.id === taskId ? { ...t, completed: true } : t
            ),
          }
        })
      }
    } catch {
      toast.error('Failed to complete task')
    } finally {
      setCompletingTasks(prev => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
    }
  }

  const navigateToEntity = (task: { contact_id?: string; deal_id?: string; company_id?: string }) => {
    if (task.deal_id) router.push(`/deals/${task.deal_id}`)
    else if (task.contact_id) router.push(`/contacts/${task.contact_id}`)
    else if (task.company_id) router.push(`/companies/${task.company_id}`)
  }

  const navigateToActivity = (activity: { id: string; contact_id?: string; deal_id?: string; company_id?: string }) => {
    if (activity.deal_id) router.push(`/deals/${activity.deal_id}`)
    else if (activity.contact_id) router.push(`/contacts/${activity.contact_id}`)
    else if (activity.company_id) router.push(`/companies/${activity.company_id}`)
    else router.push('/activities')
  }

  if (loading) return <DashboardSkeleton />

  if (error) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/30 p-8">
          <h3 className="text-base font-semibold text-red-800 dark:text-red-200 mb-1">Something went wrong</h3>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={loadDashboardData} className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
            Try again
          </button>
        </div>
      </div>
    )
  }

  const overdueTasks = stats?.upcomingTasks.filter(t => {
    const due = new Date(t.due_date)
    return due < new Date() && !t.completed
  }) || []

  const todayTasks = stats?.upcomingTasks.filter(t => {
    const due = new Date(t.due_date)
    const today = new Date()
    return due.toDateString() === today.toDateString() && !t.completed
  }) || []

  const upcomingTasks = stats?.upcomingTasks.filter(t => {
    const due = new Date(t.due_date)
    const today = new Date()
    return due > today && !t.completed
  }) || []

  const totalDeals = stats ? Object.values(stats.dealsByStage).reduce((s, c) => s + c, 0) : 0

  const pipelineStages = [
    { key: 'lead', label: 'Lead', color: 'bg-sky-500', ring: 'ring-sky-500/20' },
    { key: 'qualified', label: 'Qualified', color: 'bg-indigo-500', ring: 'ring-indigo-500/20' },
    { key: 'proposal', label: 'Proposal', color: 'bg-violet-500', ring: 'ring-violet-500/20' },
    { key: 'negotiation', label: 'Negotiation', color: 'bg-amber-500', ring: 'ring-amber-500/20' },
    { key: 'closed_won', label: 'Won', color: 'bg-emerald-500', ring: 'ring-emerald-500/20' },
    { key: 'closed_lost', label: 'Lost', color: 'bg-rose-500', ring: 'ring-rose-500/20' },
  ]

  const activityTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    call: Phone, email: Mail, meeting: CalendarDays, task: CheckCircle2, note: MessageSquare,
  }
  const activityTypeColors: Record<string, string> = {
    call: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50',
    email: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50',
    meeting: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50',
    task: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50',
    note: 'text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50',
  }

  const allActionTasks = [...overdueTasks, ...todayTasks, ...upcomingTasks.slice(0, 4)]
  const needsAttention = overdueTasks.length > 0 || todayTasks.length > 0

  return (
    <div className="max-w-5xl mx-auto">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Good {getGreeting()}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-[15px]">
          {needsAttention
            ? `You have ${overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : ''}${overdueTasks.length > 0 && todayTasks.length > 0 ? ' and ' : ''}${todayTasks.length > 0 ? `${todayTasks.length} due today` : ''}`
            : "You're all caught up. Here's your overview."}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <MetricCard
          label="Pipeline"
          value={`$${(stats?.totalDealValue || 0).toLocaleString()}`}
          sub={`${totalDeals} deal${totalDeals !== 1 ? 's' : ''}`}
          icon={DollarSign}
          accent="emerald"
        />
        <MetricCard
          label="Contacts"
          value={(stats?.totalContacts || 0).toLocaleString()}
          sub={`+${stats?.newContactsThisMonth || 0} this month`}
          icon={Users}
          accent="sky"
        />
        <MetricCard
          label="Win Rate"
          value={`${stats ? stats.conversionRate.toFixed(0) : '0'}%`}
          sub="lead to close"
          icon={Target}
          accent="violet"
        />
        <MetricCard
          label="Won"
          value={`$${(stats?.revenueWonThisMonth || 0).toLocaleString()}`}
          sub="this month"
          icon={TrendingUp}
          accent="amber"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        {/* Action Center */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                {needsAttention ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                    <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                )}
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Action Center</h2>
                {allActionTasks.length > 0 && (
                  <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 tabular-nums">{allActionTasks.length}</span>
                )}
              </div>
              <Link href="/activities" className="text-xs font-medium text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors flex items-center gap-1">
                All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {overdueTasks.map((task) => (
                <TaskRow key={task.id} task={task} variant="overdue" isCompleting={completingTasks.has(task.id)} onComplete={handleCompleteTask} onClick={() => navigateToEntity(task)} />
              ))}
              {todayTasks.map((task) => (
                <TaskRow key={task.id} task={task} variant="today" isCompleting={completingTasks.has(task.id)} onComplete={handleCompleteTask} onClick={() => navigateToEntity(task)} />
              ))}
              {upcomingTasks.slice(0, 4).map((task) => (
                <TaskRow key={task.id} task={task} variant="upcoming" isCompleting={completingTasks.has(task.id)} onComplete={handleCompleteTask} onClick={() => navigateToEntity(task)} />
              ))}

              {allActionTasks.length === 0 && (
                <div className="px-5 py-10 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 mx-auto mb-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">All clear</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">No pending tasks</p>
                  <Link href="/activities" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                    <Plus className="h-3 w-3" /> Create a task
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pipeline */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40">
                  <Handshake className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Pipeline</h2>
              </div>
              <Link href="/deals" className="text-xs font-medium text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors flex items-center gap-1">
                All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {totalDeals > 0 ? (
              <div className="p-5">
                {/* Mini bar chart */}
                <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-5">
                  {pipelineStages.map((stage) => {
                    const count = stats?.dealsByStage[stage.key] || 0
                    const width = totalDeals > 0 ? (count / totalDeals) * 100 : 0
                    if (width === 0) return null
                    return <div key={stage.key} className={`${stage.color} rounded-full transition-all duration-500`} style={{ width: `${width}%` }} title={`${stage.label}: ${count}`} />
                  })}
                </div>

                <div className="space-y-1.5">
                  {pipelineStages.map((stage) => {
                    const count = stats?.dealsByStage[stage.key] || 0
                    if (count === 0) return null
                    return (
                      <Link key={stage.key} href="/deals" className="flex items-center justify-between -mx-2 px-2 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-2 w-2 rounded-full ${stage.color}`} />
                          <span className="text-sm text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors">{stage.label}</span>
                        </div>
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">{count}</span>
                      </Link>
                    )
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">Total value</span>
                  <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">${(stats?.totalDealValue || 0).toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="p-5 text-center py-10">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 mx-auto mb-3">
                  <Handshake className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                </div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">No deals yet</p>
                <Link href="/deals/new" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                  <Plus className="h-3 w-3" /> Create your first deal
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recent Activity</h2>
          <Link href="/activities" className="text-xs font-medium text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors flex items-center gap-1">
            All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {stats?.recentActivities && stats.recentActivities.length > 0 ? (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {stats.recentActivities.slice(0, 6).map((activity) => {
              const Icon = activityTypeIcons[activity.type] || MessageSquare
              const colorClass = activityTypeColors[activity.type] || activityTypeColors.note
              return (
                <div
                  key={activity.id}
                  onClick={() => navigateToActivity(activity)}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{activity.title}</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
                      {activity.contact_name || activity.company_name || ''}
                      {activity.contact_name && activity.company_name ? ` at ${activity.company_name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums">
                      {formatRelativeDate(activity.created_at)}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-zinc-400 dark:text-zinc-500">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  )
}

function TaskRow({
  task,
  variant,
  isCompleting,
  onComplete,
  onClick,
}: {
  task: { id: string; title: string; due_date: string; contact_name?: string; completed?: boolean }
  variant: 'overdue' | 'today' | 'upcoming'
  isCompleting: boolean
  onComplete: (id: string, e: React.MouseEvent) => void
  onClick: () => void
}) {
  const configs = {
    overdue: {
      icon: <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />,
      dot: 'bg-rose-500',
      label: <span className="text-rose-500 font-medium">Overdue {formatRelativeDate(task.due_date)}</span>,
    },
    today: {
      icon: <Clock className="h-3.5 w-3.5 text-amber-500" />,
      dot: 'bg-amber-500',
      label: <span className="text-amber-600 dark:text-amber-400">Due today</span>,
    },
    upcoming: {
      icon: <Clock className="h-3.5 w-3.5 text-zinc-400" />,
      dot: 'bg-zinc-300 dark:bg-zinc-600',
      label: <span className="text-zinc-400 dark:text-zinc-500">{formatRelativeDate(task.due_date)}</span>,
    },
  }

  const { icon, label } = configs[variant]

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group ${task.completed ? 'opacity-40' : ''}`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate ${task.completed ? 'line-through' : ''} group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors`}>
          {task.title}
        </p>
        <p className="text-[11px]">
          {label}
          {task.contact_name ? <span className="text-zinc-400 dark:text-zinc-500"> &middot; {task.contact_name}</span> : ''}
        </p>
      </div>
      {!task.completed && (
        <button
          onClick={(e) => onComplete(task.id, e)}
          disabled={isCompleting}
          className="shrink-0 p-1.5 rounded-lg text-zinc-300 dark:text-zinc-600 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all opacity-0 group-hover:opacity-100"
          title="Complete task"
        >
          <CheckCircle2 className={`h-4 w-4 ${isCompleting ? 'animate-spin' : ''}`} />
        </button>
      )}
      {task.completed && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
    </div>
  )
}

type MetricAccent = 'emerald' | 'sky' | 'violet' | 'amber'

const accentStyles: Record<MetricAccent, { icon: string; gradient: string }> = {
  emerald: {
    icon: 'text-emerald-600 dark:text-emerald-400',
    gradient: 'from-emerald-50 to-white dark:from-emerald-950/20 dark:to-zinc-900',
  },
  sky: {
    icon: 'text-sky-600 dark:text-sky-400',
    gradient: 'from-sky-50 to-white dark:from-sky-950/20 dark:to-zinc-900',
  },
  violet: {
    icon: 'text-violet-600 dark:text-violet-400',
    gradient: 'from-violet-50 to-white dark:from-violet-950/20 dark:to-zinc-900',
  },
  amber: {
    icon: 'text-amber-600 dark:text-amber-400',
    gradient: 'from-amber-50 to-white dark:from-amber-950/20 dark:to-zinc-900',
  },
}

function MetricCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub: string; icon: React.ComponentType<{ className?: string }>; accent: MetricAccent
}) {
  const style = accentStyles[accent]
  return (
    <div className={`rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-linear-to-br ${style.gradient} p-4 transition-all hover:shadow-sm`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 shadow-sm ${style.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight tabular-nums leading-none">{value}</p>
      <div className="flex items-baseline gap-1.5 mt-1.5">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{sub}</span>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="h-7 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
        <div className="h-4 w-64 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg animate-pulse mt-2.5" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse mb-3" />
            <div className="h-7 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
            <div className="h-3 w-16 bg-zinc-100 dark:bg-zinc-800/50 rounded animate-pulse mt-2" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 h-72 animate-pulse" />
        <div className="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 h-72 animate-pulse" />
      </div>
    </div>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

function formatRelativeDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60))
  const isFuture = diffMs < 0
  if (diffHours < 1) return 'just now'
  if (diffHours < 24) return `${diffHours}h ${isFuture ? 'from now' : 'ago'}`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return isFuture ? 'tomorrow' : 'yesterday'
  if (diffDays < 7) return `${diffDays}d ${isFuture ? 'from now' : 'ago'}`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
