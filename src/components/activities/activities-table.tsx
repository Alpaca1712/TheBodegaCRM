import Link from 'next/link';
import { CheckCircle, Circle, Phone, Mail, Users, FileText, Calendar, Clock } from 'lucide-react';
import { Activity } from '@/lib/api/activities';

type ActivitiesTableProps = {
  activities: Activity[];
};

const getTypeIcon = (type: Activity['type']) => {
  switch (type) {
    case 'call':
      return <Phone className="w-4 h-4 text-blue-600" />;
    case 'email':
      return <Mail className="w-4 h-4 text-green-600" />;
    case 'meeting':
      return <Users className="w-4 h-4 text-purple-600" />;
    case 'task':
      return <CheckCircle className="w-4 h-4 text-orange-600" />;
    case 'note':
      return <FileText className="w-4 h-4 text-zinc-600" />;
    default:
      return <Circle className="w-4 h-4 text-zinc-400" />;
  }
};

const getTypeLabel = (type: Activity['type']) => {
  switch (type) {
    case 'call':
      return 'Call';
    case 'email':
      return 'Email';
    case 'meeting':
      return 'Meeting';
    case 'task':
      return 'Task';
    case 'note':
      return 'Note';
    default:
      return 'Activity';
  }
};

export default function ActivitiesTable({ activities }: ActivitiesTableProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const isOverdue = (activity: Activity) => {
    if (activity.completed || !activity.due_date) return false;
    const dueDate = new Date(activity.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const getStatusBadge = (activity: Activity) => {
    if (activity.completed) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </span>
      );
    }

    if (isOverdue(activity)) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <Clock className="w-3 h-3 mr-1" />
          Overdue
        </span>
      );
    }

    if (activity.due_date) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Calendar className="w-3 h-3 mr-1" />
          Scheduled
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800">
        No date
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-zinc-200">
        <thead className="bg-zinc-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Title & Description
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Type
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Related To
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Due Date
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-zinc-200">
          {activities.map((activity) => (
            <tr key={activity.id} className="hover:bg-zinc-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-start">
                  <div className="mt-1 mr-3">
                    {getTypeIcon(activity.type)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-900">{activity.title}</div>
                    {activity.description && (
                      <div className="text-sm text-zinc-600 mt-1 line-clamp-2">
                        {activity.description}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-zinc-900">{getTypeLabel(activity.type)}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-zinc-900 space-y-1">
                  {activity.contact_id && (
                    <Link 
                      href={`/contacts/${activity.contact_id}`}
                      className="text-indigo-600 hover:text-indigo-900 hover:underline"
                    >
                      Contact
                    </Link>
                  )}
                  {activity.company_id && (
                    <div>
                      <Link 
                        href={`/companies/${activity.company_id}`}
                        className="text-indigo-600 hover:text-indigo-900 hover:underline"
                      >
                        Company
                      </Link>
                    </div>
                  )}
                  {activity.deal_id && (
                    <div>
                      <Link 
                        href={`/deals/${activity.deal_id}`}
                        className="text-indigo-600 hover:text-indigo-900 hover:underline"
                      >
                        Deal
                      </Link>
                    </div>
                  )}
                  {!activity.contact_id && !activity.company_id && !activity.deal_id && (
                    <span className="text-zinc-400 italic">—</span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-zinc-900">
                  {activity.due_date ? formatDateTime(activity.due_date) : 'No due date'}
                </div>
                {activity.completed_at && (
                  <div className="text-xs text-zinc-500">
                    Completed: {formatDate(activity.completed_at)}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getStatusBadge(activity)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <Link
                  href={`/activities/${activity.id}/edit`}
                  className="text-indigo-600 hover:text-indigo-900 mr-4"
                >
                  Edit
                </Link>
                <button className="text-red-600 hover:text-red-900">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
