import { LucideIcon } from 'lucide-react'

type Trend = 'up' | 'down' | 'neutral'

interface KpiCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: Trend
  trendValue?: string
  description?: string
}

export default function KpiCard({
  title,
  value,
  icon: Icon,
  trend = 'neutral',
  trendValue,
  description
}: KpiCardProps) {
  const trendColors = {
    up: 'text-green-600 bg-green-50',
    down: 'text-red-600 bg-red-50',
    neutral: 'text-slate-600 bg-slate-50'
  }

  const trendIcons = {
    up: '↗',
    down: '↘',
    neutral: '→'
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <Icon className="h-6 w-6 text-indigo-600" />
        </div>
        {trend !== 'neutral' && trendValue && (
          <div className={`text-xs font-medium px-2 py-1 rounded-full ${trendColors[trend]}`}>
            {trendIcons[trend]} {trendValue}
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <p className="text-slate-500 text-sm">{title}</p>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        {description && (
          <p className="text-slate-400 text-xs">{description}</p>
        )}
      </div>
    </div>
  )
}
