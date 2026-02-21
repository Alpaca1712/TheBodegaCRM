'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Workflow, Plus, Play, Pause, Trash2, MoreHorizontal,
  UserPlus, RefreshCw, PlusCircle, ArrowRight, Trophy,
  XCircle, CheckCircle2, Tag, Zap, Calendar, Edit, Bell, Handshake,
  Loader2,
} from 'lucide-react'
import { getAutomations, updateAutomation, deleteAutomation, TRIGGER_CONFIG, type Automation } from '@/lib/api/automations'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

const TRIGGER_ICONS: Record<string, React.ReactNode> = {
  'user-plus': <UserPlus size={14} />,
  'refresh-cw': <RefreshCw size={14} />,
  'plus-circle': <PlusCircle size={14} />,
  'arrow-right': <ArrowRight size={14} />,
  'trophy': <Trophy size={14} />,
  'x-circle': <XCircle size={14} />,
  'check-circle': <CheckCircle2 size={14} />,
  'tag': <Tag size={14} />,
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  'calendar': <Calendar size={12} />,
  'edit': <Edit size={12} />,
  'bell': <Bell size={12} />,
  'zap': <Zap size={12} />,
  'tag': <Tag size={12} />,
  'handshake': <Handshake size={12} />,
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const result = await getAutomations()
      if (!result.error) setAutomations(result.data)
      setLoading(false)
    }
    load()
  }, [])

  const handleToggle = async (auto: Automation) => {
    const result = await updateAutomation(auto.id, { is_active: !auto.is_active })
    if (result.error) toast.error(result.error)
    else {
      setAutomations(prev => prev.map(a => a.id === auto.id ? { ...a, is_active: !a.is_active } : a))
      toast.success(`Automation ${!auto.is_active ? 'activated' : 'paused'}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this automation?')) return
    const result = await deleteAutomation(id)
    if (result.error) toast.error(result.error)
    else {
      setAutomations(prev => prev.filter(a => a.id !== id))
      toast.success('Automation deleted')
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Automations</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Set up workflows that trigger automatically
          </p>
        </div>
        <Link
          href="/automations/new"
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 shadow-sm shadow-indigo-600/20 transition-colors"
        >
          <Plus size={14} /> New Automation
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-zinc-400 animate-spin" />
        </div>
      ) : automations.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
          <Workflow className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">No automations yet</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mb-6">
            Automate your workflow with triggers and actions. For example: &quot;When a deal is won, create a follow-up task.&quot;
          </p>
          <Link
            href="/automations/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 shadow-sm shadow-indigo-600/20 transition-colors"
          >
            <Plus size={14} /> Create your first automation
          </Link>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3 text-left max-w-2xl mx-auto">
            {[
              { trigger: 'Deal Won', action: 'Create follow-up task', icon: <Trophy size={14} className="text-emerald-500" /> },
              { trigger: 'Contact Created', action: 'Enroll in welcome sequence', icon: <UserPlus size={14} className="text-blue-500" /> },
              { trigger: 'Deal Stage Changed', action: 'Send notification', icon: <ArrowRight size={14} className="text-amber-500" /> },
            ].map((ex, i) => (
              <div key={i} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2 mb-1.5">
                  {ex.icon}
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">When</span>
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{ex.trigger}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight size={10} className="text-zinc-300" />
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Then</span>
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{ex.action}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map((auto) => {
            const trigger = TRIGGER_CONFIG[auto.trigger_type]
            return (
              <div key={auto.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    auto.is_active ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'
                  }`}>
                    {TRIGGER_ICONS[trigger.icon] || <Workflow size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{auto.name}</h3>
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                        auto.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500'
                      }`}>
                        {auto.is_active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{trigger.label}</span>
                      <ArrowRight size={10} className="text-zinc-300 dark:text-zinc-600" />
                      <div className="flex items-center gap-1">
                        {auto.actions.map((action, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md">
                            {ACTION_ICONS[(action as { type: string; config: Record<string, unknown> }).type === 'create_activity' ? 'calendar' : 'bell'] || <Zap size={10} />}
                            {(action as { type: string; config: Record<string, unknown> }).type.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                    {auto.runs_count > 0 && (
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Ran {auto.runs_count} time{auto.runs_count !== 1 ? 's' : ''}
                        {auto.last_run_at && ` · Last: ${new Date(auto.last_run_at).toLocaleDateString()}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggle(auto)}
                      className={`p-2 rounded-lg transition-colors ${
                        auto.is_active ? 'hover:bg-amber-50 text-amber-600 dark:hover:bg-amber-950' : 'hover:bg-emerald-50 text-emerald-600 dark:hover:bg-emerald-950'
                      }`}
                      title={auto.is_active ? 'Pause' : 'Activate'}
                    >
                      {auto.is_active ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400">
                          <MoreHorizontal size={14} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(auto.id)}>
                          <Trash2 size={13} className="mr-1.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
