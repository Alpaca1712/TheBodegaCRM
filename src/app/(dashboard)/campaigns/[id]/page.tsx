'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import type { CampaignDetail, CampaignEnrollmentWithLead, CampaignStage } from '@/types/campaigns'
import { CAMPAIGN_EVENT_LABELS, CAMPAIGN_TYPE_LABELS } from '@/types/campaigns'
import type { Lead } from '@/types/leads'
import { Button } from '@/components/ui/button'

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>()
  const campaignId = params.id
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [movingId, setMovingId] = useState<string | null>(null)

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

  const enrollSelectedLead = async () => {
    if (!selectedLeadId) return
    setEnrolling(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids: [selectedLeadId] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to enroll lead')
      toast.success('Lead enrolled')
      setSelectedLeadId('')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to enroll lead')
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Link href="/campaigns" className="mb-3 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            <ArrowLeft className="h-4 w-4" />
            Campaigns
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{campaign.name}</h1>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {campaign.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {CAMPAIGN_TYPE_LABELS[campaign.campaign_type]} · {campaign.slug}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="enroll-lead" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Enroll Lead
            </label>
            <select
              id="enroll-lead"
              value={selectedLeadId}
              onChange={(event) => setSelectedLeadId(event.target.value)}
              className="h-10 min-w-[260px] rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="">Select lead</option>
              {availableLeads.map((lead) => (
                <option key={lead.id} value={lead.id}>{lead.contact_name} · {lead.company_name}</option>
              ))}
            </select>
          </div>
          <Button type="button" variant="destructive" disabled={!selectedLeadId} isLoading={enrolling} onClick={() => void enrollSelectedLead()}>
            <UserPlus className="mr-2 h-4 w-4" />
            Enroll
          </Button>
          <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        <Metric label="Enrolled" value={campaign.metrics.leads_enrolled} />
        <Metric label="Initial Sent" value={campaign.metrics.initial_emails_sent} />
        <Metric label="Replies" value={campaign.metrics.replies} />
        <Metric label="Applications" value={campaign.metrics.applications_completed} />
        <Metric label="Meetings" value={campaign.metrics.meetings_booked} />
      </div>

      {campaign.assets.length > 0 && (
        <div className="border-y border-zinc-200 bg-white py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Tracking</p>
          <div className="flex flex-wrap gap-2">
            {campaign.assets.map((asset) => (
              <span key={asset.id} className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {asset.url || asset.slug || asset.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[1100px] gap-3" style={{ gridTemplateColumns: `repeat(${campaign.stages.length}, minmax(220px, 1fr))` }}>
          {campaign.stages.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              stages={campaign.stages}
              enrollments={campaign.enrollments.filter((enrollment) => enrollment.stage_key === stage.stage_key)}
              movingId={movingId}
              onMove={moveEnrollment}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recent Events</h2>
        <div className="space-y-2">
          {campaign.events.slice(0, 12).map((event) => (
            <div key={event.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {CAMPAIGN_EVENT_LABELS[event.event_type] || event.event_type}
              </span>
              <span className="text-zinc-400">{new Date(event.occurred_at).toLocaleString()}</span>
            </div>
          ))}
          {campaign.events.length === 0 && <p className="text-sm text-zinc-500">No events yet.</p>}
        </div>
      </div>
    </div>
  )
}

function StageColumn({
  stage,
  stages,
  enrollments,
  movingId,
  onMove,
}: {
  stage: CampaignStage
  stages: CampaignStage[]
  enrollments: CampaignEnrollmentWithLead[]
  movingId: string | null
  onMove: (enrollment: CampaignEnrollmentWithLead, stageKey: string) => Promise<void>
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{stage.label}</h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800">
          {enrollments.length}
        </span>
      </div>
      <div className="space-y-2">
        {enrollments.map((enrollment) => (
          <EnrollmentCard
            key={enrollment.id}
            enrollment={enrollment}
            stages={stages}
            moving={movingId === enrollment.id}
            onMove={onMove}
          />
        ))}
      </div>
    </section>
  )
}

function EnrollmentCard({
  enrollment,
  stages,
  moving,
  onMove,
}: {
  enrollment: CampaignEnrollmentWithLead
  stages: CampaignStage[]
  moving: boolean
  onMove: (enrollment: CampaignEnrollmentWithLead, stageKey: string) => Promise<void>
}) {
  const lead = enrollment.lead
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={lead ? `/leads/${lead.id}` : '#'} className="block truncate text-sm font-semibold text-zinc-900 hover:text-red-600 dark:text-zinc-100 dark:hover:text-red-400">
            {lead?.contact_name || 'Unknown lead'}
          </Link>
          <p className="truncate text-xs text-zinc-500">{lead?.company_name || enrollment.lead_id}</p>
        </div>
        {enrollment.status === 'completed' && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
      </div>
      <div className="mt-3 space-y-2">
        <select
          value={enrollment.stage_key}
          onChange={(event) => void onMove(enrollment, event.target.value)}
          disabled={moving}
          aria-label={`Move ${lead?.contact_name || 'lead'} to campaign stage`}
          className="h-8 w-full rounded-md border border-zinc-200 bg-zinc-50 px-2 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          {stages.map((stage) => (
            <option key={stage.stage_key} value={stage.stage_key}>{stage.label}</option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1.5">
          {enrollment.status !== 'active' && (
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {enrollment.status}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-y border-zinc-200 bg-white py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  )
}
