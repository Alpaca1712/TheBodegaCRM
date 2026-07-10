'use client'

import { useEffect, useMemo, useRef, useState, type ComponentType, type DragEvent, type FormEvent } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  Edit3,
  FileText,
  GripVertical,
  Info,
  Link2,
  ListChecks,
  Loader2,
  Mail,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  CampaignAutomationAttachment,
  CampaignAutomationChannel,
  CampaignAutomationEmailType,
  CampaignAutomationStep,
  CampaignDetail,
  CampaignEnrollmentWithLead,
  CampaignEvent,
  CampaignLeadMagnet,
  CampaignSequenceExecution,
  CampaignStage,
} from '@/types/campaigns'
import { CAMPAIGN_EVENT_LABELS, CAMPAIGN_TEMPLATES, CAMPAIGN_TYPE_LABELS } from '@/types/campaigns'
import {
  CAMPAIGN_AUTOMATION_CHANNELS,
  CAMPAIGN_AUTOMATION_EMAIL_TYPES,
  formatWaitMinutes,
} from '@/lib/campaigns/automation'
import type { Lead } from '@/types/leads'
import { STAGE_LABELS } from '@/types/leads'
import { Button } from '@/components/ui/button'

const metricTones = {
  red: 'bg-red-50 text-red-600 ring-red-100 dark:bg-red-950/35 dark:text-red-300 dark:ring-red-900/50',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-950/35 dark:text-amber-300 dark:ring-amber-900/50',
  blue: 'bg-blue-50 text-blue-600 ring-blue-100 dark:bg-blue-950/35 dark:text-blue-300 dark:ring-blue-900/50',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-950/35 dark:text-emerald-300 dark:ring-emerald-900/50',
  zinc: 'bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700',
}

type MetricTone = keyof typeof metricTones

const automationChannelLabels: Record<CampaignAutomationChannel, string> = {
  email: 'Email',
  linkedin: 'LinkedIn',
  task: 'Task',
}

const automationEmailTypeLabels: Record<CampaignAutomationEmailType, string> = {
  initial: 'Initial',
  follow_up_1: 'Follow-up 1',
  follow_up_2: 'Follow-up 2',
  follow_up_3: 'Follow-up 3',
  reply_response: 'Reply',
  meeting_request: 'Meeting ask',
  lead_magnet: 'Lead magnet',
  break_up: 'Break-up',
}

const campaignTemplateTokens = [
  { token: '{{first_name}}', description: 'First name' },
  { token: '{{contact_name}}', description: 'Full contact name' },
  { token: '{{company_name}}', description: 'Company name' },
  { token: '{{contact_title}}', description: 'Contact title' },
  { token: '{{contact_email}}', description: 'Contact email' },
  { token: '{{challenge_link}}', description: 'Tracked challenge link' },
  { token: '{{lead_magnet}}', description: 'Lead magnet or offer name' },
] as const

const MAX_SEQUENCE_ATTACHMENT_BYTES = 5 * 1024 * 1024
const MAX_SEQUENCE_ATTACHMENT_TOTAL_BYTES = 8 * 1024 * 1024
const MAX_SEQUENCE_ATTACHMENTS = 10

interface SequenceStepForm {
  name: string
  trigger_stage_key: string
  wait_value: string
  wait_unit: 'hours' | 'days'
  channel: CampaignAutomationChannel
  email_type: CampaignAutomationEmailType
  lead_magnet_id: string
  subject_template: string
  body_template: string
  move_to_stage_key: string
  stop_on_reply: boolean
  active: boolean
  ai_condition_prompt: string
  ai_condition_true_tag: string
  ai_condition_false_tag: string
  attachments: CampaignAutomationAttachment[]
}

