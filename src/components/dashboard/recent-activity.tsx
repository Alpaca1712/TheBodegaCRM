import { Activity, CalendarDays, Mail, MessageSquare, Phone, CheckCircle } from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'call' | 'email' | 'meeting' | 'task' | 'note'
  title: string
  description: string | null
  contact_name?: string
  company_name?: string
  created_at: string
}

interface RecentActivityProps {
  activities: ActivityItem[]
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  const typeIcons = {
    call: Phone,
    email: Mail,
    meeting: CalendarDays,
    task: CheckCircle,
    note: MessageSquare
  }

  const typeColors = {
    call: 'text-blue-600 bg-blue-50',
    email: 'text-purple-600 bg-purple-50',
    meeting: 'text-amber-600 bg-amber-50',
    task: 'text-green-600 bg-green-50',
    note: 'text-slate-600 bg-slate-50'
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 1) {
      return 'Just now'
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffHours < 168) { // 7 days
      return `${Math.floor(diffHours / 24)}d ago`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  if (!activities.length) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
        <div className="text-center py-8 text-slate-500">
          No recent activity
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
        <Activity className="h-5 w-5 text-slate-400" />
      </div>
      
      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = typeIcons[activity.type]
          return (
            <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
              <div className={`p-2 rounded-lg ${typeColors[activity.type]}`}>
                <Icon className="h-4 w-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{activity.title}</p>
                {activity.description && (
                  <p className="text-sm text-slate-600 truncate">{activity.description}</p>
                )}
                
                <div className="flex items-center space-x-2 mt-1">
                  {activity.contact_name && (
                    <span className="text-xs text-slate-500 truncate">
                      {activity.contact_name}
                    </span>
                  )}
                  {activity.company_name && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-500 truncate">
                        {activity.company_name}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="text-xs text-slate-400 whitespace-nowrap">
                {formatTime(activity.created_at)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
