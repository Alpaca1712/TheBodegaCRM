'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Download } from 'lucide-react'
import Link from 'next/link'
import PipelineBoard from '@/components/deals/pipeline-board'
import { getDealsByStage, type Deal } from '@/lib/api/deals'
import { exportDealsToCSV } from '@/lib/utils/csv-export'

const STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']

export default function DealsPage() {
  const [dealsByStage, setDealsByStage] = useState<Record<string, Deal[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDeals = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getDealsByStage()
      if (result.error) {
        setError(result.error)
      } else {
        const grouped: Record<string, Deal[]> = {}
        for (const stage of STAGES) {
          grouped[stage] = (result.data || []).filter(d => d.stage === stage)
        }
        setDealsByStage(grouped)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deals')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDeals()
  }, [loadDeals])

  const handleStageChange = (dealId: string, newStage: Deal['stage']) => {
    setDealsByStage(prev => {
      const updated = { ...prev }
      let movedDeal: Deal | undefined
      for (const stage of STAGES) {
        const idx = (updated[stage] || []).findIndex(d => d.id === dealId)
        if (idx !== -1) {
          movedDeal = updated[stage][idx]
          updated[stage] = [...updated[stage].slice(0, idx), ...updated[stage].slice(idx + 1)]
          break
        }
      }
      if (movedDeal) {
        movedDeal = { ...movedDeal, stage: newStage }
        updated[newStage] = [...(updated[newStage] || []), movedDeal]
      }
      return updated
    })
  }

  const allDeals = Object.values(dealsByStage).flat()
  const totalValue = allDeals.reduce((sum, d) => sum + (d.value || 0), 0)

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <div className="animate-pulse">
            <div className="h-7 w-40 bg-zinc-200 rounded mb-1" />
            <div className="h-4 w-56 bg-zinc-100 rounded" />
          </div>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="w-[280px] shrink-0 h-80 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Deals</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {allDeals.length} deal{allDeals.length !== 1 ? 's' : ''} · ${totalValue.toLocaleString()} total pipeline
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportDealsToCSV(allDeals)}
            disabled={allDeals.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-medium rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <Link
            href="/deals/new"
            className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-600/20"
          >
            <Plus size={16} />
            New Deal
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          <button onClick={loadDeals} className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline">Retry</button>
        </div>
      )}

      <PipelineBoard dealsByStage={dealsByStage} onStageChange={handleStageChange} />
    </div>
  )
}