type CampaignToolKey = 'lead_magnets' | 'sequences' | 'onboarding' | 'activity'

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const campaignId = params.id
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [leadSearch, setLeadSearch] = useState('')
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [draggingEnrollmentId, setDraggingEnrollmentId] = useState<string | null>(null)
  const [dragOverStageKey, setDragOverStageKey] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState(false)
  const [savingCampaign, setSavingCampaign] = useState(false)
  const [activeTool, setActiveTool] = useState<CampaignToolKey | null>(null)
  const [campaignDraft, setCampaignDraft] = useState({
    name: '',
    status: 'active',
    lead_magnet_name: '',
    description: '',
    is_default_landing: false,
  })

  const load = async () => {
    setLoading(true)
    try {
      const [campaignRes, leadsRes] = await Promise.all([
        fetch(`/api/campaigns/${campaignId}`),
        fetch('/api/leads?limit=200'),
      ])
      const campaignData = await campaignRes.json()
      const leadsData = await leadsRes.json()
      if (!campaignRes.ok) throw new Error(campaignData?.error || 'Failed to load campaign')
      if (!leadsRes.ok) throw new Error(leadsData?.error || 'Failed to load leads')
      setCampaign(campaignData.data)
      setLeads(leadsData.data || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load campaign')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])

  const enrolledLeadIds = useMemo(
    () => new Set((campaign?.enrollments || []).map((enrollment) => enrollment.lead_id)),
    [campaign?.enrollments],
  )

  const availableLeads = useMemo(
    () => leads.filter((lead) => !enrolledLeadIds.has(lead.id)),
    [leads, enrolledLeadIds],
  )

  const filteredAvailableLeads = useMemo(() => {
    const query = leadSearch.trim().toLowerCase()
    const filtered = query
      ? availableLeads.filter((lead) => {
          return [
            lead.contact_name,
            lead.company_name,
            lead.contact_email,
            lead.contact_title,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(query)
        })
      : availableLeads

    return filtered.slice(0, 14)
  }, [availableLeads, leadSearch])

  const selectedLeads = useMemo(
    () => availableLeads.filter((lead) => selectedLeadIds.has(lead.id)),
    [availableLeads, selectedLeadIds],
  )

  const stageCounts = useMemo(() => {
    return campaign?.stages.reduce<Record<string, number>>((acc, stage) => {
      acc[stage.stage_key] = campaign.enrollments.filter((enrollment) => enrollment.stage_key === stage.stage_key).length
      return acc
    }, {}) || {}
  }, [campaign])

  const toggleLead = (leadId: string) => {
    setSelectedLeadIds((current) => {
      const next = new Set(current)
      if (next.has(leadId)) next.delete(leadId)
      else next.add(leadId)
      return next
    })
  }

  const selectVisibleLeads = () => {
    setSelectedLeadIds((current) => {
      const next = new Set(current)
      filteredAvailableLeads.forEach((lead) => next.add(lead.id))
      return next
    })
  }

  const clearSelectedLeads = () => setSelectedLeadIds(new Set())

  const enrollSelectedLeads = async () => {
    const leadIds = Array.from(selectedLeadIds)
    if (leadIds.length === 0) {
      toast.error('Select at least one lead')
      return
    }

    setEnrolling(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_ids: leadIds,
          metadata: { enrolled_from: 'campaign_detail' },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to add leads')
      toast.success(`Added ${leadIds.length} lead${leadIds.length !== 1 ? 's' : ''}`)
      clearSelectedLeads()
      setLeadSearch('')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add leads')
    } finally {
      setEnrolling(false)
    }
  }

  const moveEnrollment = async (enrollment: CampaignEnrollmentWithLead, stageKey: string) => {
    if (stageKey === enrollment.stage_key) return
    setMovingId(enrollment.id)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/enrollments/${enrollment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_key: stageKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to update stage')
      toast.success('Campaign stage updated')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update stage')
    } finally {
      setMovingId(null)
    }
  }

  const startDraggingEnrollment = (event: DragEvent<HTMLElement>, enrollment: CampaignEnrollmentWithLead) => {
    const target = event.target instanceof HTMLElement ? event.target : null
    if (target?.closest('a,button,input,select,textarea')) {
      event.preventDefault()
      return
    }

    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', enrollment.id)
    setDraggingEnrollmentId(enrollment.id)
  }

  const stopDraggingEnrollment = () => {
    setDraggingEnrollmentId(null)
    setDragOverStageKey(null)
  }

  const dragOverStage = (event: DragEvent<HTMLElement>, stageKey: string) => {
    if (!draggingEnrollmentId) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverStageKey(stageKey)
  }

  const leaveStageDropTarget = (event: DragEvent<HTMLElement>, stageKey: string) => {
    const nextTarget = event.relatedTarget instanceof Node ? event.relatedTarget : null
    if (nextTarget && event.currentTarget.contains(nextTarget)) return
    setDragOverStageKey((current) => (current === stageKey ? null : current))
  }

  const dropEnrollmentOnStage = async (event: DragEvent<HTMLElement>, stageKey: string) => {
    event.preventDefault()
    const enrollmentId = event.dataTransfer.getData('text/plain') || draggingEnrollmentId
    const enrollment = campaign?.enrollments.find((item) => item.id === enrollmentId)
    stopDraggingEnrollment()
    if (!enrollment || enrollment.stage_key === stageKey) return
    await moveEnrollment(enrollment, stageKey)
  }

  const deleteCampaign = async () => {
    if (!campaign) return
    if (!window.confirm(`Delete "${campaign.name}"? Leads will stay in the CRM, but this campaign funnel and its events will be removed.`)) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to delete campaign')
      toast.success('Campaign deleted')
      router.push('/campaigns')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete campaign')
    } finally {
      setDeleting(false)
    }
  }

  const startEditingCampaign = () => {
    if (!campaign) return
    setCampaignDraft({
      name: campaign.name,
      status: campaign.status,
      lead_magnet_name: campaign.lead_magnet_name || '',
      description: campaign.description || '',
      is_default_landing: Boolean(campaign.is_default_landing),
    })
    setEditingCampaign(true)
  }

  const cancelEditingCampaign = () => {
    setEditingCampaign(false)
  }

  const saveCampaign = async (event: FormEvent) => {
    event.preventDefault()
    if (!campaign) return
    if (!campaignDraft.name.trim()) {
      toast.error('Campaign name is required')
      return
    }

    setSavingCampaign(true)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignDraft.name.trim(),
          status: campaignDraft.status,
          lead_magnet_name: campaignDraft.lead_magnet_name.trim() || null,
          description: campaignDraft.description.trim() || null,
          is_default_landing: campaignDraft.is_default_landing,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to update campaign')
      setCampaign((current) => current ? { ...current, ...data.data } : current)
      setEditingCampaign(false)
      toast.success('Campaign updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update campaign')
    } finally {
      setSavingCampaign(false)
    }
  }

  if (loading && !campaign) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-sm text-zinc-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading campaign
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="space-y-4">
        <Link href="/campaigns" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          <ArrowLeft className="h-4 w-4" />
          Campaigns
        </Link>
        <p className="text-sm text-zinc-500">Campaign not found.</p>
      </div>
    )
  }

  const cta = campaign.lead_magnet_name || 'Discovery call'
  const templateName = campaign.template_key ? CAMPAIGN_TEMPLATES[campaign.template_key].name : campaign.pipeline?.name || 'Campaign funnel'
  const sequenceSteps = campaign.sequence_steps || []
  const meetingRate = campaign.metrics.leads_enrolled > 0
    ? Math.round((campaign.metrics.meetings_booked / campaign.metrics.leads_enrolled) * 100)
    : 0
  const replyRate = campaign.metrics.initial_emails_sent > 0
    ? Math.round((campaign.metrics.replies / campaign.metrics.initial_emails_sent) * 100)
    : 0

  return (
    <div className="min-w-0 overflow-x-hidden space-y-4">
      <header className="min-w-0 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <Link href="/campaigns" className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              <ArrowLeft className="h-4 w-4" />
              Campaigns
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">{campaign.name}</h1>
              <StatusBadge status={campaign.status} />
              {campaign.is_default_landing && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/35 dark:text-emerald-300 dark:ring-emerald-900/50">
                  Landing default
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <span>{CAMPAIGN_TYPE_LABELS[campaign.campaign_type]}</span>
              <span className="hidden text-zinc-300 sm:inline">/</span>
              <span>{templateName}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {campaign.landing_url && <CopyLandingLinkButton url={campaign.landing_url} />}
            <Button type="button" variant="outline" onClick={startEditingCampaign}>
              <Edit3 className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
            <Button type="button" variant="outline" onClick={() => void deleteCampaign()} isLoading={deleting} className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <HeaderFact label="Goal" value={cta} />
          <HeaderFact label="Available leads" value={`${availableLeads.length} not enrolled`} />
          <HeaderFact label="Funnel stages" value={`${campaign.stages.length} stages`} />
          <HeaderFact label="Landing page" value={formatLandingLinkLabel(campaign.landing_url)} />
        </div>
      </header>

      {editingCampaign && (
        <CampaignEditPanel
          draft={campaignDraft}
          saving={savingCampaign}
          onChange={setCampaignDraft}
          onCancel={cancelEditingCampaign}
          onSubmit={saveCampaign}
        />
      )}

      <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard icon={Users} label="Enrolled" value={campaign.metrics.leads_enrolled} tone="red" />
        <MetricCard icon={Send} label="Emails sent" value={campaign.metrics.initial_emails_sent} tone="amber" />
        <MetricCard icon={Mail} label="Reply rate" value={`${replyRate}%`} tone="blue" />
        <MetricCard icon={CalendarCheck} label="Meetings" value={campaign.metrics.meetings_booked} tone="emerald" />
        <MetricCard icon={CheckCircle2} label="Meeting rate" value={`${meetingRate}%`} tone="zinc" />
      </div>

      <section className="min-w-0 overflow-hidden rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">Campaign funnel</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {campaign.metrics.leads_enrolled} enrolled lead{campaign.metrics.leads_enrolled !== 1 ? 's' : ''} moving toward {cta.toLowerCase()}.
            </p>
          </div>
          <Link
            href={`/leads/new?type=customer&campaign_id=${campaign.id}`}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-red-600 px-3 text-sm font-medium text-white shadow-sm shadow-red-600/20 transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
          >
            <Plus className="h-4 w-4" />
            New Lead
          </Link>
        </div>

        <div className="-mx-3 mt-3 max-w-full overflow-x-auto px-3 pb-2">
          <div className="flex min-w-max gap-3">
            {campaign.stages.map((stage) => (
              <StageColumn
                key={stage.id}
                stage={stage}
                stages={campaign.stages}
                campaignId={campaign.id}
                count={stageCounts[stage.stage_key] || 0}
                enrollments={campaign.enrollments.filter((enrollment) => enrollment.stage_key === stage.stage_key)}
                leadMagnets={campaign.lead_magnets || []}
                sequenceSteps={sequenceSteps}
                sequenceExecutions={campaign.sequence_executions || []}
                events={campaign.events}
                movingId={movingId}
                draggingEnrollmentId={draggingEnrollmentId}
                isDropTarget={dragOverStageKey === stage.stage_key}
                onMove={moveEnrollment}
                onDragStart={startDraggingEnrollment}
                onDragEnd={stopDraggingEnrollment}
                onDragOverStage={dragOverStage}
                onDragLeaveStage={leaveStageDropTarget}
                onDropStage={dropEnrollmentOnStage}
              />
            ))}
          </div>
        </div>
      </section>

      <CampaignToolStrip
        activeTool={activeTool}
        onToggleTool={(tool) => setActiveTool((current) => (current === tool ? null : tool))}
        onClose={() => setActiveTool(null)}
        leadMagnetCount={campaign.lead_magnets?.length || 0}
        sequenceCount={sequenceSteps.length}
        activeSequenceCount={sequenceSteps.filter((step) => step.active).length}
        availableLeadCount={availableLeads.length}
        eventCount={campaign.events.length}
      />

      {activeTool === 'lead_magnets' && <LeadMagnetsPanel campaign={campaign} onChanged={load} />}

      {activeTool === 'sequences' && <SequencePanel campaign={campaign} steps={sequenceSteps} onChanged={load} />}

      {activeTool === 'onboarding' && (
        <LeadOnboardingPanel
          campaign={campaign}
          leadSearch={leadSearch}
          setLeadSearch={setLeadSearch}
          availableLeads={availableLeads}
          filteredLeads={filteredAvailableLeads}
          selectedLeadIds={selectedLeadIds}
          selectedLeads={selectedLeads}
          enrolling={enrolling}
          onToggleLead={toggleLead}
          onSelectVisible={selectVisibleLeads}
          onClearSelected={clearSelectedLeads}
          onEnrollSelected={enrollSelectedLeads}
        />
      )}

      {activeTool === 'activity' && <EventFeed events={campaign.events} />}
    </div>
  )
}

function HeaderFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[140px] max-w-[260px]">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">{value}</p>
    </div>
  )
}

function CampaignEditPanel({
  draft,
  saving,
  onChange,
  onCancel,
  onSubmit,
}: {
  draft: {
    name: string
    status: string
    lead_magnet_name: string
    description: string
    is_default_landing: boolean
  }
  saving: boolean
  onChange: (draft: {
    name: string
    status: string
    lead_magnet_name: string
    description: string
    is_default_landing: boolean
  }) => void
  onCancel: () => void
  onSubmit: (event: FormEvent) => void
}) {
  const update = (patch: Partial<typeof draft>) => onChange({ ...draft, ...patch })

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70"
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">Edit campaign</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Update the visible campaign details without rebuilding the funnel.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive" size="sm" isLoading={saving}>
            Save
          </Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Campaign name</span>
          <input
            value={draft.name}
            onChange={(event) => update({ name: event.target.value })}
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Status</span>
          <select
            value={draft.status}
            onChange={(event) => update({ status: event.target.value })}
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Primary CTA</span>
          <input
            value={draft.lead_magnet_name}
            onChange={(event) => update({ lead_magnet_name: event.target.value })}
            placeholder="Free Pentest Challenge, discovery call, diagnostic..."
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-red-300 focus:ring-4 focus:ring-red-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </label>
        <label className="block lg:row-span-2">
          <span className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Description</span>
          <textarea
            value={draft.description}
            onChange={(event) => update({ description: event.target.value })}
            rows={4}
            className="min-h-[94px] w-full resize-y rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-red-300 focus:ring-4 focus:ring-red-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </label>
        <label className="flex h-10 items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={draft.is_default_landing}
            onChange={(event) => update({ is_default_landing: event.target.checked })}
            className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-500"
          />
          Default landing campaign
        </label>
      </div>
    </form>
  )
}

function CopyLandingLinkButton({ url }: { url: string }) {
  const [copying, setCopying] = useState(false)

  const copyLink = async () => {
    setCopying(true)
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Campaign landing link copied')
    } catch {
      toast.error('Failed to copy landing link')
    } finally {
      setCopying(false)
    }
  }

  return (
    <Button type="button" variant="outline" onClick={() => void copyLink()} disabled={copying}>
      {copying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
      Landing link
    </Button>
  )
}

