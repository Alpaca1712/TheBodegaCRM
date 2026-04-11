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
    up: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950',
    down: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950',
    neutral: 'text-zinc-600 bg-zinc-50 dark:text-zinc-400 dark:bg-zinc-800'
  }

  const trendIcons = {
    up: '↗',
    down: '↘',
    neutral: '→'
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow dark:shadow-zinc-800/50 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 bg-indigo-50 dark:bg-indigo-950 rounded-lg">
          <Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        {trend !== 'neutral' && trendValue && (
          <div className={`text-xs font-medium px-2 py-1 rounded-full ${trendColors[trend]}`}>
            {trendIcons[trend]} {trendValue}
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">{title}</p>
        <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
        {description && (
          <p className="text-zinc-400 dark:text-zinc-500 text-xs">{description}</p>
        )}
      </div>
    </div>
  )
}
