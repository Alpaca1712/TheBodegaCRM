'use client';

import { format, formatDistance } from 'date-fns';
import {
  PhoneCall,
  Mail,
  Calendar,
  CheckSquare,
  FileText,
  CheckCircle,
  Circle,
  Clock,
} from 'lucide-react';
import { Activity } from '@/lib/api/activities';
import { cn } from '@/lib/utils';

type ActivityTimelineProps = {
  activities: Activity[];
  isLoading?: boolean;
  onRefresh?: () => void;
};

export default function ActivityTimeline({
  activities,
  isLoading = false,
  onRefresh,
}: ActivityTimelineProps) {
  const getActivityIcon = (type: Activity['type'], completed: boolean) => {
    if (completed) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }

    switch (type) {
      case 'call':
        return <PhoneCall className="h-4 w-4 text-blue-500" />;
      case 'email':
        return <Mail className="h-4 w-4 text-indigo-500" />;
      case 'meeting':
        return <Calendar className="h-4 w-4 text-purple-500" />;
      case 'task':
        return <CheckSquare className="h-4 w-4 text-amber-500" />;
      case 'note':
        return <FileText className="h-4 w-4 text-slate-500" />;
      default:
        return <Circle className="h-4 w-4 text-slate-500" />;
    }
  };

  const getActivityColor = (type: Activity['type'], completed: boolean) => {
    if (completed) return 'border-green-200 bg-green-50';

    switch (type) {
      case 'call':
        return 'border-blue-200 bg-blue-50';
      case 'email':
        return 'border-indigo-200 bg-indigo-50';
      case 'meeting':
        return 'border-purple-200 bg-purple-50';
      case 'task':
        return 'border-amber-200 bg-amber-50';
      case 'note':
        return 'border-slate-200 bg-slate-50';
      default:
        return 'border-slate-200 bg-slate-50';
    }
  };

  const getStatusText = (activity: Activity) => {
    if (activity.completed) {
      return 'Completed';
    }

    if (activity.due_date) {
      const dueDate = new Date(activity.due_date);
      const now = new Date();

      if (dueDate < now) {
        return 'Overdue';
      }

      const distance = formatDistance(dueDate, now, { addSuffix: true });
      return `Due ${distance}`;
    }

    return 'No due date';
  };

  const getStatusColor = (activity: Activity) => {
    if (activity.completed) return 'text-green-700';

    if (activity.due_date) {
      const dueDate = new Date(activity.due_date);
      const now = new Date();

      if (dueDate < now) {
        return 'text-red-700';
      }
    }

    return 'text-slate-700';
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy \'at\' h:mm a');
  };

  const formatDateOnly = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex items-start gap-4">
            <div className="h-8 w-8 rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 bg-slate-200 rounded" />
              <div className="h-3 w-32 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-slate-700 mb-1">No activities yet</h3>
        <p className="text-slate-500 max-w-sm mx-auto">
          Activities will appear here when you log calls, send emails, schedule meetings, or add tasks.
        </p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            Refresh
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

      <div className="space-y-6">
        {activities.map((activity, index) => (
          <div key={activity.id} className="flex gap-4 relative">
            {/* Timeline dot */}
            <div className="relative">
              <div className="h-8 w-8 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center">
                {getActivityIcon(activity.type, activity.completed)}
              </div>
              {index < activities.length - 1 && (
                <div className="absolute left-1/2 top-8 -translate-x-1/2 h-6 w-0.5 bg-slate-200" />
              )}
            </div>

            {/* Activity content */}
            <div className="flex-1 pb-6">
              <div className={cn(
                "rounded-lg border p-4",
                getActivityColor(activity.type, activity.completed)
              )}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-medium text-slate-900">{activity.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-slate-200">
                        {getActivityIcon(activity.type, activity.completed)}
                        <span className="capitalize">{activity.type}</span>
                      </span>
                      <span className={cn("font-medium", getStatusColor(activity))}>
                        {getStatusText(activity)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-slate-500">
                    {activity.due_date ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDateOnly(activity.due_date)}</span>
                      </div>
                    ) : (
                      <span>No due date</span>
                    )}
                  </div>
                </div>

                {activity.description && (
                  <p className="text-slate-700 text-sm mb-3">{activity.description}</p>
                )}

                <div className="flex items-center justify-between text-sm text-slate-500">
                  <div>
                    <span>Created {formatDateTime(activity.created_at)}</span>
                  </div>
                  
                  {activity.completed && activity.completed_at && (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      <span>Completed {formatDateOnly(activity.completed_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
