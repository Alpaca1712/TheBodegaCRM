'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2, Megaphone, Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import {
  CAMPAIGN_TEMPLATE_OPTIONS,
} from './template-options'
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
  const [name, setName] = useState('')
  const [templateKey, setTemplateKey] = useState<CampaignTemplateKey>('email_outbound_lead_magnet')
  const [leadMagnetName, setLeadMagnetName] = useState('Free Pentest Challenge')
  const [landingSlug, setLandingSlug] = useState('')

  const selectedTemplate = CAMPAIGN_TEMPLATES[templateKey]
  const totals = useMemo(() => {
    return campaigns.reduce(
      (acc, campaign) => {
        acc.enrolled += campaign.metrics.leads_enrolled
        acc.meetings += campaign.metrics.meetings_booked
        acc.applications += campaign.metrics.applications_completed
        return acc
      },
      { enrolled: 0, meetings: 0, applications: 0 },
    )
  }, [campaigns])

  const loadCampaigns = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/campaigns')
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to load campaigns')
      setCampaigns(data.data || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load campaigns')
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Campaigns</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {campaigns.length} active funnel{campaigns.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void loadCampaigns()} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Leads Enrolled" value={totals.enrolled} />
        <Metric label="Applications" value={totals.applications} />
        <Metric label="Meetings" value={totals.meetings} />
      </div>

      <form
        onSubmit={createCampaign}
        className="grid gap-4 border-y border-zinc-200 bg-white py-5 dark:border-zinc-800 dark:bg-zinc-900/40 lg:grid-cols-[minmax(0,1fr)_220px_220px_180px_auto] lg:items-end"
      >
        <div>
          <label htmlFor="campaign-name" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Campaign
          </label>
          <Input
            id="campaign-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Vertical AI Founders Outbound Q3"
          />
        </div>
        <div>
          <label htmlFor="campaign-template" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Template
          </label>
          <select
            id="campaign-template"
            value={templateKey}
            onChange={(event) => setTemplateKey(event.target.value as CampaignTemplateKey)}
            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {CAMPAIGN_TEMPLATE_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="lead-magnet" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Asset
          </label>
          <Input
            id="lead-magnet"
            value={leadMagnetName}
            onChange={(event) => setLeadMagnetName(event.target.value)}
            placeholder="Free Pentest Challenge"
          />
        </div>
        <div>
          <label htmlFor="landing-slug" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Landing Slug
          </label>
          <Input
            id="landing-slug"
            value={landingSlug}
            onChange={(event) => setLandingSlug(event.target.value)}
            placeholder="ai-playbook"
          />
        </div>
        <Button type="submit" variant="destructive" isLoading={creating}>
          <Plus className="mr-2 h-4 w-4" />
          Create
        </Button>
      </form>

      <div className="space-y-3">
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center text-sm text-zinc-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading campaigns
          </div>
        ) : campaigns.length === 0 ? (
          <div className="border-y border-dashed border-zinc-200 py-12 text-center dark:border-zinc-800">
            <Megaphone className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">No campaigns yet</p>
          </div>
        ) : campaigns.map((campaign) => (
          <Link
            key={campaign.id}
            href={`/campaigns/${campaign.id}`}
            className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-red-200 hover:bg-red-50/30 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-red-900/60 dark:hover:bg-red-950/10 lg:grid-cols-[minmax(0,1fr)_repeat(5,100px)_auto] lg:items-center"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{campaign.name}</h2>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {CAMPAIGN_TYPE_LABELS[campaign.campaign_type]}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{campaign.slug}</p>
            </div>
            <CampaignNumber label="Leads" value={campaign.metrics.leads_enrolled} />
            <CampaignNumber label="Sent" value={campaign.metrics.initial_emails_sent} />
            <CampaignNumber label="Replies" value={campaign.metrics.replies} />
            <CampaignNumber label="Apps" value={campaign.metrics.applications_completed} />
            <CampaignNumber label="Meetings" value={campaign.metrics.meetings_booked} />
            <ArrowRight className="hidden h-4 w-4 text-zinc-400 lg:block" />
          </Link>
        ))}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-y border-zinc-200 bg-white py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  )
}

function CampaignNumber({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  )
}
