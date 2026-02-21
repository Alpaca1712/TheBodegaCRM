interface PipelineChartProps {
  data: Array<{
    stage: string
    value: number
    count: number
    color: string
  }>
  totalValue: number
}

export default function PipelineChart({ data, totalValue }: PipelineChartProps) {
  if (!data.length) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-zinc-900 mb-4">Deal Pipeline</h3>
        <div className="text-center py-8 text-zinc-500">
          No deals in pipeline yet
        </div>
      </div>
    )
  }

  // Normalize colors to Tailwind classes
  const colorClasses: Record<string, string> = {
    lead: 'bg-blue-500',
    qualified: 'bg-indigo-500',
    proposal: 'bg-purple-500',
    negotiation: 'bg-yellow-500',
    closed_won: 'bg-green-500',
    closed_lost: 'bg-red-500'
  }

  const stageLabels: Record<string, string> = {
    lead: 'Lead',
    qualified: 'Qualified',
    proposal: 'Proposal',
    negotiation: 'Negotiation',
    closed_won: 'Won',
    closed_lost: 'Lost'
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="text-lg font-semibold text-zinc-900 mb-4">Deal Pipeline</h3>
      
      <div className="space-y-4">
        {/* Bar chart */}
        <div className="h-8 flex rounded-lg overflow-hidden">
          {data.map((item) => {
            const widthPercentage = totalValue > 0 ? (item.value / totalValue) * 100 : 0
            return (
              <div 
                key={item.stage}
                className={`${colorClasses[item.stage] || 'bg-zinc-400'} transition-all duration-300`}
                style={{ width: `${widthPercentage}%` }}
                title={`${stageLabels[item.stage] || item.stage}: $${item.value.toLocaleString()} (${item.count} deals)`}
              />
            )
          })}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {data.map((item) => (
            <div key={item.stage} className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${colorClasses[item.stage] || 'bg-zinc-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">
                  {stageLabels[item.stage] || item.stage}
                </p>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>${item.value.toLocaleString()}</span>
                  <span>{item.count} deal{item.count !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="pt-4 border-t border-zinc-200">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-600">Total Pipeline Value</span>
            <span className="text-lg font-bold text-zinc-900">
              ${totalValue.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