function formatLandingLinkLabel(url?: string | null) {
  if (!url) return 'Per-lead challenge links'
  try {
    return new URL(url).pathname.replace(/^\//, '') || 'Campaign landing'
  } catch {
    return 'Campaign landing'
  }
}

function StatusBadge({ status }: { status: CampaignDetail['status'] }) {
  const className = status === 'active'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/35 dark:text-emerald-300 dark:ring-emerald-900/50'
    : status === 'paused'
      ? 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/35 dark:text-amber-300 dark:ring-amber-900/50'
      : 'bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700'

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${className}`}>
      {status}
    </span>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: number | string
  tone: MetricTone
}) {
  return (
    <div className="min-w-0 rounded-lg border border-zinc-200 bg-white p-2.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 ${metricTones[tone]}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="mt-2 text-lg font-semibold tabular-nums text-zinc-950 dark:text-zinc-100">{value}</p>
    </div>
  )
}

function CampaignToolStrip({
  activeTool,
  onToggleTool,
  onClose,
  leadMagnetCount,
  sequenceCount,
  activeSequenceCount,
  availableLeadCount,
  eventCount,
}: {
  activeTool: CampaignToolKey | null
  onToggleTool: (tool: CampaignToolKey) => void
  onClose: () => void
  leadMagnetCount: number
  sequenceCount: number
  activeSequenceCount: number
  availableLeadCount: number
  eventCount: number
}) {
  const tools: Array<{
    key: CampaignToolKey
    icon: ComponentType<{ className?: string }>
    label: string
    value: string
    hint: string
  }> = [
    {
      key: 'lead_magnets',
      icon: FileText,
      label: 'Lead magnets',
      value: `${leadMagnetCount} loaded`,
      hint: 'Docs and tracked PDFs',
    },
    {
      key: 'sequences',
      icon: ListChecks,
      label: 'Sequences',
      value: `${activeSequenceCount} on / ${sequenceCount} total`,
      hint: 'Automation rules',
    },
    {
      key: 'onboarding',
      icon: UserPlus,
      label: 'Add leads',
      value: `${availableLeadCount} available`,
      hint: 'Attach CRM leads',
    },
    {
      key: 'activity',
      icon: Clock3,
      label: 'Activity',
      value: `${eventCount} events`,
      hint: 'Recent touches',
    },
  ]

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">Campaign tools</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Open only the workspace you need. The funnel stays focused above.
          </p>
        </div>
        {activeTool && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-zinc-200 px-2.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <X className="h-3.5 w-3.5" />
            Close panel
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {tools.map((tool) => (
          <CampaignToolButton
            key={tool.key}
            icon={tool.icon}
            label={tool.label}
            value={tool.value}
            hint={tool.hint}
            active={activeTool === tool.key}
            onClick={() => onToggleTool(tool.key)}
          />
        ))}
      </div>
    </section>
  )
}

function CampaignToolButton({
  icon: Icon,
  label,
  value,
  hint,
  active,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  hint: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 rounded-md border p-3 text-left transition ${
        active
          ? 'border-red-200 bg-red-50/70 ring-2 ring-red-500/10 dark:border-red-900/60 dark:bg-red-950/25'
          : 'border-zinc-200 bg-zinc-50/60 hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/30 dark:hover:border-zinc-700 dark:hover:bg-zinc-900'
      }`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {label}
          </span>
          <span className="mt-1 block truncate text-sm font-semibold text-zinc-950 dark:text-zinc-100">{value}</span>
          <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">{hint}</span>
        </span>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ring-1 ${
          active
            ? 'bg-red-100 text-red-600 ring-red-200 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-900/70'
            : 'bg-white text-zinc-500 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700'
        }`}>
          <Icon className="h-4 w-4" />
        </span>
      </span>
    </button>
  )
}

function LeadOnboardingPanel({
  campaign,
  leadSearch,
  setLeadSearch,
  availableLeads,
  filteredLeads,
  selectedLeadIds,
  selectedLeads,
  enrolling,
  onToggleLead,
  onSelectVisible,
  onClearSelected,
  onEnrollSelected,
}: {
  campaign: CampaignDetail
  leadSearch: string
  setLeadSearch: (value: string) => void
  availableLeads: Lead[]
  filteredLeads: Lead[]
  selectedLeadIds: Set<string>
  selectedLeads: Lead[]
  enrolling: boolean
  onToggleLead: (leadId: string) => void
  onSelectVisible: () => void
  onClearSelected: () => void
  onEnrollSelected: () => Promise<void>
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-red-50 text-red-600 ring-1 ring-red-100 dark:bg-red-950/35 dark:text-red-300 dark:ring-red-900/50">
              <UserPlus className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">Lead onboarding</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{availableLeads.length} CRM leads available</p>
            </div>
          </div>
        </div>
        <Link
          href={`/leads/new?type=customer&campaign_id=${campaign.id}`}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-3 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </Link>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={leadSearch}
            onChange={(event) => setLeadSearch(event.target.value)}
            placeholder="Search CRM leads"
            className="h-10 w-full rounded-md border border-zinc-200 bg-white pl-9 pr-8 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-red-300 focus:ring-4 focus:ring-red-500/10 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          {leadSearch && (
            <button
              type="button"
              onClick={() => setLeadSearch('')}
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
              aria-label="Clear lead search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onSelectVisible}
          disabled={filteredLeads.length === 0}
          className="h-10 rounded-md border border-zinc-200 px-3 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Select
        </button>
      </div>

      <div className="mt-3 max-h-[300px] space-y-2 overflow-y-auto pr-1">
        {filteredLeads.map((lead) => {
          const selected = selectedLeadIds.has(lead.id)
          return (
            <button
              key={lead.id}
              type="button"
              onClick={() => onToggleLead(lead.id)}
              className={`flex w-full items-start gap-3 rounded-md border p-3 text-left transition ${
                selected
                  ? 'border-red-200 bg-red-50/60 dark:border-red-900/50 dark:bg-red-950/20'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/30 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/60'
              }`}
            >
              <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? 'border-red-600 bg-red-600' : 'border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900'}`}>
                {selected && <CheckCircle2 className="h-3 w-3 text-white" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{lead.contact_name}</span>
                <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{lead.company_name}</span>
                <span className="mt-1 block truncate text-[11px] text-zinc-400">{lead.contact_email || STAGE_LABELS[lead.stage]}</span>
              </span>
            </button>
          )
        })}
        {filteredLeads.length === 0 && (
          <div className="rounded-md border border-dashed border-zinc-200 bg-zinc-50/70 px-4 py-8 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">No available leads</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Create a lead or import a CSV, then attach it to this campaign.</p>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {selectedLeads.length} selected
        </div>
        <div className="flex items-center gap-2">
          {selectedLeads.length > 0 && (
            <button type="button" onClick={onClearSelected} className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              Clear
            </button>
          )}
          <Button type="button" size="sm" variant="destructive" isLoading={enrolling} disabled={selectedLeads.length === 0} onClick={() => void onEnrollSelected()}>
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            Add selected
          </Button>
        </div>
      </div>
    </section>
  )
}

function LeadMagnetsPanel({
  campaign,
  onChanged,
}: {
  campaign: CampaignDetail
  onChanged: () => Promise<void>
}) {
  const [name, setName] = useState(campaign.lead_magnet_name || 'Free Pentest Challenge')
  const [docUrl, setDocUrl] = useState('')
  const [ctaPhrase, setCtaPhrase] = useState('Apply for our Pentest Challenge, and walk into your next deal ready.')
  const [ctaLinkText, setCtaLinkText] = useState('Pentest Challenge')
  const [saving, setSaving] = useState(false)
  const [deletingLeadMagnetId, setDeletingLeadMagnetId] = useState<string | null>(null)
  const leadMagnets = campaign.lead_magnets || []

  const saveLeadMagnet = async () => {
    if (!name.trim()) {
      toast.error('Name the lead magnet')
      return
    }
    if (!docUrl.trim()) {
      toast.error('Paste the Google Doc link')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/lead-magnets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          google_doc_url: docUrl.trim(),
          cta_phrase: ctaPhrase.trim(),
          cta_link_text: ctaLinkText.trim(),
          filename_template: '{{company_name}} - {{lead_magnet}}.pdf',
          is_default: leadMagnets.length === 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to save lead magnet')
      toast.success('Lead magnet saved')
      setDocUrl('')
      await onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save lead magnet')
    } finally {
      setSaving(false)
    }
  }

  const deleteLeadMagnet = async (leadMagnet: CampaignLeadMagnet) => {
    if (!window.confirm(`Delete "${leadMagnet.name}" from this campaign?`)) return

    setDeletingLeadMagnetId(leadMagnet.id)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/lead-magnets/${leadMagnet.id}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to delete lead magnet')
      toast.success('Lead magnet deleted')
      await onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete lead magnet')
    } finally {
      setDeletingLeadMagnetId(null)
    }
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/35 dark:text-blue-300 dark:ring-blue-900/50">
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">Lead magnets</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Google Docs exported as tracked PDFs for each enrolled lead.
              </p>
            </div>
          </div>
        </div>
        <Link
          href="/api/gmail/connect"
          className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-200 px-3 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Reconnect Google for Drive access
        </Link>
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Lead magnet name"
          className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-500/10 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          value={docUrl}
          onChange={(event) => setDocUrl(event.target.value)}
          placeholder="Paste Google Doc link"
          className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-500/10 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          value={ctaPhrase}
          onChange={(event) => setCtaPhrase(event.target.value)}
          placeholder="CTA sentence to find"
          className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-500/10 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <div className="flex gap-2">
          <input
            value={ctaLinkText}
            onChange={(event) => setCtaLinkText(event.target.value)}
            placeholder="Words to hyperlink"
            className="h-9 min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-500/10 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <Button type="button" size="sm" variant="destructive" onClick={() => void saveLeadMagnet()} isLoading={saving}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {leadMagnets.map((leadMagnet) => (
          <div key={leadMagnet.id} className="rounded-md border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/30">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-100">{leadMagnet.name}</p>
                <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">{leadMagnet.cta_link_text} link inserted per lead</p>
              </div>
              {leadMagnet.is_default && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/35 dark:text-emerald-300 dark:ring-emerald-900/50">
                  Default
                </span>
              )}
              <button
                type="button"
                onClick={() => void deleteLeadMagnet(leadMagnet)}
                disabled={deletingLeadMagnetId === leadMagnet.id}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                aria-label={`Delete ${leadMagnet.name}`}
                title={`Delete ${leadMagnet.name}`}
              >
                {deletingLeadMagnetId === leadMagnet.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        ))}
        {leadMagnets.length === 0 && (
          <div className="rounded-md border border-dashed border-zinc-200 bg-zinc-50/70 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400 md:col-span-2 xl:col-span-3">
            Add the Google Doc lead magnet for this campaign. The download button on each lead card will generate a PDF with that lead&apos;s tracked link.
          </div>
        )}
      </div>
    </section>
  )
}

