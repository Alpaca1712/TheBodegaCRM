import { Badge } from '@/components/ui/badge'
import DealCard from './deal-card'
import type { Deal } from '@/lib/api/deals'

const STAGES = [
  { key: 'lead', label: 'Lead', color: 'bg-blue-100 text-blue-800' },
  { key: 'qualified', label: 'Qualified', color: 'bg-indigo-100 text-indigo-800' },
  { key: 'proposal', label: 'Proposal', color: 'bg-purple-100 text-purple-800' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-yellow-100 text-yellow-800' },
  { key: 'closed_won', label: 'Closed Won', color: 'bg-green-100 text-green-800' },
  { key: 'closed_lost', label: 'Closed Lost', color: 'bg-red-100 text-red-800' },
]

interface PipelineBoardProps {
  dealsByStage: Record<string, Deal[]>
}

export default function PipelineBoard({ dealsByStage }: PipelineBoardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {STAGES.map((stage) => {
        const deals = dealsByStage[stage.key] || []
        const dealCount = deals.length
        
        return (
          <div key={stage.key} className="flex flex-col h-full">
            <div className={`${stage.color} rounded-t-lg px-4 py-3 mb-3`}>
              <div className="flex justify-between items-center">
                <h2 className="font-semibold">{stage.label}</h2>
                <Badge variant="secondary" className="bg-white/50 text-slate-700">
                  {dealCount}
                </Badge>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-[400px] max-h-[calc(100vh-300px)] px-2 pb-2">
              {dealCount === 0 ? (
                <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-300 rounded-lg">
                  <p>No deals in this stage</p>
                  <p className="text-xs mt-1">Drag deals here or create new ones</p>
                </div>
              ) : (
                <div>
                  {deals.map((deal) => (
                    <DealCard key={deal.id} deal={deal} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
