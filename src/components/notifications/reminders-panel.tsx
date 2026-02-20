'use client'

import { useState } from 'react'
import { Bell, X, CheckCircle, AlertTriangle, Calendar, TrendingDown, UserX } from 'lucide-react'
import { useReminders, useMarkAsRead, useMarkAsResolved } from '@/hooks/use-reminders'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

type ReminderType = 'stale_deal' | 'stale_contact' | 'overdue_activity' | 'upcoming_followup'

const typeConfig: Record<ReminderType, {
  icon: React.ReactNode
  color: string
  label: string
}> = {
  stale_deal: {
    icon: <TrendingDown className="h-4 w-4" />,
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    label: 'Stale Deal'
  },
  stale_contact: {
    icon: <UserX className="h-4 w-4" />,
    color: 'bg-rose-100 text-rose-800 border-rose-200',
    label: 'Stale Contact'
  },
  overdue_activity: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'bg-red-100 text-red-800 border-red-200',
    label: 'Overdue'
  },
  upcoming_followup: {
    icon: <Calendar className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    label: 'Follow-up'
  }
}

export function RemindersPanel() {
  const [isOpen, setIsOpen] = useState(false)
  
  const { data: reminders = [], isLoading, refetch } = useReminders({ isResolved: false })
  const { mutate: markAsRead } = useMarkAsRead()
  const { mutate: markAsResolved } = useMarkAsResolved()
  // const { mutate: deleteReminder } = useDeleteReminder()
  
  const unreadCount = reminders.filter(r => !r.is_read).length
  
  const handleMarkAsRead = (id: string) => {
    markAsRead(id)
  }
  
  const handleMarkAsResolved = (id: string) => {
    markAsResolved(id)
  }
  
  // const handleDelete = (id: string) => {
  //   deleteReminder(id)
  // }
  
  const handleMarkAllAsRead = () => {
    reminders
      .filter(reminder => !reminder.is_read)
      .forEach(reminder => markAsRead(reminder.id))
  }
  
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 p-0">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-600 text-xs text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-96 max-h-[80vh] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs"
              >
                Mark all as read
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => refetch()}
              className="h-6 w-6 p-0"
            >
              <span className="sr-only">Refresh</span>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </Button>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <div className="py-8 text-center text-slate-500">
            Loading reminders...
          </div>
        ) : reminders.length === 0 ? (
          <div className="py-8 text-center text-slate-500">
            <Bell className="h-12 w-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No notifications</p>
            <p className="text-xs text-slate-400 mt-1">You&apos;re all caught up!</p>
          </div>
        ) : (
          <div className="py-1">
            {reminders.map((reminder) => (
              <DropdownMenuItem
                key={reminder.id}
                className="flex flex-col items-start gap-1 py-3 cursor-default"
                onSelect={(e) => e.preventDefault()}
              >
                <div className="flex items-start justify-between w-full">
                  <div className="flex items-start gap-2">
                    {typeConfig[reminder.type as ReminderType]?.icon || (
                      <Bell className="h-4 w-4 mt-0.5 text-slate-500" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{reminder.title}</p>
                        <Badge 
                          variant="outline"
                          className={`text-xs ${
                            typeConfig[reminder.type as ReminderType]?.color || 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          {typeConfig[reminder.type as ReminderType]?.label || reminder.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{reminder.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        {reminder.due_date && (
                          <span>
                            Due: {new Date(reminder.due_date).toLocaleDateString()}
                          </span>
                        )}
                        {!reminder.is_read && (
                          <span className="text-blue-600 font-medium">
                            New
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {!reminder.is_read && (
                      <Button
                        variant="ghost"
                        onClick={() => handleMarkAsRead(reminder.id)}
                        className="h-6 w-6 p-0"
                        title="Mark as read"
                      >
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() => handleMarkAsResolved(reminder.id)}
                      className="h-6 w-6 p-0"
                      title="Mark as resolved"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkAsResolved(reminder.id)}
                    className="h-7 text-xs"
                  >
                    Resolve
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // Navigate to the entity
                      console.log('Navigate to:', reminder.entity_type, reminder.entity_id)
                    }}
                    className="h-7 text-xs"
                  >
                    View
                  </Button>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="text-xs text-slate-500 justify-center cursor-default"
          onSelect={(e) => e.preventDefault()}
        >
          {reminders.length} notification{reminders.length !== 1 ? 's' : ''}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