function emptySequenceForm(campaign: CampaignDetail): SequenceStepForm {
  return {
    name: '',
    trigger_stage_key: campaign.stages[0]?.stage_key || '',
    wait_value: '0',
    wait_unit: 'hours',
    channel: 'email',
    email_type: 'follow_up_1',
    lead_magnet_id: '',
    subject_template: '',
    body_template: '',
    move_to_stage_key: '',
    stop_on_reply: true,
    active: false,
    ai_condition_prompt: '',
    ai_condition_true_tag: '',
    ai_condition_false_tag: 'Needs a manual reply',
    attachments: [],
  }
}

function sequenceDelayFromMinutes(minutes: number): Pick<SequenceStepForm, 'wait_value' | 'wait_unit'> {
  if (minutes <= 0) return { wait_value: '0', wait_unit: 'hours' }
  if (minutes % 1440 === 0) return { wait_value: String(minutes / 1440), wait_unit: 'days' }
  const hours = minutes / 60
  return {
    wait_value: Number.isInteger(hours) ? String(hours) : String(Number(hours.toFixed(2))),
    wait_unit: 'hours',
  }
}

function minutesFromSequenceDelay(value: string, unit: SequenceStepForm['wait_unit']) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue) || numericValue < 0) return null
  return Math.round(numericValue * (unit === 'days' ? 1440 : 60))
}

function sequenceAttachmentsFromStep(step: CampaignAutomationStep): CampaignAutomationAttachment[] {
  const attachments = step.metadata?.attachments
  if (!Array.isArray(attachments)) return []

  return attachments
    .filter((attachment): attachment is CampaignAutomationAttachment => {
      return typeof attachment?.name === 'string' && (typeof attachment?.url === 'string' || typeof attachment?.data === 'string')
    })
    .map((attachment) => ({
      name: attachment.name,
      url: attachment.url,
      data: attachment.data,
      mime_type: attachment.mime_type,
      size: attachment.size,
    }))
}

function sequenceLeadMagnetIdFromStep(step: CampaignAutomationStep) {
  const leadMagnetId = step.metadata?.lead_magnet_id
  return typeof leadMagnetId === 'string' ? leadMagnetId : ''
}

function sequenceLeadMagnetName(leadMagnets: CampaignLeadMagnet[], step: CampaignAutomationStep) {
  const leadMagnetId = sequenceLeadMagnetIdFromStep(step)
  if (leadMagnetId) {
    return leadMagnets.find((leadMagnet) => leadMagnet.id === leadMagnetId)?.name || ''
  }

  return leadMagnets.find((leadMagnet) => leadMagnet.is_default)?.name || leadMagnets[0]?.name || ''
}

function sequenceAiConditionPromptFromStep(step: CampaignAutomationStep) {
  const prompt = step.metadata?.ai_condition?.prompt
  return typeof prompt === 'string' ? prompt : ''
}

function sequenceAiConditionTrueTagFromStep(step: CampaignAutomationStep) {
  const tag = step.metadata?.ai_condition?.true_tag
  return typeof tag === 'string' ? tag : ''
}

function sequenceAiConditionFalseTagFromStep(step: CampaignAutomationStep) {
  const tag = step.metadata?.ai_condition?.false_tag
  if (typeof tag === 'string') return tag
  return 'Needs a manual reply'
}

function cleanSequenceAttachments(attachments: CampaignAutomationAttachment[]) {
  const cleaned: CampaignAutomationAttachment[] = []
  let totalFileBytes = 0

  for (const attachment of attachments) {
    const name = attachment.name.trim()
    const url = attachment.url?.trim() || ''
    const data = attachment.data?.trim() || ''
    if (!name && !url && !data) continue
    if (!name) return { error: 'Each attachment needs a name', attachments: cleaned }
    if (!url && !data) return { error: 'Each attachment needs a file or URL', attachments: cleaned }

    if (url) {
      try {
        const parsed = new URL(url)
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return { error: 'Attachment URLs must start with http or https', attachments: cleaned }
        }
      } catch {
        return { error: 'Attachment URLs must be valid links', attachments: cleaned }
      }

      cleaned.push({ name, url })
      continue
    }

    const size = attachment.size || Math.ceil((data.length * 3) / 4)
    if (size > MAX_SEQUENCE_ATTACHMENT_BYTES) {
      return { error: `${name} is over the 5 MB attachment limit`, attachments: cleaned }
    }
    totalFileBytes += size
    if (totalFileBytes > MAX_SEQUENCE_ATTACHMENT_TOTAL_BYTES) {
      return { error: 'Use 8 MB or less of uploaded attachments per step', attachments: cleaned }
    }

    cleaned.push({
      name,
      data,
      mime_type: attachment.mime_type || 'application/octet-stream',
      size,
    })
  }

  if (cleaned.length > MAX_SEQUENCE_ATTACHMENTS) {
    return { error: `Use ${MAX_SEQUENCE_ATTACHMENTS} or fewer attachments per step`, attachments: cleaned.slice(0, MAX_SEQUENCE_ATTACHMENTS) }
  }
  return { attachments: cleaned }
}

