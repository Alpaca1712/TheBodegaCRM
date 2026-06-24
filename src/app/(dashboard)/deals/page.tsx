'use client'

import { useEffect, useMemo, useState, type ComponentType } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck,
  DollarSign,
  Loader2,
  Megaphone,
  RefreshCw,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DEAL_STAGE_LABELS,
  DEAL_STAGES,
  type DealStage,
  type OpportunityWithRelations,
} from '@/types/deals'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export default function DealsPage() {
  const [deals, setDeals] = useState<OpportunityWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [movingId, setMovingId] = useState<string | null>(null)

  const loadDeals = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/deals')
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to load deal flow')
      setDeals(data.data || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load deal flow')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDeals()
  }, [])

  const metrics = useMemo(() => {
    return deals.reduce(
      (acc, deal) => {
        const value = Number(deal.estimated_value || 0)
        if (deal.status === 'open') {
          acc.open += 1
          acc.openValue += value
          acc.weighted += value * (deal.probability / 100)
        }
        if (deal.stage === 'discovery_booked') acc.discovery += 1
        if (deal.status === 'won') acc.won += value
        return acc
      },
      { open: 0, openValue: 0, weighted: 0, discovery: 0, won: 0 },
    )
  }, [deals])

  const dealsByStage = useMemo(() => {
    const grouped = new Map<DealStage, OpportunityWithRelations[]>()
    for (const stage of DEAL_STAGES) grouped.set(stage, [])
    for (const deal of deals) grouped.get(deal.stage)?.push(deal)
    return grouped
  }, [deals])

  const moveDeal = async (deal: OpportunityWithRelations, stage: DealStage) => {
    if (deal.stage === stage) return
    setMovingId(deal.id)
    try {
      const res = await fetch(`/api/deals/${deal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to update deal')
      setDeals((current) => current.map((item) => item.id === deal.id ? data.data : item))
      toast.success('Deal updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update deal')
    } finally {
      setMovingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            <BriefcaseBusiness className="h-3.5 w-3.5" />
            Revenue workspace
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100">Deal Flow</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {metrics.open} open opportunit{metrics.open === 1 ? 'y' : 'ies'}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void loadDeals()} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={BriefcaseBusiness} label="Open Pipeline" value={currency.format(metrics.openValue)} />
        <Metric icon={DollarSign} label="Weighted" value={currency.format(metrics.weighted)} />
        <Metric icon={CalendarCheck} label="Discovery" value={metrics.discovery.toString()} />
        <Metric icon={ArrowRight} label="Won" value={currency.format(metrics.won)} />
      </div>

      {loading && deals.length === 0 ? (
        <div className="flex min-h-[320px] items-center justify-center text-sm text-zinc-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading deal flow
        </div>
      ) : deals.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center border-y border-zinc-200 bg-white px-5 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <BriefcaseBusiness className="h-5 w-5 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-950 dark:text-zinc-100">No deals yet</p>
          <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
            Discovery bookings from campaigns will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[1280px] gap-3" style={{ gridTemplateColumns: `repeat(${DEAL_STAGES.length}, minmax(240px, 1fr))` }}>
            {DEAL_STAGES.map((stage) => (
              <DealStageColumn
                key={stage}
                stage={stage}
                deals={dealsByStage.get(stage) || []}
                movingId={movingId}
                onMove={moveDeal}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
        <Icon className="h-4 w-4 text-zinc-400" />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-950 dark:text-zinc-100">{value}</p>
    </div>
  )
}

function DealStageColumn({
  stage,
  deals,
  movingId,
  onMove,
}: {
  stage: DealStage
  deals: OpportunityWithRelations[]
  movingId: string | null
  onMove: (deal: OpportunityWithRelations, stage: DealStage) => Promise<void>
}) {
  const total = deals.reduce((sum, deal) => sum + Number(deal.estimated_value || 0), 0)
  return (
    <section className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
            {DEAL_STAGE_LABELS[stage]}
          </h2>
          <p className="mt-0.5 text-[11px] text-zinc-400">{currency.format(total)}</p>
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800">
          {deals.length}
        </span>
      </div>
      <div className="space-y-2">
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} moving={movingId === deal.id} onMove={onMove} />
        ))}
      </div>
    </section>
  )
}

function DealCard({
  deal,
  moving,
  onMove,
}: {
  deal: OpportunityWithRelations
  moving: boolean
  onMove: (deal: OpportunityWithRelations, stage: DealStage) => Promise<void>
}) {
  return (
    <article className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-100">{deal.name}</p>
          {deal.lead ? (
            <Link href={`/leads/${deal.lead.id}`} className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-zinc-500 hover:text-red-600 dark:hover:text-red-400">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">{deal.lead.contact_name} · {deal.lead.company_name}</span>
            </Link>
          ) : null}
        </div>
        <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          {deal.probability}%
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {deal.estimated_value != null && (
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {currency.format(Number(deal.estimated_value))}
          </span>
        )}
        {deal.campaign && (
          <span className="inline-flex max-w-full items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <Megaphone className="h-3 w-3 shrink-0" />
            <span className="truncate">{deal.campaign.name}</span>
          </span>
        )}
      </div>

      {deal.next_step && (
        <p className="mt-3 line-clamp-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{deal.next_step}</p>
      )}

      <select
        value={deal.stage}
        onChange={(event) => void onMove(deal, event.target.value as DealStage)}
        disabled={moving}
        aria-label={`Move ${deal.name} to deal stage`}
        className="mt-3 h-8 w-full rounded-md border border-zinc-200 bg-zinc-50 px-2 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        {DEAL_STAGES.map((stage) => (
          <option key={stage} value={stage}>{DEAL_STAGE_LABELS[stage]}</option>
        ))}
      </select>
    </article>
  )
}
