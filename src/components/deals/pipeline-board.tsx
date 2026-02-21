'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DollarSign, Calendar, Building, User, GripVertical } from 'lucide-react'
import { updateDeal, type Deal } from '@/lib/api/deals'
import { toast } from 'sonner'

const STAGES = [
  { key: 'lead', label: 'Lead', color: 'bg-blue-500', lightColor: 'bg-blue-50 dark:bg-blue-950', textColor: 'text-blue-700 dark:text-blue-300' },
  { key: 'qualified', label: 'Qualified', color: 'bg-indigo-500', lightColor: 'bg-indigo-50 dark:bg-indigo-950', textColor: 'text-indigo-700 dark:text-indigo-300' },
  { key: 'proposal', label: 'Proposal', color: 'bg-purple-500', lightColor: 'bg-purple-50 dark:bg-purple-950', textColor: 'text-purple-700 dark:text-purple-300' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-amber-500', lightColor: 'bg-amber-50 dark:bg-amber-950', textColor: 'text-amber-700 dark:text-amber-300' },
  { key: 'closed_won', label: 'Won', color: 'bg-emerald-500', lightColor: 'bg-emerald-50 dark:bg-emerald-950', textColor: 'text-emerald-700 dark:text-emerald-300' },
  { key: 'closed_lost', label: 'Lost', color: 'bg-red-500', lightColor: 'bg-red-50 dark:bg-red-950', textColor: 'text-red-700 dark:text-red-300' },
]

interface PipelineBoardProps {
  dealsByStage: Record<string, Deal[]>
  onStageChange?: (dealId: string, newStage: Deal['stage']) => void
}

export default function PipelineBoard({ dealsByStage, onStageChange }: PipelineBoardProps) {
  const router = useRouter()
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, deal: Deal) => {
    setDraggedDeal(deal)
    e.dataTransfer.setData('text/plain', deal.id)
    e.dataTransfer.effectAllowed = 'move'
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5'
    }
  }

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedDeal(null)
    setDragOverStage(null)
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
  }

  const handleDragOver = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverStage !== stageKey) {
      setDragOverStage(stageKey)
    }
  }

  const handleDragLeave = () => {
    setDragOverStage(null)
  }

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault()
    setDragOverStage(null)

    if (!draggedDeal || draggedDeal.stage === targetStage) {
      setDraggedDeal(null)
      return
    }

    const dealId = draggedDeal.id
    setIsUpdating(dealId)

    try {
      const result = await updateDeal(dealId, { stage: targetStage as Deal['stage'] })
      if (result.error) {
        toast.error(`Failed to move deal: ${result.error}`)
      } else {
        toast.success(`Moved to ${STAGES.find(s => s.key === targetStage)?.label}`)
        onStageChange?.(dealId, targetStage as Deal['stage'])
      }
    } catch {
      toast.error('Failed to move deal')
    } finally {
      setIsUpdating(null)
      setDraggedDeal(null)
    }
  }

  const stageTotal = (stageKey: string) => {
    return (dealsByStage[stageKey] || []).reduce((sum, d) => sum + (d.value || 0), 0)
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
      {STAGES.map((stage) => {
        const deals = dealsByStage[stage.key] || []
        const isDragTarget = dragOverStage === stage.key && draggedDeal?.stage !== stage.key

        return (
          <div
            key={stage.key}
            className="shrink-0 w-[280px] flex flex-col"
            onDragOver={(e) => handleDragOver(e, stage.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.key)}
          >
            {/* Column Header */}
            <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg mb-2 ${stage.lightColor}`}>
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
                <span className={`text-sm font-semibold ${stage.textColor}`}>{stage.label}</span>
                <span className={`text-xs font-medium ${stage.textColor} opacity-60`}>{deals.length}</span>
              </div>
              {stageTotal(stage.key) > 0 && (
                <span className={`text-xs font-medium ${stage.textColor} opacity-80`}>
                  ${stageTotal(stage.key).toLocaleString()}
                </span>
              )}
            </div>

            {/* Drop Zone */}
            <div
              className={`flex-1 min-h-[200px] rounded-lg transition-all duration-150 space-y-2 p-1 ${
                isDragTarget
                  ? 'bg-indigo-50 dark:bg-indigo-950 border-2 border-dashed border-indigo-300 dark:border-indigo-700'
                  : 'bg-transparent'
              }`}
            >
              {deals.length === 0 && !isDragTarget && (
                <div className="flex items-center justify-center h-24 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">Drop deals here</p>
                </div>
              )}
              {isDragTarget && deals.length === 0 && (
                <div className="flex items-center justify-center h-24 rounded-lg">
                  <p className="text-xs text-indigo-500 font-medium">Release to move here</p>
                </div>
              )}
              {deals.map((deal) => (
                <div
                  key={deal.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, deal)}
                  onDragEnd={handleDragEnd}
                  onClick={() => router.push(`/deals/${deal.id}`)}
                  className={`group bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${
                    isUpdating === deal.id ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 text-zinc-300 dark:text-zinc-600 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{deal.title}</p>
                      {deal.value != null && deal.value > 0 && (
                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          ${deal.value.toLocaleString()}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {deal.probability != null && (
                          <span>{deal.probability}%</span>
                        )}
                        {deal.expected_close_date && (
                          <span className="flex items-center gap-0.5">
                            <Calendar className="h-3 w-3" />
                            {new Date(deal.expected_close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
