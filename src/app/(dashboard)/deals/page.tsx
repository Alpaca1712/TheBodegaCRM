'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import PipelineBoard from '@/components/deals/pipeline-board'
import { getDealsByStage } from '@/lib/api/deals'
import type { Deal } from '@/lib/api/deals'

const STAGES = [
  { key: 'lead', label: 'Lead', color: 'bg-blue-100 text-blue-800' },
  { key: 'qualified', label: 'Qualified', color: 'bg-indigo-100 text-indigo-800' },
  { key: 'proposal', label: 'Proposal', color: 'bg-purple-100 text-purple-800' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-yellow-100 text-yellow-800' },
  { key: 'closed_won', label: 'Closed Won', color: 'bg-green-100 text-green-800' },
  { key: 'closed_lost', label: 'Closed Lost', color: 'bg-red-100 text-red-800' },
]

export default function DealsPage() {
  const [dealsByStage, setDealsByStage] = useState<Record<string, Deal[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDeals() {
      setIsLoading(true)
      setError(null)

      try {
        const stageData: Record<string, Deal[]> = {}
        
        // Load all deals
        const result = await getDealsByStage()
        if (result.error) {
          console.error('Error loading deals:', result.error)
          setError(result.error)
        } else {
          // Group deals by stage
          const allDeals = result.data || []
          for (const stage of STAGES) {
            stageData[stage.key] = allDeals.filter(deal => deal.stage === stage.key)
          }
        }

        setDealsByStage(stageData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load deals')
      } finally {
        setIsLoading(false)
      }
    }

    loadDeals()
  }, [])

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-96 bg-slate-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-96 bg-slate-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Deals Pipeline</h1>
        <p className="text-slate-600">Track your sales deals through each stage of the pipeline</p>
        <div className="mt-4 flex justify-between items-center">
          <div className="flex space-x-2">
            <Link href="/deals/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Deal
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      <PipelineBoard dealsByStage={dealsByStage} />
    </div>
  )
}
