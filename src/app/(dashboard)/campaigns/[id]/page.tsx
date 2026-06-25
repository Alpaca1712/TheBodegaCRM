'use client'

import { useEffect, useMemo, useState, type ComponentType, type DragEvent } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  GripVertical,
  Link2,
  ListChecks,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import type { CampaignDetail, CampaignEnrollmentWithLead, CampaignEvent, CampaignSequenceStep, CampaignStage } from '@/types/campaigns'
import { CAMPAIGN_EVENT_LABELS, CAMPAIGN_TEMPLATES, CAMPAIGN_TYPE_LABELS } from '@/types/campaigns'
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
  const sequenceSteps = campaign.template_key ? CAMPAIGN_TEMPLATES[campaign.template_key].sequenceSteps : []
  const meetingRate = campaign.metrics.leads_enrolled > 0
    ? Math.round((campaign.metrics.meetings_booked / campaign.metrics.leads_enrolled) * 100)
    : 0
  const replyRate = campaign.metrics.initial_emails_sent > 0
    ? Math.round((campaign.metrics.replies / campaign.metrics.initial_emails_sent) * 100)
    : 0

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <header className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <Link href="/campaigns" className="mb-3 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              <ArrowLeft className="h-4 w-4" />
              Campaigns
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100">{campaign.name}</h1>
              <StatusBadge status={campaign.status} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <span>{CAMPAIGN_TYPE_LABELS[campaign.campaign_type]}</span>
              <span className="hidden text-zinc-300 sm:inline">/</span>
              <span>{templateName}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {campaign.landing_url && <CopyLandingLinkButton url={campaign.landing_url} />}
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

        <div className="mt-5 grid gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800 sm:grid-cols-2 lg:grid-cols-4">
          <HeaderFact label="Goal" value={cta} />
          <HeaderFact label="Available leads" value={`${availableLeads.length} not enrolled`} />
          <HeaderFact label="Funnel stages" value={`${campaign.stages.length} stages`} />
          <HeaderFact label="Landing page" value={formatLandingLinkLabel(campaign.landing_url)} />
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={Users} label="Enrolled" value={campaign.metrics.leads_enrolled} tone="red" />
        <MetricCard icon={Send} label="Emails sent" value={campaign.metrics.initial_emails_sent} tone="amber" />
        <MetricCard icon={Mail} label="Reply rate" value={`${replyRate}%`} tone="blue" />
        <MetricCard icon={CalendarCheck} label="Meetings" value={campaign.metrics.meetings_booked} tone="emerald" />
        <MetricCard icon={CheckCircle2} label="Meeting rate" value={`${meetingRate}%`} tone="zinc" />
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
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

        <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-2">
          <div className="flex w-max gap-3">
            {campaign.stages.map((stage) => (
              <StageColumn
                key={stage.id}
                stage={stage}
                stages={campaign.stages}
                campaignId={campaign.id}
                count={stageCounts[stage.stage_key] || 0}
                enrollments={campaign.enrollments.filter((enrollment) => enrollment.stage_key === stage.stage_key)}
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

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_340px_340px]">
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
        <SequencePanel steps={sequenceSteps} />
        <EventFeed events={campaign.events} />
      </section>
    </div>
  )
}

function HeaderFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">{value}</p>
    </div>
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
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-md ring-1 ${metricTones[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-zinc-950 dark:text-zinc-100">{value}</p>
    </div>
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
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
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

      <div className="mt-4 flex items-center gap-2">
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

      <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto pr-1">
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
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

function SequencePanel({ steps }: { steps: CampaignSequenceStep[] }) {
  if (steps.length === 0) return null

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">Sequence</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{steps.length} planned touch{steps.length !== 1 ? 'es' : ''}</p>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/35 dark:text-blue-300 dark:ring-blue-900/50">
          <ListChecks className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <div key={step.key} className="grid grid-cols-[26px_minmax(0,1fr)] gap-3">
            <div className="flex flex-col items-center">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700">
                {index + 1}
              </span>
              {index < steps.length - 1 && <span className="mt-1 h-full min-h-4 w-px bg-zinc-200 dark:bg-zinc-800" />}
            </div>
            <div className="min-w-0 pb-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">{step.label}</p>
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  {step.channel.replace('_', ' ')}
                </span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{step.timing}</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{step.goal}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function StageColumn({
  stage,
  stages,
  campaignId,
  count,
  enrollments,
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
      className={`flex min-h-[320px] w-[280px] max-w-[82vw] shrink-0 flex-col rounded-lg border p-3 shadow-sm transition ${
        isDropTarget
          ? 'border-red-300 bg-red-50/60 ring-2 ring-red-500/15 dark:border-red-900/60 dark:bg-red-950/20'
          : stage.is_goal
            ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/15'
            : 'border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/40'
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
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
            moving={movingId === enrollment.id}
            dragging={draggingEnrollmentId === enrollment.id}
            onMove={onMove}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
        {enrollments.length === 0 && (
          <div className="flex min-h-[120px] items-center justify-center rounded-md border border-dashed border-zinc-200 bg-white/70 px-4 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/30">
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
  moving,
  dragging,
  onMove,
  onDragStart,
  onDragEnd,
}: {
  enrollment: CampaignEnrollmentWithLead
  stages: CampaignStage[]
  campaignId: string
  moving: boolean
  dragging: boolean
  onMove: (enrollment: CampaignEnrollmentWithLead, stageKey: string) => Promise<void>
  onDragStart: (event: DragEvent<HTMLElement>, enrollment: CampaignEnrollmentWithLead) => void
  onDragEnd: () => void
}) {
  const lead = enrollment.lead

  return (
    <article
      draggable={!moving}
      onDragStart={(event) => onDragStart(event, enrollment)}
      onDragEnd={onDragEnd}
      aria-grabbed={dragging}
      className={`rounded-md border border-zinc-200 bg-white p-3 shadow-sm transition dark:border-zinc-800 dark:bg-zinc-950 ${
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

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
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

function EventFeed({ events }: { events: CampaignEvent[] }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">Recent events</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{events.length} tracked touch{events.length !== 1 ? 'es' : ''}</p>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700">
          <Clock3 className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-4 space-y-3">
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
