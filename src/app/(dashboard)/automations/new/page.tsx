'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, Plus, X, Trash2,
  UserPlus, RefreshCw, PlusCircle, Trophy, XCircle,
  CheckCircle2, Tag, Zap, Calendar, Edit, Bell, Handshake,
  Loader2,
} from 'lucide-react'
import {
  createAutomation,
  TRIGGER_CONFIG, ACTION_CONFIG,
  type TriggerType, type ActionType, type AutomationAction,
} from '@/lib/api/automations'
import { toast } from 'sonner'

const TRIGGER_ICONS: Record<string, React.ReactNode> = {
  'user-plus': <UserPlus size={16} />,
  'refresh-cw': <RefreshCw size={16} />,
  'plus-circle': <PlusCircle size={16} />,
  'arrow-right': <ArrowRight size={16} />,
  'trophy': <Trophy size={16} />,
  'x-circle': <XCircle size={16} />,
  'check-circle': <CheckCircle2 size={16} />,
  'tag': <Tag size={16} />,
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  'calendar': <Calendar size={16} />,
  'edit': <Edit size={16} />,
  'bell': <Bell size={16} />,
  'zap': <Zap size={16} />,
  'tag': <Tag size={16} />,
  'handshake': <Handshake size={16} />,
}

export default function NewAutomationPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerType, setTriggerType] = useState<TriggerType | null>(null)
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>({})
  const [actions, setActions] = useState<AutomationAction[]>([])
  const [saving, setSaving] = useState(false)
  const [showActionPicker, setShowActionPicker] = useState(false)

  const addAction = (type: ActionType) => {
    setActions([...actions, { type, config: {} }])
    setShowActionPicker(false)
  }

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index))
  }

  const updateActionConfig = (index: number, key: string, value: unknown) => {
    setActions(actions.map((a, i) => i === index ? { ...a, config: { ...a.config, [key]: value } } : a))
  }

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Name is required'); return }
    if (!triggerType) { toast.error('Select a trigger'); return }
    if (actions.length === 0) { toast.error('Add at least one action'); return }

    setSaving(true)
    const result = await createAutomation({
      name: name.trim(),
      description: description.trim() || undefined,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      actions,
    })

    if (result.error) {
      toast.error(result.error)
      setSaving(false)
    } else {
      toast.success('Automation created')
      router.push('/automations')
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/automations" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 mb-4">
        <ArrowLeft size={14} /> Automations
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">New Automation</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Set up a trigger and define what happens when it fires</p>
      </div>

      <div className="space-y-6">
        {/* Name & Description */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Automation name..."
            className="w-full text-lg font-semibold bg-transparent text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-600 focus:outline-none"
          />
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional description..."
            className="w-full text-sm bg-transparent text-zinc-600 dark:text-zinc-400 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 focus:outline-none"
          />
        </div>

        {/* Trigger */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">When this happens...</h2>
          </div>
          <div className="p-5">
            {triggerType ? (
              <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-950 rounded-xl border border-indigo-200 dark:border-indigo-800">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  {TRIGGER_ICONS[TRIGGER_CONFIG[triggerType].icon]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">{TRIGGER_CONFIG[triggerType].label}</p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400">{TRIGGER_CONFIG[triggerType].description}</p>
                </div>
                <button onClick={() => setTriggerType(null)} className="p-1 text-indigo-400 hover:text-indigo-600">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(TRIGGER_CONFIG) as [TriggerType, { label: string; description: string; icon: string }][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setTriggerType(key)}
                    className="flex items-center gap-2.5 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors text-left"
                  >
                    <div className="h-7 w-7 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 shrink-0">
                      {TRIGGER_ICONS[cfg.icon]}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{cfg.label}</p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{cfg.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {triggerType === 'contact_status_changed' && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-zinc-500">To status:</span>
                <select
                  value={(triggerConfig.to_status as string) || ''}
                  onChange={e => setTriggerConfig({ ...triggerConfig, to_status: e.target.value })}
                  className="px-2 py-1 text-xs border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-md dark:text-zinc-300"
                >
                  <option value="">Any</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="lead">Lead</option>
                </select>
              </div>
            )}

            {triggerType === 'deal_stage_changed' && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-zinc-500">To stage:</span>
                <select
                  value={(triggerConfig.to_stage as string) || ''}
                  onChange={e => setTriggerConfig({ ...triggerConfig, to_stage: e.target.value })}
                  className="px-2 py-1 text-xs border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-md dark:text-zinc-300"
                >
                  <option value="">Any</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="closed_won">Closed Won</option>
                  <option value="closed_lost">Closed Lost</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">...then do this</h2>
          </div>
          <div className="p-5 space-y-3">
            {actions.map((action, i) => {
              const cfg = ACTION_CONFIG[action.type]
              return (
                <div key={i} className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-950 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <div className="h-7 w-7 rounded-md bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                    {ACTION_ICONS[cfg.icon]}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">{cfg.label}</p>
                    {action.type === 'create_activity' && (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          placeholder="Activity title..."
                          value={(action.config.title as string) || ''}
                          onChange={e => updateActionConfig(i, 'title', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-emerald-950 rounded-md dark:text-zinc-300"
                        />
                        <select
                          value={(action.config.type as string) || 'task'}
                          onChange={e => updateActionConfig(i, 'type', e.target.value)}
                          className="px-2 py-1 text-xs border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-emerald-950 rounded-md dark:text-zinc-300"
                        >
                          <option value="task">Task</option>
                          <option value="call">Call</option>
                          <option value="email">Email</option>
                          <option value="meeting">Meeting</option>
                        </select>
                      </div>
                    )}
                    {action.type === 'update_contact_status' && (
                      <select
                        value={(action.config.new_status as string) || ''}
                        onChange={e => updateActionConfig(i, 'new_status', e.target.value)}
                        className="px-2 py-1 text-xs border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-emerald-950 rounded-md dark:text-zinc-300"
                      >
                        <option value="">Select status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="lead">Lead</option>
                      </select>
                    )}
                    {action.type === 'send_notification' && (
                      <input
                        type="text"
                        placeholder="Notification message..."
                        value={(action.config.message as string) || ''}
                        onChange={e => updateActionConfig(i, 'message', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-emerald-950 rounded-md dark:text-zinc-300"
                      />
                    )}
                    {action.type === 'add_tag' && (
                      <input
                        type="text"
                        placeholder="Tag name..."
                        value={(action.config.tag_name as string) || ''}
                        onChange={e => updateActionConfig(i, 'tag_name', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-emerald-950 rounded-md dark:text-zinc-300"
                      />
                    )}
                  </div>
                  <button onClick={() => removeAction(i)} className="p-1 text-emerald-400 hover:text-red-500">
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}

            {showActionPicker ? (
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(ACTION_CONFIG) as [ActionType, { label: string; description: string; icon: string }][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => addAction(key)}
                    className="flex items-center gap-2.5 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-colors text-left"
                  >
                    <div className="h-7 w-7 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 shrink-0">
                      {ACTION_ICONS[cfg.icon]}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{cfg.label}</p>
                    </div>
                  </button>
                ))}
                <button onClick={() => setShowActionPicker(false)} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowActionPicker(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl hover:border-indigo-400 hover:text-indigo-600 dark:hover:border-indigo-600 dark:hover:text-indigo-400 transition-colors w-full justify-center"
              >
                <Plus size={14} /> Add Action
              </button>
            )}
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center justify-between">
          <Link href="/automations" className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !triggerType || actions.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            {saving ? 'Creating...' : 'Create Automation'}
          </button>
        </div>
      </div>
    </div>
  )
}
