'use client'

import { useEffect, useMemo, useState, type ComponentType, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Loader2,
  Megaphone,
  MousePointerClick,
  Plus,
  RefreshCw,
  Send,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { CAMPAIGN_TEMPLATE_OPTIONS } from './template-options'
import {
  CAMPAIGN_TYPE_LABELS,
  CAMPAIGN_TEMPLATES,
  type CampaignListItem,
  type CampaignTemplateKey,
} from '@/types/campaigns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [templateKey, setTemplateKey] = useState<CampaignTemplateKey>('email_outbound_lead_magnet')
  const [leadMagnetName, setLeadMagnetName] = useState('Free Pentest Challenge')
  const [landingSlug, setLandingSlug] = useState('')

  const selectedTemplate = CAMPAIGN_TEMPLATES[templateKey]
  const totals = useMemo(() => {
    return campaigns.reduce(
      (acc, campaign) => {
        acc.enrolled += campaign.metrics.leads_enrolled
        acc.sent += campaign.metrics.initial_emails_sent
        acc.replies += campaign.metrics.replies
        acc.meetings += campaign.metrics.meetings_booked
        acc.applications += campaign.metrics.applications_completed
        return acc
      },
      { enrolled: 0, sent: 0, replies: 0, meetings: 0, applications: 0 },
    )
  }, [campaigns])

  const replyRate = totals.sent > 0 ? Math.round((totals.replies / totals.sent) * 100) : 0
  const meetingRate = totals.enrolled > 0 ? Math.round((totals.meetings / totals.enrolled) * 100) : 0

  const loadCampaigns = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const res = await fetch('/api/campaigns')
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to load campaigns')
      setCampaigns(data.data || [])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load campaigns'
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCampaigns()
  }, [])

  const createCampaign = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      toast.error('Campaign name is required')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          campaign_type: selectedTemplate.campaignType,
          template_key: templateKey,
          lead_magnet_name: leadMagnetName.trim() || null,
          landing_slug: landingSlug.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to create campaign')
      toast.success('Campaign created')
      setName('')
      setLandingSlug('')
      await loadCampaigns()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create campaign')
    } finally {
      setCreating(false)
    }
  }

  const handleTemplateChange = (nextTemplateKey: CampaignTemplateKey) => {
    setTemplateKey(nextTemplateKey)
    if (nextTemplateKey === 'conference_in_person_hormozi') {
      setLeadMagnetName('Free AI Security Diagnostic')
      setLandingSlug('')
    } else if (!leadMagnetName.trim() || leadMagnetName === 'Free AI Security Diagnostic') {
      setLeadMagnetName('Free Pentest Challenge')
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <Megaphone className="h-3.5 w-3.5" />
            Campaign command center
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100">Campaigns</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {campaigns.length} active funnel{campaigns.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void loadCampaigns()} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_420px]">
        <form
          onSubmit={createCampaign}
          className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70"
        >
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">Launch Campaign</h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{selectedTemplate.name}</p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {CAMPAIGN_TYPE_LABELS[selectedTemplate.campaignType]}
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <Field label="Campaign" htmlFor="campaign-name">
              <Input
                id="campaign-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Vertical AI Founders Outbound Q3"
              />
            </Field>
            <Field label="Template" htmlFor="campaign-template">
              <select
                id="campaign-template"
                value={templateKey}
                onChange={(event) => handleTemplateChange(event.target.value as CampaignTemplateKey)}
                className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-500/10 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {CAMPAIGN_TEMPLATE_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label={templateKey === 'conference_in_person_hormozi' ? 'Diagnostic Offer' : 'Asset'} htmlFor="lead-magnet">
              <Input
                id="lead-magnet"
                value={leadMagnetName}
                onChange={(event) => setLeadMagnetName(event.target.value)}
                placeholder="Free Pentest Challenge"
              />
            </Field>
            <Field label="Landing Slug" htmlFor="landing-slug">
              <Input
                id="landing-slug"
                value={landingSlug}
                onChange={(event) => setLandingSlug(event.target.value)}
                placeholder="ai-playbook"
              />
            </Field>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {selectedTemplate.stages.slice(0, 5).map((stage) => (
                <span key={stage.key} className="rounded-full bg-zinc-50 px-2 py-1 text-[11px] font-medium text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-800">
                  {stage.label}
                </span>
              ))}
            </div>
            <Button type="submit" variant="destructive" isLoading={creating} className="sm:min-w-[132px]">
              <Plus className="mr-2 h-4 w-4" />
              Create
            </Button>
          </div>
        </form>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <Metric icon={Users} label="Enrolled" value={totals.enrolled} tone="red" />
          <Metric icon={Send} label="Initial Sent" value={totals.sent} tone="amber" />
          <Metric icon={MousePointerClick} label="Reply Rate" value={`${replyRate}%`} tone="blue" />
          <Metric icon={CalendarCheck} label="Meeting Rate" value={`${meetingRate}%`} tone="emerald" />
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">Active Campaigns</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{totals.applications} applications, {totals.meetings} meetings</p>
          </div>
        </div>

        {errorMessage ? (
          <div className="m-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            {errorMessage}
          </div>
        ) : loading ? (
          <div className="flex min-h-[180px] items-center justify-center text-sm text-zinc-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading campaigns
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center px-5 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <Megaphone className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-950 dark:text-zinc-100">No campaigns yet</p>
            <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">Create one above and it will appear here with funnel progress.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {campaigns.map((campaign) => (
              <CampaignRow key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      {children}
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: number | string
  tone: 'red' | 'amber' | 'blue' | 'emerald'
}) {
  const tones = {
    red: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-zinc-950 dark:text-zinc-100">{value}</p>
    </div>
  )
}

function CampaignRow({ campaign }: { campaign: CampaignListItem }) {
  const progress = campaign.metrics.leads_enrolled > 0
    ? Math.min(100, Math.round((campaign.metrics.meetings_booked / campaign.metrics.leads_enrolled) * 100))
    : 0

  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="grid gap-4 px-5 py-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50 lg:grid-cols-[minmax(0,1fr)_96px_96px_96px_96px_28px] lg:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-100">{campaign.name}</h3>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {CAMPAIGN_TYPE_LABELS[campaign.campaign_type]}
          </span>
          {campaign.metrics.meetings_booked > 0 && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{campaign.slug}</p>
          <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 sm:block">
            <div className="h-full rounded-full bg-red-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
      <CampaignNumber label="Leads" value={campaign.metrics.leads_enrolled} />
      <CampaignNumber label="Sent" value={campaign.metrics.initial_emails_sent} />
      <CampaignNumber label="Replies" value={campaign.metrics.replies} />
      <CampaignNumber label="Meetings" value={campaign.metrics.meetings_booked} />
      <ArrowRight className="hidden h-4 w-4 text-zinc-400 lg:block" />
    </Link>
  )
}

function CampaignNumber({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-950 dark:text-zinc-100">{value}</p>
    </div>
  )
}