function formatAttachmentSize(bytes?: number) {
  if (!bytes) return ''
  if (bytes >= 1024 * 1024) return `${Number((bytes / 1024 / 1024).toFixed(1))} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function readFileAsAttachment(file: File): Promise<CampaignAutomationAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const data = result.includes(',') ? result.split(',')[1] : result
      resolve({
        name: file.name,
        data,
        mime_type: file.type || 'application/octet-stream',
        size: file.size,
      })
    }
    reader.onerror = () => reject(reader.error || new Error('Failed to read attachment'))
    reader.readAsDataURL(file)
  })
}

function sequenceFormFromStep(step: CampaignAutomationStep): SequenceStepForm {
  const delay = sequenceDelayFromMinutes(step.wait_minutes)
  return {
    name: step.name,
    trigger_stage_key: step.trigger_stage_key,
    wait_value: delay.wait_value,
    wait_unit: delay.wait_unit,
    channel: step.channel,
    email_type: step.email_type,
    lead_magnet_id: sequenceLeadMagnetIdFromStep(step),
    subject_template: step.subject_template,
    body_template: step.body_template,
    move_to_stage_key: step.move_to_stage_key || '',
    stop_on_reply: step.stop_on_reply,
    active: step.active,
    ai_condition_prompt: sequenceAiConditionPromptFromStep(step),
    ai_condition_true_tag: sequenceAiConditionTrueTagFromStep(step),
    ai_condition_false_tag: sequenceAiConditionFalseTagFromStep(step),
    attachments: sequenceAttachmentsFromStep(step),
  }
}

function stageLabel(stages: CampaignStage[], stageKey?: string | null) {
  if (!stageKey) return 'No move'
  return stages.find((stage) => stage.stage_key === stageKey)?.label || stageKey.replaceAll('_', ' ')
}

function SequencePanel({
  campaign,
  steps,
  onChanged,
}: {
  campaign: CampaignDetail
  steps: CampaignAutomationStep[]
  onChanged: () => Promise<void>
}) {
  const [editingStepId, setEditingStepId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<SequenceStepForm>(() => emptySequenceForm(campaign))
  const [newStepStageKey, setNewStepStageKey] = useState(campaign.stages[0]?.stage_key || '')
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const sortedSteps = useMemo(
    () => [...steps].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at)),
    [steps],
  )
  const sequenceGroups = useMemo(() => {
    const knownStageKeys = new Set(campaign.stages.map((stage) => stage.stage_key))
    const knownGroups = campaign.stages
      .map((stage) => ({
        stage,
        steps: sortedSteps.filter((step) => step.trigger_stage_key === stage.stage_key),
      }))
      .filter((group) => group.steps.length > 0)
    const unknownSteps = sortedSteps.filter((step) => !knownStageKeys.has(step.trigger_stage_key))

    if (unknownSteps.length === 0) return knownGroups
    return [
      ...knownGroups,
      {
        stage: {
          id: 'unknown',
          stage_key: 'unknown',
          label: 'Other',
          position: 999,
          is_terminal: false,
          is_goal: false,
          created_at: '',
        } as CampaignStage,
        steps: unknownSteps,
      },
    ]
  }, [campaign.stages, sortedSteps])
  const activeStepCount = sortedSteps.filter((step) => step.active).length
  const inactiveStepCount = sortedSteps.length - activeStepCount

  const beginCreate = (stageKey?: string) => {
    const triggerStageKey = stageKey || newStepStageKey || campaign.stages[0]?.stage_key || ''
    setEditingStepId('new')
    setForm({
      ...emptySequenceForm(campaign),
      trigger_stage_key: triggerStageKey,
    })
  }

  const beginEdit = (step: CampaignAutomationStep) => {
    setEditingStepId(step.id)
    setForm(sequenceFormFromStep(step))
  }

  const cancelEdit = () => {
    setEditingStepId(null)
    setForm(emptySequenceForm(campaign))
  }

  const copyTemplateToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token)
      toast.success(`${token} copied`)
    } catch {
      toast.error('Failed to copy variable')
    }
  }

  const addUploadedFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList || [])
    if (files.length === 0) return

    if (form.attachments.length + files.length > MAX_SEQUENCE_ATTACHMENTS) {
      toast.error(`Use ${MAX_SEQUENCE_ATTACHMENTS} or fewer attachments per step`)
      return
    }

    const currentFileBytes = form.attachments.reduce((total, attachment) => total + (attachment.data ? attachment.size || 0 : 0), 0)
    let nextFileBytes = currentFileBytes
    const uploaded: CampaignAutomationAttachment[] = []

    for (const file of files) {
      if (file.size > MAX_SEQUENCE_ATTACHMENT_BYTES) {
        toast.error(`${file.name} is over the 5 MB attachment limit`)
        continue
      }

      nextFileBytes += file.size
      if (nextFileBytes > MAX_SEQUENCE_ATTACHMENT_TOTAL_BYTES) {
        toast.error('Use 8 MB or less of uploaded attachments per step')
        break
      }

      try {
        uploaded.push(await readFileAsAttachment(file))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `Failed to read ${file.name}`)
      }
    }

    if (uploaded.length > 0) {
      setForm((current) => ({
        ...current,
        attachments: [...current.attachments, ...uploaded],
      }))
    }
  }

  const saveStep = async () => {
    if (!form.name.trim()) {
      toast.error('Name the sequence step')
      return
    }
    if (!form.trigger_stage_key) {
      toast.error('Pick a trigger stage')
      return
    }
    if (form.channel === 'email' && !form.body_template.trim()) {
      toast.error('Add an email body')
      return
    }

    const waitMinutes = minutesFromSequenceDelay(form.wait_value, form.wait_unit)
    if (waitMinutes === null) {
      toast.error('Wait time must be zero or higher')
      return
    }

    const cleanedAttachments = cleanSequenceAttachments(form.attachments)
    if (cleanedAttachments.error) {
      toast.error(cleanedAttachments.error)
      return
    }

    setSaving(true)
    try {
      const isNew = editingStepId === 'new'
      const existingStep = sortedSteps.find((step) => step.id === editingStepId)
      const nextPosition = sortedSteps.length > 0
        ? Math.max(...sortedSteps.map((step) => step.position)) + 10
        : 10
      const {
        ai_condition: _existingAiCondition,
        lead_magnet_id: _existingLeadMagnetId,
        ...existingMetadata
      } = existingStep?.metadata || {}
      void _existingAiCondition
      void _existingLeadMagnetId
      const aiConditionPrompt = form.ai_condition_prompt.trim()
      const aiConditionTrueTag = form.ai_condition_true_tag.trim()
      const aiConditionFalseTag = form.ai_condition_false_tag.trim()
      const res = await fetch(
        isNew
          ? `/api/campaigns/${campaign.id}/sequence-steps`
          : `/api/campaigns/${campaign.id}/sequence-steps/${editingStepId}`,
        {
          method: isNew ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            position: existingStep?.position ?? nextPosition,
            trigger_stage_key: form.trigger_stage_key,
            wait_minutes: waitMinutes,
            channel: form.channel,
            email_type: form.email_type,
            subject_template: form.subject_template,
            body_template: form.body_template,
            move_to_stage_key: form.move_to_stage_key || null,
            stop_on_reply: form.stop_on_reply,
            active: form.active,
            metadata: {
              ...existingMetadata,
              attachments: cleanedAttachments.attachments,
              ...(form.email_type === 'lead_magnet' && form.lead_magnet_id ? { lead_magnet_id: form.lead_magnet_id } : {}),
              ...(aiConditionPrompt
                ? {
                    ai_condition: {
                      prompt: aiConditionPrompt,
                      ...(aiConditionTrueTag ? { true_tag: aiConditionTrueTag } : {}),
                      ...(aiConditionFalseTag ? { false_tag: aiConditionFalseTag } : {}),
                    },
                  }
                : {}),
            },
          }),
        },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to save sequence step')
      toast.success(isNew ? 'Sequence step created' : 'Sequence step saved')
      cancelEdit()
      await onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save sequence step')
    } finally {
      setSaving(false)
    }
  }

  const deleteStep = async (step: CampaignAutomationStep) => {
    if (!window.confirm(`Delete "${step.name}" from this sequence?`)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/sequence-steps/${step.id}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to delete sequence step')
      toast.success('Sequence step deleted')
      if (editingStepId === step.id) cancelEdit()
      await onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete sequence step')
    } finally {
      setSaving(false)
    }
  }

  const runDueSteps = async () => {
    setRunning(true)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/sequence/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 50 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to run sequence')
      const result = data.data as {
        due: number
        sent: number
        skipped: number
        failed: number
        errors?: Array<{ message: string; lead_id?: string; step_id?: string }>
      }
      const firstError = result.errors?.[0]?.message
      if (result.failed > 0) {
        toast.error(firstError || `Sequence failed for ${result.failed} lead${result.failed !== 1 ? 's' : ''}`)
      } else if (result.due === 0) {
        toast.info('No sequence steps are due yet')
      } else {
        toast.success(`Sequence ran: ${result.sent} sent, ${result.skipped} skipped`)
      }
      await onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to run sequence')
    } finally {
      setRunning(false)
    }
  }

  const editorPanel = editingStepId ? (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                {editingStepId === 'new' ? 'New rule' : 'Edit rule'}
              </h3>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                Write the touch this rule sends.
              </p>
            </div>
            {editingStepId !== 'new' && (
              <button
                type="button"
                onClick={() => {
                  const step = sortedSteps.find((item) => item.id === editingStepId)
                  if (step) void deleteStep(step)
                }}
                className="rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                aria-label="Delete sequence step"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-zinc-500">Name</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="mt-1.5 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-red-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block min-w-0">
                <span className="text-xs font-medium text-zinc-500">When in</span>
                <select
                  value={form.trigger_stage_key}
                  onChange={(event) => setForm((current) => ({ ...current, trigger_stage_key: event.target.value }))}
                  className="mt-1.5 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-red-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  {campaign.stages.map((stage) => (
                    <option key={stage.stage_key} value={stage.stage_key}>{stage.label}</option>
                  ))}
                </select>
              </label>
              <div className="block min-w-0">
                <span className="text-xs font-medium text-zinc-500">Wait</span>
                <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_112px] gap-2">
                  <input
                    type="number"
                    min="0"
                    step={form.wait_unit === 'days' ? '0.5' : '1'}
                    value={form.wait_value}
                    onChange={(event) => setForm((current) => ({ ...current, wait_value: event.target.value }))}
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-red-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  <select
                    value={form.wait_unit}
                    onChange={(event) => setForm((current) => ({ ...current, wait_unit: event.target.value as SequenceStepForm['wait_unit'] }))}
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-red-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block min-w-0">
                <span className="text-xs font-medium text-zinc-500">Channel</span>
                <select
                  value={form.channel}
                  onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value as CampaignAutomationChannel }))}
                  className="mt-1.5 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-red-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  {CAMPAIGN_AUTOMATION_CHANNELS.map((channel) => (
                    <option key={channel} value={channel}>{automationChannelLabels[channel]}</option>
                  ))}
                </select>
              </label>
              <label className="block min-w-0">
                <span className="text-xs font-medium text-zinc-500">Email type</span>
                <select
                  value={form.email_type}
                  onChange={(event) => setForm((current) => ({ ...current, email_type: event.target.value as CampaignAutomationEmailType }))}
                  className="mt-1.5 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-red-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  {CAMPAIGN_AUTOMATION_EMAIL_TYPES.map((emailType) => (
                    <option key={emailType} value={emailType}>{automationEmailTypeLabels[emailType]}</option>
                  ))}
                </select>
              </label>
            </div>

            {form.email_type === 'lead_magnet' && (
              <label className="block rounded-md border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-950/30">
                <span className="text-xs font-medium text-zinc-500">Lead magnet document</span>
                <select
                  value={form.lead_magnet_id}
                  onChange={(event) => setForm((current) => ({ ...current, lead_magnet_id: event.target.value }))}
                  className="mt-1.5 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-red-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Campaign default</option>
                  {(campaign.lead_magnets || []).map((leadMagnet) => (
                    <option key={leadMagnet.id} value={leadMagnet.id}>
                      {leadMagnet.name}{leadMagnet.is_default ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                  {(campaign.lead_magnets || []).length > 0
                    ? 'Pick a loaded Google Doc, or use the campaign default.'
                    : 'Load a lead magnet above so this step can attach a tracked PDF.'}
                </p>
              </label>
            )}

            <label className="block">
              <span className="text-xs font-medium text-zinc-500">Move to</span>
              <select
                value={form.move_to_stage_key}
                onChange={(event) => setForm((current) => ({ ...current, move_to_stage_key: event.target.value }))}
                className="mt-1.5 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-red-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="">No move</option>
                {campaign.stages.map((stage) => (
                  <option key={stage.stage_key} value={stage.stage_key}>{stage.label}</option>
                ))}
              </select>
            </label>

            <label className="block rounded-md border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-950/20">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                <Sparkles className="h-3.5 w-3.5" />
                AI condition
              </span>
              <textarea
                value={form.ai_condition_prompt}
                onChange={(event) => setForm((current) => ({ ...current, ai_condition_prompt: event.target.value }))}
                rows={4}
                placeholder="Example: Only send if the latest inbound reply clearly says yes, send it, interested, or otherwise asks for the lead magnet. If they ask for more info, object, or are unclear, do not send."
                className="mt-2 min-h-[104px] w-full resize-y rounded-md border border-blue-100 bg-white px-3 py-2.5 text-sm leading-6 text-zinc-900 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-blue-500/20 dark:border-blue-900/60 dark:bg-zinc-950 dark:text-zinc-100"
              />
              <p className="mt-1.5 text-xs leading-5 text-blue-700/80 dark:text-blue-300/80">
                Leave blank to run normally. When filled, this rule only sends if the AI says the condition is true.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] font-medium text-blue-700/80 dark:text-blue-300/80">Tag if true</span>
                  <input
                    value={form.ai_condition_true_tag}
                    onChange={(event) => setForm((current) => ({ ...current, ai_condition_true_tag: event.target.value }))}
                    placeholder="Lead magnet requested"
                    className="mt-1 h-9 w-full rounded-md border border-blue-100 bg-white px-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-blue-500/20 dark:border-blue-900/60 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-medium text-blue-700/80 dark:text-blue-300/80">Tag if false</span>
                  <input
                    value={form.ai_condition_false_tag}
                    onChange={(event) => setForm((current) => ({ ...current, ai_condition_false_tag: event.target.value }))}
                    placeholder="Needs a manual reply"
                    className="mt-1 h-9 w-full rounded-md border border-blue-100 bg-white px-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-blue-500/20 dark:border-blue-900/60 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </label>
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-zinc-500">Subject</span>
              <input
                value={form.subject_template}
                onChange={(event) => setForm((current) => ({ ...current, subject_template: event.target.value }))}
                className="mt-1.5 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-red-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>

            <div className="block">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-500">Message</span>
                <div className="group relative inline-flex">
                  <button
                    type="button"
                    className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-red-900/60 dark:hover:bg-red-950/30"
                    aria-label="Show template variables"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                  <div className="pointer-events-auto absolute left-0 top-7 z-30 hidden w-[360px] rounded-md border border-zinc-200 bg-white p-3 text-left shadow-xl group-focus-within:block group-hover:block dark:border-zinc-800 dark:bg-zinc-950">
                    <p className="text-xs font-semibold text-zinc-950 dark:text-zinc-100">Template variables</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                      Drop these into subject or message. They resolve per lead before Gmail sends.
                    </p>
                    <div className="mt-3 grid gap-1.5">
                      {campaignTemplateTokens.map((item) => (
                        <div key={item.token} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-md bg-zinc-50 px-2 py-1.5 dark:bg-zinc-900">
                          <code className="truncate text-xs font-semibold text-red-600 dark:text-red-300">{item.token}</code>
                          <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">{item.description}</span>
                          <button
                            type="button"
                            onClick={() => void copyTemplateToken(item.token)}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-400 transition hover:bg-white hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:hover:bg-zinc-800 dark:hover:text-red-300"
                            aria-label={`Copy ${item.token}`}
                            title={`Copy ${item.token}`}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <textarea
                value={form.body_template}
                onChange={(event) => setForm((current) => ({ ...current, body_template: event.target.value }))}
                rows={9}
                className="mt-1.5 min-h-[220px] w-full resize-y rounded-md border border-zinc-200 bg-white px-3 py-3 text-sm leading-6 text-zinc-900 outline-none focus:ring-2 focus:ring-red-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    <Paperclip className="h-4 w-4" />
                    Attachments
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    Files send through Gmail. Links are added to the message body.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      void addUploadedFiles(event.target.files)
                      event.target.value = ''
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Upload file
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((current) => ({
                      ...current,
                      attachments: [...current.attachments, { name: '', url: '' }],
                    }))}
                    className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Add link
                  </button>
                </div>
              </div>

              <div className="mt-2 space-y-2">
                {form.attachments.map((attachment, index) => {
                  const removeButton = (
                    <button
                      type="button"
                      onClick={() => setForm((current) => ({
                        ...current,
                        attachments: current.attachments.filter((_item, itemIndex) => itemIndex !== index),
                      }))}
                      className="flex h-9 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                      aria-label="Remove attachment"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )

                  if (attachment.data) {
                    return (
                      <div key={index} className="grid grid-cols-[minmax(0,1fr)_auto_32px] items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900/60">
                        <input
                          value={attachment.name}
                          placeholder="Filename"
                          onChange={(event) => setForm((current) => ({
                            ...current,
                            attachments: current.attachments.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, name: event.target.value } : item,
                            ),
                          }))}
                          className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-red-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                        <span className="whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
                          {formatAttachmentSize(attachment.size) || 'File'}
                        </span>
                        {removeButton}
                      </div>
                    )
                  }

                  return (
                    <div key={index} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_32px] gap-2">
                      <input
                        value={attachment.name}
                        placeholder="Link label"
                        onChange={(event) => setForm((current) => ({
                          ...current,
                          attachments: current.attachments.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, name: event.target.value } : item,
                          ),
                        }))}
                        className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-red-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                      <input
                        value={attachment.url || ''}
                        placeholder="https://..."
                        onChange={(event) => setForm((current) => ({
                          ...current,
                          attachments: current.attachments.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, url: event.target.value } : item,
                          ),
                        }))}
                        className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-red-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                      {removeButton}
                    </div>
                  )
                })}

                {form.attachments.length === 0 && (
                  <div className="rounded-md border border-dashed border-zinc-200 px-3 py-3 text-center text-xs text-zinc-400 dark:border-zinc-800">
                    No files or links attached
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2.5 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-500"
                />
                Active
              </label>
              <label className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2.5 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={form.stop_on_reply}
                  onChange={(event) => setForm((current) => ({ ...current, stop_on_reply: event.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-500"
                />
                Stop on reply
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <Button type="button" size="sm" variant="ghost" onClick={cancelEdit} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={() => void saveStep()} isLoading={saving} className="min-w-[104px]">
                Save
              </Button>
            </div>
          </div>
        </div>
  ) : null

  return (
    <section className="min-w-0 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/35 dark:text-blue-300 dark:ring-blue-900/50">
              <ListChecks className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">Sequences</h2>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                {activeStepCount} on, {inactiveStepCount} paused
              </p>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            Create rules that run from a pipeline stage: wait, send the right touch, stop on reply, and optionally move the lead.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => void runDueSteps()} isLoading={running}>
            Run due
          </Button>
          <Button type="button" size="sm" onClick={() => beginCreate()} className="whitespace-nowrap bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add rule
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        <div className="rounded-md border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-950/30">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            <Clock3 className="h-4 w-4 text-zinc-400" />
            When
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">A lead sits in a campaign stage.</p>
        </div>
        <div className="rounded-md border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-950/30">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            <Send className="h-4 w-4 text-zinc-400" />
            Send
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Use a templated Gmail touch or task.</p>
        </div>
        <div className="rounded-md border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-950/30">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            <CheckCircle2 className="h-4 w-4 text-zinc-400" />
            Then
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Move the lead or leave them in place.</p>
        </div>
      </div>

      <div className="mt-4 min-w-0">
        <div className="min-w-0 space-y-3">
          <section className="rounded-md border border-zinc-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900/70">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="flex min-w-[140px] shrink-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-50 text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:text-zinc-300 dark:ring-zinc-700">
                  <Plus className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">New rule</h3>
                  <p className="text-[11px] text-zinc-400">Trigger stage</p>
                </div>
              </div>
              <div className="grid flex-1 gap-2 sm:grid-cols-[minmax(180px,360px)_auto]">
                <select
                  value={newStepStageKey}
                  onChange={(event) => setNewStepStageKey(event.target.value)}
                  className="h-8 min-w-0 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-red-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  {campaign.stages.map((stage) => (
                    <option key={stage.stage_key} value={stage.stage_key}>{stage.label}</option>
                  ))}
                </select>
                <Button type="button" size="sm" onClick={() => beginCreate(newStepStageKey)} className="h-8 whitespace-nowrap bg-zinc-900 px-3 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add rule
                </Button>
              </div>
            </div>
            {editingStepId === 'new' && (
              <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                {editorPanel}
              </div>
            )}
          </section>

          {sortedSteps.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-200 bg-zinc-50/70 px-4 py-10 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No sequence rules yet</p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Add your first rule to send the next email or lead magnet from a campaign stage.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sequenceGroups.map((group) => (
                <section key={group.stage.stage_key} className="min-w-0 rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/70">
                  <div className="flex flex-col gap-2 border-b border-zinc-100 px-3 py-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">When lead is in</p>
                      <h3 className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-100">{group.stage.label}</h3>
                    </div>
                    {group.stage.stage_key !== 'unknown' && (
                      <button
                        type="button"
                        onClick={() => beginCreate(group.stage.stage_key)}
                        className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add rule here
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {group.steps.map((step, index) => {
                      const attachments = sequenceAttachmentsFromStep(step)
                      const aiConditionPrompt = sequenceAiConditionPromptFromStep(step)
                      const waitLabel = step.wait_minutes <= 0 ? 'Immediately' : formatWaitMinutes(step.wait_minutes)
                      const thenLabel = step.move_to_stage_key ? stageLabel(campaign.stages, step.move_to_stage_key) : 'Stay here'
                      const leadMagnetName = step.email_type === 'lead_magnet'
                        ? sequenceLeadMagnetName(campaign.lead_magnets || [], step)
                        : ''

                      return (
                        <div key={step.id}>
                          <button
                            type="button"
                            onClick={() => beginEdit(step)}
                            className={`block w-full px-3 py-3 text-left transition ${
                              editingStepId === step.id
                                ? 'bg-zinc-50 dark:bg-zinc-950/40'
                                : 'hover:bg-zinc-50 dark:hover:bg-zinc-950/40'
                            }`}
                          >
                            <div className="grid gap-3 xl:grid-cols-[minmax(180px,1.15fr)_110px_minmax(160px,1fr)_minmax(160px,1fr)_64px] xl:items-center">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-50 text-[11px] font-semibold text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:text-zinc-300 dark:ring-zinc-700">
                                    {index + 1}
                                  </span>
                                  <p className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-100">{step.name}</p>
                                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                                    step.active
                                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/35 dark:text-emerald-300 dark:ring-emerald-900/50'
                                      : 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700'
                                  }`}>
                                    {step.active ? 'On' : 'Paused'}
                                  </span>
                                  {aiConditionPrompt && (
                                    <span
                                      title={aiConditionPrompt}
                                      className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/35 dark:text-blue-300 dark:ring-blue-900/50"
                                    >
                                      <Sparkles className="h-3 w-3" />
                                      AI gate
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                                  {step.stop_on_reply ? 'Stops when they reply' : 'Keeps running after replies'}
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Wait</p>
                                <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">{waitLabel}</p>
                              </div>

                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Send</p>
                                <p className="mt-1 truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                  {automationEmailTypeLabels[step.email_type]}
                                </p>
                                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{automationChannelLabels[step.channel]}</p>
                                {leadMagnetName && (
                                  <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">Doc: {leadMagnetName}</p>
                                )}
                              </div>

                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Then</p>
                                <p className="mt-1 truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">{thenLabel}</p>
                                {attachments.length > 0 && (
                                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    <Paperclip className="h-3 w-3" />
                                    {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
                                  </p>
                                )}
                              </div>

                              <span className="text-xs font-medium text-zinc-400 xl:text-right">
                                {editingStepId === step.id ? 'Editing' : 'Edit'}
                              </span>
                            </div>
                          </button>
                          {editingStepId === step.id && (
                            <div className="border-t border-zinc-100 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-950/30">
                              {editorPanel}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

type SequenceIndicatorTone = 'amber' | 'blue' | 'emerald' | 'red' | 'zinc'

const sequenceIndicatorTones: Record<SequenceIndicatorTone, string> = {
  amber: 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/35 dark:text-amber-300 dark:ring-amber-900/50',
  blue: 'bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/35 dark:text-blue-300 dark:ring-blue-900/50',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/35 dark:text-emerald-300 dark:ring-emerald-900/50',
  red: 'bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/35 dark:text-red-300 dark:ring-red-900/50',
  zinc: 'bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700',
}

interface SequenceCardIndicator {
  label: string
  detail?: string
  title: string
  tone: SequenceIndicatorTone
}

function eventBelongsToEnrollment(event: CampaignEvent, enrollment: CampaignEnrollmentWithLead) {
  return event.enrollment_id === enrollment.id || event.lead_id === enrollment.lead_id
}

function latestStageEntryAt(enrollment: CampaignEnrollmentWithLead, events: CampaignEvent[]) {
  const stageEvent = events
    .filter((event) => event.stage_key === enrollment.stage_key && eventBelongsToEnrollment(event, enrollment))
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())[0]

  return stageEvent?.occurred_at || enrollment.last_event_at || enrollment.updated_at || enrollment.enrolled_at
}

function latestReplyAfterStageEntry(enrollment: CampaignEnrollmentWithLead, events: CampaignEvent[], stageStartedAt: string) {
  const stageStarted = new Date(stageStartedAt).getTime()
  return events.some((event) => {
    if (event.event_type !== 'email_replied' || !eventBelongsToEnrollment(event, enrollment)) return false
    return new Date(event.occurred_at).getTime() >= stageStarted
  })
}

function executionTimestamp(execution: CampaignSequenceExecution) {
  return execution.executed_at || execution.due_at || execution.created_at
}

function currentExecutionForStep({
  enrollment,
  step,
  executions,
  stageStartedAt,
}: {
  enrollment: CampaignEnrollmentWithLead
  step: CampaignAutomationStep
  executions: CampaignSequenceExecution[]
  stageStartedAt: string
}) {
  const stageStarted = new Date(stageStartedAt).getTime()

  return executions
    .filter((execution) => {
      return execution.campaign_enrollment_id === enrollment.id &&
        execution.campaign_sequence_step_id === step.id &&
        new Date(executionTimestamp(execution)).getTime() >= stageStarted
    })
    .sort((a, b) => new Date(executionTimestamp(b)).getTime() - new Date(executionTimestamp(a)).getTime())[0]
}

function formatWaitUntil(dueAt: Date, now: Date) {
  const minutes = Math.max(0, Math.ceil((dueAt.getTime() - now.getTime()) / 60_000))
  if (minutes <= 0) return 'now'
  return formatWaitMinutes(minutes)
}

function getEnrollmentSequenceIndicator({
  enrollment,
  steps,
  executions,
  events,
}: {
  enrollment: CampaignEnrollmentWithLead
  steps: CampaignAutomationStep[]
  executions: CampaignSequenceExecution[]
  events: CampaignEvent[]
}): SequenceCardIndicator | null {
  const activeStageSteps = steps
    .filter((step) => step.active && step.trigger_stage_key === enrollment.stage_key)
    .sort((a, b) => a.position - b.position || new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  if (activeStageSteps.length === 0) return null

  const stageStartedAt = latestStageEntryAt(enrollment, events)
  const stoppedByReply = activeStageSteps.some((step) => step.stop_on_reply) &&
    latestReplyAfterStageEntry(enrollment, events, stageStartedAt)

  if (stoppedByReply) {
    return {
      label: 'Stopped by reply',
      detail: formatShortDate(stageStartedAt),
      title: 'A reply happened after this lead entered the current stage, so stop-on-reply sequence rules will not send.',
      tone: 'zinc',
    }
  }

  if (!enrollment.lead?.contact_email && activeStageSteps.some((step) => step.channel === 'email')) {
    return {
      label: 'No email',
      detail: 'sequence blocked',
      title: 'This stage has an email sequence rule, but the lead has no email address.',
      tone: 'red',
    }
  }

  const now = new Date()
  let latestTerminal: SequenceCardIndicator | null = null

  for (const step of activeStageSteps) {
    const execution = currentExecutionForStep({ enrollment, step, executions, stageStartedAt })
    const stepLabel = step.name || automationEmailTypeLabels[step.email_type]

    if (execution?.status === 'failed') {
      return {
        label: 'Sequence failed',
        detail: stepLabel,
        title: execution.error_message || `The "${stepLabel}" rule failed. Run due again after fixing the issue.`,
        tone: 'red',
      }
    }

    if (execution?.status === 'skipped') {
      if (execution.metadata?.reason === 'ai_condition_false') {
        const condition = execution.metadata.ai_condition as { reason?: string } | undefined
        latestTerminal = {
          label: 'AI gate waiting',
          detail: stepLabel,
          title: condition?.reason || `The "${stepLabel}" rule checked the AI condition and did not send.`,
          tone: 'blue',
        }
        continue
      }

      latestTerminal = {
        label: 'Sequence skipped',
        detail: stepLabel,
        title: `The "${stepLabel}" rule was skipped for this current stage entry.`,
        tone: 'zinc',
      }
      continue
    }

    if (execution?.status === 'sent') {
      latestTerminal = {
        label: 'Sequence sent',
        detail: execution.executed_at ? formatShortDate(execution.executed_at) : stepLabel,
        title: `The "${stepLabel}" rule has already sent for this current stage entry.`,
        tone: 'emerald',
      }
      continue
    }

    const dueAt = new Date(new Date(stageStartedAt).getTime() + step.wait_minutes * 60_000)
    if (dueAt <= now) {
      return {
        label: 'Due now',
        detail: stepLabel,
        title: `The "${stepLabel}" rule is due. Click Run due to send it now.`,
        tone: 'amber',
      }
    }

    return {
      label: `Waiting ${formatWaitUntil(dueAt, now)}`,
      detail: stepLabel,
      title: `The "${stepLabel}" rule is scheduled for ${dueAt.toLocaleString()}.`,
      tone: 'blue',
    }
  }

  return latestTerminal
}

function StageColumn({
  stage,
  stages,
  campaignId,
  count,
  enrollments,
  leadMagnets,
  sequenceSteps,
  sequenceExecutions,
  events,
  movingId,
  draggingEnrollmentId,
  isDropTarget,
  onMove,
  onDragStart,
  onDragEnd,
  onDragOverStage,
  onDragLeaveStage,
  onDropStage,
}: {
  stage: CampaignStage
  stages: CampaignStage[]
  campaignId: string
  count: number
  enrollments: CampaignEnrollmentWithLead[]
  leadMagnets: CampaignLeadMagnet[]
  sequenceSteps: CampaignAutomationStep[]
  sequenceExecutions: CampaignSequenceExecution[]
  events: CampaignEvent[]
  movingId: string | null
  draggingEnrollmentId: string | null
  isDropTarget: boolean
  onMove: (enrollment: CampaignEnrollmentWithLead, stageKey: string) => Promise<void>
  onDragStart: (event: DragEvent<HTMLElement>, enrollment: CampaignEnrollmentWithLead) => void
  onDragEnd: () => void
  onDragOverStage: (event: DragEvent<HTMLElement>, stageKey: string) => void
  onDragLeaveStage: (event: DragEvent<HTMLElement>, stageKey: string) => void
  onDropStage: (event: DragEvent<HTMLElement>, stageKey: string) => Promise<void>
}) {
  return (
    <section
      onDragOver={(event) => onDragOverStage(event, stage.stage_key)}
      onDragLeave={(event) => onDragLeaveStage(event, stage.stage_key)}
      onDrop={(event) => void onDropStage(event, stage.stage_key)}
      className={`flex min-h-[300px] w-[248px] max-w-[82vw] shrink-0 flex-col rounded-lg border p-2.5 shadow-sm transition ${
        isDropTarget
          ? 'border-red-300 bg-red-50/60 ring-2 ring-red-500/15 dark:border-red-900/60 dark:bg-red-950/20'
          : stage.is_goal
            ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/15'
            : 'border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/40'
      }`}
    >
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-200">{stage.label}</h2>
          {stage.is_goal && <p className="mt-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">Goal stage</p>}
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold tabular-nums text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
          {count}
        </span>
      </div>

      <div className="flex-1 space-y-2">
        {enrollments.map((enrollment) => (
          <EnrollmentCard
            key={enrollment.id}
            enrollment={enrollment}
            stages={stages}
            campaignId={campaignId}
            leadMagnets={leadMagnets}
            sequenceSteps={sequenceSteps}
            sequenceExecutions={sequenceExecutions}
            events={events}
            moving={movingId === enrollment.id}
            dragging={draggingEnrollmentId === enrollment.id}
            onMove={onMove}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
        {enrollments.length === 0 && (
          <div className="flex min-h-[104px] items-center justify-center rounded-md border border-dashed border-zinc-200 bg-white/70 px-3 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/30">
            No leads in this stage
          </div>
        )}
      </div>
    </section>
  )
}

function EnrollmentCard({
  enrollment,
  stages,
  campaignId,
  leadMagnets,
  sequenceSteps,
  sequenceExecutions,
  events,
  moving,
  dragging,
  onMove,
  onDragStart,
  onDragEnd,
}: {
  enrollment: CampaignEnrollmentWithLead
  stages: CampaignStage[]
  campaignId: string
  leadMagnets: CampaignLeadMagnet[]
  sequenceSteps: CampaignAutomationStep[]
  sequenceExecutions: CampaignSequenceExecution[]
  events: CampaignEvent[]
  moving: boolean
  dragging: boolean
  onMove: (enrollment: CampaignEnrollmentWithLead, stageKey: string) => Promise<void>
  onDragStart: (event: DragEvent<HTMLElement>, enrollment: CampaignEnrollmentWithLead) => void
  onDragEnd: () => void
}) {
  const lead = enrollment.lead
  const leadTags = lead?.lead_tags || []
  const sequenceIndicator = getEnrollmentSequenceIndicator({
    enrollment,
    steps: sequenceSteps,
    executions: sequenceExecutions,
    events,
  })

  return (
    <article
      draggable={!moving}
      onDragStart={(event) => onDragStart(event, enrollment)}
      onDragEnd={onDragEnd}
      aria-grabbed={dragging}
      className={`rounded-md border border-zinc-200 bg-white p-2.5 shadow-sm transition dark:border-zinc-800 dark:bg-zinc-950 ${
        moving
          ? 'opacity-60'
          : dragging
            ? 'cursor-grabbing opacity-55 ring-2 ring-red-500/20'
            : 'cursor-grab hover:border-zinc-300 hover:shadow-md dark:hover:border-zinc-700'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={lead ? `/leads/${lead.id}` : '#'} className="block truncate text-sm font-semibold text-zinc-950 hover:text-red-600 dark:text-zinc-100 dark:hover:text-red-400">
            {lead?.contact_name || 'Unknown lead'}
          </Link>
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{lead?.company_name || enrollment.lead_id}</p>
          {lead?.contact_email && <p className="mt-1 truncate text-[11px] text-zinc-400">{lead.contact_email}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1 text-zinc-300 dark:text-zinc-600">
          {enrollment.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {leadTags.slice(0, 3).map((tag) => (
          <span
            key={tag.id}
            title={tag.name}
            className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/35 dark:text-blue-300 dark:ring-blue-900/50"
          >
            {tag.name}
          </span>
        ))}
        {leadTags.length > 3 && (
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700">
            +{leadTags.length - 3}
          </span>
        )}
        {lead?.stage && (
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {STAGE_LABELS[lead.stage]}
          </span>
        )}
        {enrollment.last_event_at && (
          <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            <Clock3 className="h-3 w-3" />
            {formatShortDate(enrollment.last_event_at)}
          </span>
        )}
      </div>

      {sequenceIndicator && (
        <div
          title={sequenceIndicator.title}
          className={`mt-2 flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium ring-1 ${sequenceIndicatorTones[sequenceIndicator.tone]}`}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
          <span className="truncate">{sequenceIndicator.label}</span>
          {sequenceIndicator.detail && (
            <span className="min-w-0 shrink truncate opacity-75">{sequenceIndicator.detail}</span>
          )}
        </div>
      )}

      <select
        value={enrollment.stage_key}
        onChange={(event) => void onMove(enrollment, event.target.value)}
        disabled={moving}
        aria-label={`Move ${lead?.contact_name || 'lead'} to campaign stage`}
        className="mt-3 h-8 w-full rounded-md border border-zinc-200 bg-zinc-50 px-2 text-xs text-zinc-900 outline-none transition focus:ring-2 focus:ring-red-500/25 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        {stages.map((stage) => (
          <option key={stage.stage_key} value={stage.stage_key}>{stage.label}</option>
        ))}
      </select>

      {lead && (
        <Link
          href={buildCampaignComposeHref(lead.id, campaignId, enrollment.stage_key)}
          title="Compose and send from connected Gmail with this campaign attached"
          className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <Mail className="h-3.5 w-3.5" />
          Compose email
        </Link>
      )}

      <CopyChallengeLinkButton
        campaignId={campaignId}
        enrollmentId={enrollment.id}
        leadName={lead?.contact_name || 'lead'}
      />

      {leadMagnets.length > 0 && (
        <LeadMagnetDownloadButton
          campaignId={campaignId}
          enrollmentId={enrollment.id}
          leadName={lead?.contact_name || 'lead'}
          leadMagnets={leadMagnets}
        />
      )}
    </article>
  )
}

function buildCampaignComposeHref(leadId: string, campaignId: string, stageKey: string) {
  const params = new URLSearchParams({
    tab: 'emails',
    campaign_id: campaignId,
  })

  const followup = followupTypeForCampaignStage(stageKey)
  if (followup) params.set('followup', followup)

  return `/leads/${leadId}?${params.toString()}`
}

function followupTypeForCampaignStage(stageKey: string) {
  if (stageKey === 'to_send' || stageKey === 'target_list') return 'initial'
  if (stageKey === 'sent_waiting' || stageKey === 'outreach_sent') return 'follow_up_1'
  if (stageKey === 'replied' || stageKey === 'meeting_scheduled') return 'reply_needed'
  if (stageKey === 'lead_magnet_sent' || stageKey === 'diagnostic_offered') return 'follow_up_2'
  if (stageKey === 'challenge_link_clicked' || stageKey === 'application_completed') return 'follow_up_1'
  return null
}

function CopyChallengeLinkButton({
  campaignId,
  enrollmentId,
  leadName,
}: {
  campaignId: string
  enrollmentId: string
  leadName: string
}) {
  const [copying, setCopying] = useState(false)

  const copyLink = async () => {
    setCopying(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/enrollments/${enrollmentId}/tracking-link`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to create tracking link')
      await navigator.clipboard.writeText(data.data.url)
      toast.success(`Challenge link copied for ${leadName}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to copy challenge link')
    } finally {
      setCopying(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copyLink()}
      disabled={copying}
      title="Creates a tracked challenge URL with this lead's token"
      className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    >
      {copying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
      Copy challenge link
    </button>
  )
}

function LeadMagnetDownloadButton({
  campaignId,
  enrollmentId,
  leadName,
  leadMagnets,
}: {
  campaignId: string
  enrollmentId: string
  leadName: string
  leadMagnets: CampaignLeadMagnet[]
}) {
  const [downloading, setDownloading] = useState(false)
  const defaultLeadMagnet = leadMagnets.find((leadMagnet) => leadMagnet.is_default) || leadMagnets[0]

  const downloadPdf = async () => {
    if (!defaultLeadMagnet) return
    setDownloading(true)
    try {
      const params = new URLSearchParams({ lead_magnet_id: defaultLeadMagnet.id })
      const res = await fetch(`/api/campaigns/${campaignId}/enrollments/${enrollmentId}/lead-magnet?${params.toString()}`)
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed to generate PDF')
      }

      const blob = await res.blob()
      const disposition = res.headers.get('content-disposition') || ''
      const filenameMatch = disposition.match(/filename="([^"]+)"/)
      const filename = filenameMatch?.[1] || `${leadName} - ${defaultLeadMagnet.name}.pdf`
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      toast.success(`PDF generated for ${leadName}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate PDF')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void downloadPdf()}
      disabled={downloading}
      title={`Generate ${defaultLeadMagnet?.name || 'lead magnet'} with this lead's tracked link`}
      className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
    >
      {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      Download lead magnet
    </button>
  )
}

function EventFeed({ events }: { events: CampaignEvent[] }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">Recent events</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{events.length} tracked touch{events.length !== 1 ? 'es' : ''}</p>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700">
          <Clock3 className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-3 space-y-3">
        {events.slice(0, 12).map((event) => (
          <div key={event.id} className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-3 last:border-0 last:pb-0 dark:border-zinc-800">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                {CAMPAIGN_EVENT_LABELS[event.event_type] || event.event_type}
              </p>
              {event.stage_key && <p className="mt-0.5 truncate text-[11px] text-zinc-400">{event.stage_key.replaceAll('_', ' ')}</p>}
            </div>
            <time className="shrink-0 text-[11px] text-zinc-400" dateTime={event.occurred_at}>
              {formatShortDate(event.occurred_at)}
            </time>
          </div>
        ))}
        {events.length === 0 && (
          <div className="rounded-md border border-dashed border-zinc-200 bg-zinc-50/70 px-4 py-8 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">No activity yet</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Lead adds, email events, replies, and booked calls will appear here.</p>
          </div>
        )}
      </div>
    </section>
  )
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}
