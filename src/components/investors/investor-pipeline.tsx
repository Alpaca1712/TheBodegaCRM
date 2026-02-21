'use client'

import { Investment, InvestmentStage } from '@/lib/api/investors'
import { Card, CardContent } from '@/components/ui/card'

type InvestorPipelineProps = {
  investments: Array<Investment & { investors?: { name: string; firm: string | null } }>
  onInvestmentClick?: (investment: Investment) => void
  onInvestmentUpdate?: (investmentId: string, updates: Partial<Investment>) => void
}

const STAGE_ORDER: InvestmentStage[] = [
  'intro',
  'pitch',
  'due_diligence',
  'term_sheet',
  'negotiation',
  'closed',
  'passed'
]

const STAGE_LABELS: Record<InvestmentStage, string> = {
  intro: 'Intro',
  pitch: 'Pitch',
  due_diligence: 'Due Diligence',
  term_sheet: 'Term Sheet',
  negotiation: 'Negotiation',
  closed: 'Closed',
  passed: 'Passed'
}

const STAGE_COLORS: Record<InvestmentStage, string> = {
  intro: 'bg-blue-100 text-blue-800 border-blue-300',
  pitch: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  due_diligence: 'bg-purple-100 text-purple-800 border-purple-300',
  term_sheet: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  negotiation: 'bg-orange-100 text-orange-800 border-orange-300',
  closed: 'bg-green-100 text-green-800 border-green-300',
  passed: 'bg-red-100 text-red-800 border-red-300'
}

export default function InvestorPipeline({ 
  investments, 
  onInvestmentClick, 
  onInvestmentUpdate 
}: InvestorPipelineProps) {
  // Group investments by stage
  const investmentsByStage = investments.reduce((acc, investment) => {
    const stage = investment.stage
    if (!acc[stage]) {
      acc[stage] = []
    }
    acc[stage].push(investment)
    return acc
  }, {} as Record<InvestmentStage, typeof investments>)

  const handleDragStart = (e: React.DragEvent, investmentId: string) => {
    e.dataTransfer.setData('investmentId', investmentId)
  }

  const handleDrop = (e: React.DragEvent, targetStage: InvestmentStage) => {
    e.preventDefault()
    const investmentId = e.dataTransfer.getData('investmentId')
    
    if (onInvestmentUpdate && investmentId) {
      onInvestmentUpdate(investmentId, { stage: targetStage })
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900">Investment Pipeline</h2>
        <div className="text-sm text-zinc-500">
          Drag investments between stages to update
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
        {STAGE_ORDER.map((stage) => {
          const stageInvestments = investmentsByStage[stage] || []
          const stageTotal = stageInvestments.reduce((sum, inv) => sum + (inv.amount || 0), 0)
          
          return (
            <div 
              key={stage}
              className="flex flex-col"
              onDrop={(e) => handleDrop(e, stage)}
              onDragOver={handleDragOver}
            >
              {/* Stage header */}
              <div className={`mb-2 p-3 rounded-lg border ${STAGE_COLORS[stage]}`}>
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">{STAGE_LABELS[stage]}</h3>
                  <span className="text-sm font-bold">
                    {stageInvestments.length}
                  </span>
                </div>
                <div className="text-xs mt-1">
                  ${stageTotal.toLocaleString()}
                </div>
              </div>

              {/* Investment cards */}
              <div className="flex-1 min-h-[200px] bg-zinc-50 rounded-lg p-2 space-y-2">
                {stageInvestments.map((investment) => (
                  <Card 
                    key={investment.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, investment.id)}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onInvestmentClick && onInvestmentClick(investment)}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-zinc-900 truncate">
                              {investment.round_name}
                            </h4>
                            {investment.investors && (
                              <p className="text-xs text-zinc-600 truncate">
                                {investment.investors.name}
                                {investment.investors.firm && ` • ${investment.investors.firm}`}
                              </p>
                            )}
                          </div>
                          {investment.amount && (
                            <span className="text-sm font-bold text-zinc-900">
                              ${investment.amount.toLocaleString()}
                            </span>
                          )}
                        </div>
                        
                        <div className="text-xs text-zinc-500 space-y-1">
                          {investment.instrument && (
                            <div className="capitalize">
                              {investment.instrument.replace('_', ' ')}
                            </div>
                          )}
                          {investment.equity_percentage && (
                            <div>{investment.equity_percentage}% equity</div>
                          )}
                          {investment.pitch_date && (
                            <div>Pitch: {new Date(investment.pitch_date).toLocaleDateString()}</div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {stageInvestments.length === 0 && (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-sm text-zinc-400 text-center p-4">
                      No investments
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
