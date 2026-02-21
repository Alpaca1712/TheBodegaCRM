'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Trash2, GripVertical, Mail, Linkedin, Phone,
  CheckSquare, Sparkles, ChevronDown, ChevronUp,
} from 'lucide-react'
import Link from 'next/link'
import { useCreateSequence } from '@/hooks/use-sequences'
import { toast } from 'sonner'

type Channel = 'email' | 'linkedin' | 'call' | 'task'

interface StepDraft {
  id: string
  channel: Channel
  delay_days: number
  subject_template: string
  body_template: string
  ai_personalization: boolean
  ai_prompt: string
  expanded: boolean
}

const channelConfig: Record<Channel, { label: string; icon: typeof Mail; color: string }> = {
  email: { label: 'Email', icon: Mail, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400' },
  call: { label: 'Call', icon: Phone, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400' },
  task: { label: 'Task', icon: CheckSquare, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400' },
}

const TEMPLATES = [
  {
    name: 'Cold Outreach (SMYKM)',
    description: 'Samantha McKenna\'s "Show Me You Know Me" 5-touch sequence',
    steps: [
      { channel: 'email' as Channel, delay_days: 0, subject_template: '', body_template: '', ai_personalization: true, ai_prompt: 'Opening email: Research the prospect and lead with something specific about them or their company. Show you did your homework. One clear CTA.' },
      { channel: 'linkedin' as Channel, delay_days: 2, subject_template: '', body_template: '', ai_personalization: true, ai_prompt: 'LinkedIn connection request: Reference the email or something specific about their profile. Keep under 300 characters.' },
      { channel: 'email' as Channel, delay_days: 4, subject_template: '', body_template: '', ai_personalization: true, ai_prompt: 'Value-add follow-up: Share a specific insight, case study, or data point relevant to their industry. No pitch, just value.' },
      { channel: 'call' as Channel, delay_days: 7, subject_template: '', body_template: '', ai_personalization: true, ai_prompt: 'Discovery call: Prepare a brief script that references previous touches and asks a provocative question about their biggest challenge.' },
      { channel: 'email' as Channel, delay_days: 10, subject_template: '', body_template: '', ai_personalization: true, ai_prompt: 'Breakup email: Graceful close that summarizes value offered and leaves the door open. Short, human, no guilt-tripping.' },
    ],
  },
  {
    name: 'Warm Follow-Up',
    description: 'For leads who showed interest but went quiet',
    steps: [
      { channel: 'email' as Channel, delay_days: 0, subject_template: '', body_template: '', ai_personalization: true, ai_prompt: 'Re-engagement: Reference the previous interaction and share something new/relevant to restart the conversation.' },
      { channel: 'linkedin' as Channel, delay_days: 3, subject_template: '', body_template: '', ai_personalization: true, ai_prompt: 'LinkedIn touchpoint: Share a relevant article or insight, tag them or comment on their recent post.' },
      { channel: 'email' as Channel, delay_days: 7, subject_template: '', body_template: '', ai_personalization: true, ai_prompt: 'Direct value offer: Propose a specific next step or share a relevant resource that solves a problem they mentioned.' },
    ],
  },
  {
    name: 'Post-Demo Nurture',
    description: 'Keep momentum after a product demo',
    steps: [
      { channel: 'email' as Channel, delay_days: 0, subject_template: '', body_template: '', ai_personalization: true, ai_prompt: 'Thank-you email: Reference specific things discussed in the demo. Include next steps and any resources promised.' },
      { channel: 'task' as Channel, delay_days: 2, subject_template: '', body_template: '', ai_personalization: false, ai_prompt: 'Internal task: Send the custom proposal or pricing document.' },
      { channel: 'email' as Channel, delay_days: 4, subject_template: '', body_template: '', ai_personalization: true, ai_prompt: 'Case study share: Send a relevant customer success story from their industry.' },
      { channel: 'call' as Channel, delay_days: 7, subject_template: '', body_template: '', ai_personalization: true, ai_prompt: 'Check-in call: Ask about internal discussions, address any concerns, propose timeline.' },
    ],
  },
]

let stepIdCounter = 0
function makeStepId() { return `step_${++stepIdCounter}_${Date.now()}` }

export default function NewSequencePage() {
  const router = useRouter()
  const createMutation = useCreateSequence()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState<StepDraft[]>([])
  const [saving, setSaving] = useState(false)

  const addStep = (channel: Channel = 'email') => {
    const lastStep = steps[steps.length - 1]
    setSteps([...steps, {
      id: makeStepId(),
      channel,
      delay_days: lastStep ? lastStep.delay_days + 3 : 0,
      subject_template: '',
      body_template: '',
      ai_personalization: true,
      ai_prompt: '',
      expanded: true,
    }])
  }

  const removeStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id))
  }

  const updateStep = (id: string, updates: Partial<StepDraft>) => {
    setSteps(steps.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const applyTemplate = (template: typeof TEMPLATES[0]) => {
    setName(template.name)
    setDescription(template.description)
    setSteps(template.steps.map((s, i) => ({
      id: makeStepId(),
      ...s,
      expanded: i === 0,
    })))
  }

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Sequence name is required'); return }
    if (steps.length === 0) { toast.error('Add at least one step'); return }

    setSaving(true)
    const result = await createMutation.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      steps: steps.map((s, i) => ({
        step_number: i + 1,
        channel: s.channel,
        delay_days: s.delay_days,
        subject_template: s.subject_template || undefined,
        body_template: s.body_template || undefined,
        ai_personalization: s.ai_personalization,
        ai_prompt: s.ai_prompt || undefined,
      })),
    })

    if (result.error) {
      toast.error(result.error)
      setSaving(false)
    } else {
      toast.success('Sequence created')
      router.push(`/sequences/${result.data?.id}`)
    }
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/sequences" className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">New Sequence</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Build a multi-channel outreach cadence with AI personalization</p>
        </div>
      </div>

      {/* Templates */}
      {steps.length === 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">Start from a template</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.name}
                onClick={() => applyTemplate(t)}
                className="text-left p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{t.name}</p>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.description}</p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2">{t.steps.length} steps</p>
              </button>
            ))}
          </div>
          <div className="mt-4 text-center">
            <button onClick={() => addStep()} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              Or start from scratch
            </button>
          </div>
        </div>
      )}

      {/* Sequence details */}
      {(steps.length > 0 || name) && (
        <>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Sequence Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., Cold Outreach - SaaS Founders"
                  className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Description</label>
                <input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description of this sequence"
                  className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3 mb-6">
            {steps.map((step, idx) => {
              const config = channelConfig[step.channel]
              const Icon = config.icon
              return (
                <div key={step.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  {/* Step header */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    onClick={() => updateStep(step.id, { expanded: !step.expanded })}
                  >
                    <GripVertical size={14} className="text-zinc-300 dark:text-zinc-600" />
                    <div className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${config.color}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Step {idx + 1}</span>
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">{config.label}</span>
                        {step.ai_personalization && (
                          <span className="flex items-center gap-0.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded">
                            <Sparkles size={9} /> AI
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {step.delay_days === 0 ? 'Immediately' : `Wait ${step.delay_days} day${step.delay_days !== 1 ? 's' : ''}`}
                        {step.ai_prompt ? ` · ${step.ai_prompt.slice(0, 60)}...` : ''}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeStep(step.id) }}
                      className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    {step.expanded ? <ChevronUp size={14} className="text-zinc-400" /> : <ChevronDown size={14} className="text-zinc-400" />}
                  </div>

                  {/* Step body */}
                  {step.expanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Channel</label>
                          <select
                            value={step.channel}
                            onChange={e => updateStep(step.id, { channel: e.target.value as Channel })}
                            className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg dark:text-white"
                          >
                            {Object.entries(channelConfig).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Delay (days)</label>
                          <input
                            type="number"
                            min={0}
                            value={step.delay_days}
                            onChange={e => updateStep(step.id, { delay_days: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={step.ai_personalization}
                            onChange={e => updateStep(step.id, { ai_personalization: e.target.checked })}
                            className="h-3.5 w-3.5 text-indigo-600 rounded"
                          />
                          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                            <Sparkles size={11} className="text-indigo-500" />
                            AI Personalization (SMYKM)
                          </span>
                        </label>
                      </div>

                      {step.ai_personalization && (
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">AI Instructions</label>
                          <textarea
                            value={step.ai_prompt}
                            onChange={e => updateStep(step.id, { ai_prompt: e.target.value })}
                            placeholder="e.g., Opening email: Lead with something specific about their company's recent product launch. One clear CTA."
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg dark:text-white resize-none"
                          />
                        </div>
                      )}

                      {(step.channel === 'email' && !step.ai_personalization) && (
                        <>
                          <div className="mb-3">
                            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Subject</label>
                            <input
                              value={step.subject_template}
                              onChange={e => updateStep(step.id, { subject_template: e.target.value })}
                              placeholder="Subject line (use {{first_name}}, {{company}} for variables)"
                              className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Body</label>
                            <textarea
                              value={step.body_template}
                              onChange={e => updateStep(step.id, { body_template: e.target.value })}
                              placeholder="Email body..."
                              rows={4}
                              className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg dark:text-white resize-none"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add step */}
          <div className="flex items-center gap-2 mb-8">
            {Object.entries(channelConfig).map(([key, cfg]) => {
              const Icon = cfg.icon
              return (
                <button
                  key={key}
                  onClick={() => addStep(key as Channel)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <Plus size={12} /> <Icon size={12} /> {cfg.label}
                </button>
              )
            })}
          </div>

          {/* Save */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || steps.length === 0}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 shadow-sm shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Creating...' : 'Create Sequence'}
            </button>
            <Link href="/sequences" className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors">
              Cancel
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
