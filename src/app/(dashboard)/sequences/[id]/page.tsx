'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Play, Pause, Users, Mail, Linkedin, Phone, CheckSquare,
  Sparkles, UserPlus, MoreHorizontal, Clock, CheckCircle2, XCircle,
  MessageSquare, ChevronRight, Loader2,
} from 'lucide-react'
import { useSequence, useSequenceStats, useStepExecutionStats, useEnrollments, useUpdateSequence, useEnrollContacts, useUpdateEnrollmentStatus } from '@/hooks/use-sequences'
import { getContacts, type Contact } from '@/lib/api/contacts'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetHeader, SheetBody, SheetFooter } from '@/components/ui/sheet'
import { toast } from 'sonner'
import type { SequenceEnrollment, SequenceStep } from '@/lib/api/sequences'

const channelIcons: Record<string, typeof Mail> = {
  email: Mail, linkedin: Linkedin, call: Phone, task: CheckSquare,
}
const channelColors: Record<string, string> = {
  email: 'text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400',
  linkedin: 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400',
  call: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400',
  task: 'text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400',
}
const enrollmentStatusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
  paused: { label: 'Paused', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  completed: { label: 'Completed', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400' },
  replied: { label: 'Replied', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400' },
  bounced: { label: 'Bounced', color: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400' },
  opted_out: { label: 'Opted Out', color: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
  removed: { label: 'Removed', color: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500' },
}

export default function SequenceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sequenceId = params.id as string

  const { data: seqData, isLoading: seqLoading } = useSequence(sequenceId)
  const { data: statsData } = useSequenceStats(sequenceId)
  const { data: stepStatsData } = useStepExecutionStats(sequenceId)
  const { data: enrollData, isLoading: enrollLoading } = useEnrollments(sequenceId)
  const updateSeq = useUpdateSequence()
  const enrollMutation = useEnrollContacts()
  const updateEnrollStatus = useUpdateEnrollmentStatus()

  const [isEnrollOpen, setIsEnrollOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Contact[]>([])
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set())
  const [searching, setSearching] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [generating, setGenerating] = useState<string | null>(null)

  const sequence = seqData?.data
  const stats = statsData?.data
  const stepStats = stepStatsData?.data || []
  const enrollments = enrollData?.data || []
  const steps = sequence?.steps || []

  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.length < 2) { setSearchResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      const result = await getContacts({ search: searchTerm, status: 'lead' }, { page: 1, limit: 10 })
      if (!result.error) setSearchResults(result.data)
      setSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const handleEnroll = async () => {
    if (selectedContactIds.size === 0) return
    setEnrolling(true)
    const result = await enrollMutation.mutateAsync({
      sequenceId, contactIds: Array.from(selectedContactIds),
    })
    if (result.enrolled > 0) {
      toast.success(`Enrolled ${result.enrolled} contact${result.enrolled !== 1 ? 's' : ''}`)
      setIsEnrollOpen(false)
      setSelectedContactIds(new Set())
      setSearchTerm('')
    }
    if (result.error) toast.error(result.error)
    setEnrolling(false)
  }

  const handleToggleStatus = async () => {
    if (!sequence) return
    const newStatus = sequence.status === 'active' ? 'paused' : 'active'
    const result = await updateSeq.mutateAsync({ id: sequenceId, status: newStatus })
    if (result.error) toast.error(result.error)
    else toast.success(`Sequence ${newStatus === 'active' ? 'activated' : 'paused'}`)
  }

  const handleGeneratePreview = async (step: SequenceStep, enrollment: SequenceEnrollment) => {
    const contact = enrollment.contact
    if (!contact) return
    setGenerating(`${enrollment.id}-${step.id}`)

    try {
      const res = await fetch('/api/ai/sequence-personalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_step',
          contact: {
            first_name: contact.first_name,
            last_name: contact.last_name,
            email: contact.email,
            title: contact.title,
          },
          step: {
            step_number: step.step_number,
            channel: step.channel,
            subject_template: step.subject_template,
            body_template: step.body_template,
            ai_prompt: step.ai_prompt,
          },
          sequence_context: {
            sequence_name: sequence?.name,
            total_steps: steps.length,
          },
        }),
      })
      const data = await res.json()
      toast.success('AI content generated')
      const preview = step.channel === 'email'
        ? `Subject: ${data.subject}\n\n${data.body}`
        : step.channel === 'linkedin'
        ? data.message
        : step.channel === 'call'
        ? `Opening: ${data.opening}\n\nPoints:\n${data.talking_points?.map((p: string) => `• ${p}`).join('\n')}\n\nCTA: ${data.cta}`
        : data.task_description
      window.alert(preview)
    } catch {
      toast.error('Failed to generate preview')
    }
    setGenerating(null)
  }

  if (seqLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-4 w-96 bg-zinc-100 dark:bg-zinc-800 rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />)}
          </div>
        </div>
      </div>
    )
  }

  if (!sequence) {
    return (
      <div className="max-w-5xl mx-auto text-center py-12">
        <p className="text-zinc-500 dark:text-zinc-400">Sequence not found</p>
        <Link href="/sequences" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mt-2 inline-block">Back to sequences</Link>
      </div>
    )
  }

  return (
    <>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/sequences" className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{sequence.name}</h1>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  sequence.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' :
                  sequence.status === 'paused' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                  'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                }`}>
                  {sequence.status.charAt(0).toUpperCase() + sequence.status.slice(1)}
                </span>
              </div>
              {sequence.description && <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{sequence.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleStatus}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                sequence.status === 'active'
                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-400'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400'
              }`}
            >
              {sequence.status === 'active' ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Activate</>}
            </button>
            <button
              onClick={() => setIsEnrollOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 shadow-sm shadow-indigo-600/20 transition-colors"
            >
              <UserPlus size={14} /> Enroll Contacts
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatBox label="Enrolled" value={stats.total_enrolled} />
            <StatBox label="Active" value={stats.active} />
            <StatBox label="Replied" value={stats.replied} color="text-emerald-600 dark:text-emerald-400" />
            <StatBox label="Reply Rate" value={`${stats.reply_rate.toFixed(1)}%`} color="text-indigo-600 dark:text-indigo-400" />
          </div>
        )}

        {/* Two columns: Steps + Enrollments */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Steps */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Steps ({steps.length})
                </h2>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {steps.map((step, idx) => {
                  const Icon = channelIcons[step.channel] || Mail
                  const ss = stepStats.find(s => s.step_id === step.id)
                  const total = ss ? ss.scheduled + ss.pending_review + ss.sent + ss.opened + ss.clicked + ss.replied + ss.bounced + ss.skipped + ss.failed : 0
                  return (
                    <div key={step.id} className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className={`h-8 w-8 rounded-md flex items-center justify-center ${channelColors[step.channel]}`}>
                            <Icon size={14} />
                          </div>
                          {idx < steps.length - 1 && (
                            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-zinc-200 dark:bg-zinc-700" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-zinc-400">Step {step.step_number}</span>
                            <span className="text-sm font-medium text-zinc-900 dark:text-white capitalize">{step.channel}</span>
                            {step.ai_personalization && <Sparkles size={11} className="text-indigo-500" />}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {step.delay_days === 0 ? 'Immediately' : `Day ${step.delay_days}`}
                            {step.ai_prompt ? ` · ${step.ai_prompt.slice(0, 50)}...` : ''}
                          </p>
                          {ss && total > 0 && (
                            <div className="flex items-center gap-2 mt-1.5">
                              {ss.sent > 0 && <MiniStat label="Sent" count={ss.sent} color="text-blue-600 dark:text-blue-400" />}
                              {ss.opened > 0 && <MiniStat label="Opened" count={ss.opened} color="text-emerald-600 dark:text-emerald-400" />}
                              {ss.clicked > 0 && <MiniStat label="Clicked" count={ss.clicked} color="text-indigo-600 dark:text-indigo-400" />}
                              {ss.replied > 0 && <MiniStat label="Replied" count={ss.replied} color="text-purple-600 dark:text-purple-400" />}
                              {ss.bounced > 0 && <MiniStat label="Bounced" count={ss.bounced} color="text-red-600 dark:text-red-400" />}
                              {ss.scheduled > 0 && <MiniStat label="Queued" count={ss.scheduled + ss.pending_review} color="text-zinc-500" />}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Enrollments */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Enrolled Contacts ({enrollments.length})
                </h2>
                <button
                  onClick={() => setIsEnrollOpen(true)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  + Enroll
                </button>
              </div>

              {enrollLoading ? (
                <div className="p-6 animate-pulse space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded" />
                        <div className="h-3 w-24 bg-zinc-100 dark:bg-zinc-800 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : enrollments.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">No contacts enrolled yet</p>
                  <button onClick={() => setIsEnrollOpen(true)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                    Enroll your first contacts
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {enrollments.map((enrollment) => {
                    const contact = enrollment.contact
                    if (!contact) return null
                    const statusCfg = enrollmentStatusConfig[enrollment.status] || enrollmentStatusConfig.active

                    return (
                      <div key={enrollment.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-xs font-medium text-indigo-600 dark:text-indigo-400 shrink-0">
                          {contact.first_name.charAt(0)}{contact.last_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link href={`/contacts/${contact.id}`} className="text-sm font-medium text-zinc-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 truncate block">
                            {contact.first_name} {contact.last_name}
                          </Link>
                          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                            <span>Step {enrollment.current_step}/{steps.length}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.color}`}>
                              {statusCfg.label}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {steps.length > 0 && enrollment.status === 'active' && (
                            <button
                              onClick={() => {
                                const currentStep = steps.find(s => s.step_number === enrollment.current_step)
                                if (currentStep) handleGeneratePreview(currentStep, enrollment)
                              }}
                              disabled={generating === `${enrollment.id}-${steps[enrollment.current_step - 1]?.id}`}
                              className="p-1.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950 text-zinc-400 hover:text-indigo-600 transition-colors"
                              title="Generate AI Preview"
                            >
                              {generating?.startsWith(enrollment.id) ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                            </button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400">
                                <MoreHorizontal size={13} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {enrollment.status === 'active' && (
                                <DropdownMenuItem onClick={() => updateEnrollStatus.mutate({ enrollmentId: enrollment.id, status: 'paused' })}>
                                  Pause
                                </DropdownMenuItem>
                              )}
                              {enrollment.status === 'paused' && (
                                <DropdownMenuItem onClick={() => updateEnrollStatus.mutate({ enrollmentId: enrollment.id, status: 'active' })}>
                                  Resume
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => updateEnrollStatus.mutate({ enrollmentId: enrollment.id, status: 'replied' })}>
                                Mark as Replied
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => updateEnrollStatus.mutate({ enrollmentId: enrollment.id, status: 'removed' })}>
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enroll Sheet */}
      <Sheet open={isEnrollOpen} onOpenChange={setIsEnrollOpen}>
        <SheetHeader onClose={() => setIsEnrollOpen(false)}>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Enroll Contacts</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Search for leads to add to this sequence</p>
        </SheetHeader>
        <SheetBody>
          <div className="space-y-4">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search contacts by name or email..."
              className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
              autoFocus
            />

            {selectedContactIds.size > 0 && (
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                {selectedContactIds.size} contact{selectedContactIds.size !== 1 ? 's' : ''} selected
              </p>
            )}

            {searching && <p className="text-xs text-zinc-400">Searching...</p>}

            <div className="space-y-1">
              {searchResults.map(c => {
                const isSelected = selectedContactIds.has(c.id)
                const alreadyEnrolled = enrollments.some(e => e.contact_id === c.id && e.status !== 'removed')
                return (
                  <button
                    key={c.id}
                    disabled={alreadyEnrolled}
                    onClick={() => {
                      const next = new Set(selectedContactIds)
                      if (isSelected) next.delete(c.id); else next.add(c.id)
                      setSelectedContactIds(next)
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      alreadyEnrolled ? 'opacity-50 cursor-not-allowed' :
                      isSelected ? 'bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800' :
                      'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-xs font-medium text-indigo-600 dark:text-indigo-400 shrink-0">
                      {c.first_name.charAt(0)}{c.last_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{c.first_name} {c.last_name}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{c.email || c.title || ''}</p>
                    </div>
                    {alreadyEnrolled && <span className="text-xs text-zinc-400">Already enrolled</span>}
                    {isSelected && <CheckCircle2 size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        </SheetBody>
        <SheetFooter>
          <button onClick={() => setIsEnrollOpen(false)} className="px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
            Cancel
          </button>
          <button
            onClick={handleEnroll}
            disabled={selectedContactIds.size === 0 || enrolling}
            className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition-colors"
          >
            {enrolling ? 'Enrolling...' : `Enroll ${selectedContactIds.size} Contact${selectedContactIds.size !== 1 ? 's' : ''}`}
          </button>
        </SheetFooter>
      </Sheet>
    </>
  )
}

function StatBox({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-semibold mt-1 ${color || 'text-zinc-900 dark:text-white'}`}>{value}</p>
    </div>
  )
}

function MiniStat({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <span className={`text-[10px] font-medium ${color}`}>
      {count} {label}
    </span>
  )
}
