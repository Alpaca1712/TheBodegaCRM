'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Calendar, AlertCircle, ChevronLeft, ChevronRight, Plus, CheckCircle2, Phone, Mail, CalendarDays, MessageSquare } from 'lucide-react';
import {
  getActivities, getUpcomingActivities, getOverdueActivities, updateActivity,
  type Activity, type ActivityFilters, type SortOptions,
} from '@/lib/api/activities';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const typeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'call', label: 'Calls' },
  { value: 'email', label: 'Emails' },
  { value: 'meeting', label: 'Meetings' },
  { value: 'task', label: 'Tasks' },
  { value: 'note', label: 'Notes' },
];

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

type ActivitySortField = 'title' | 'type' | 'due_date' | 'completed' | 'created_at';
type FilterType = 'all' | 'upcoming' | 'overdue';

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  call: Phone, email: Mail, meeting: CalendarDays, task: CheckCircle2, note: MessageSquare,
};
const typeColors: Record<string, string> = {
  call: 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400',
  email: 'text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400',
  meeting: 'text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400',
  task: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400',
  note: 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400',
};

export default function ActivitiesPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortField, setSortField] = useState<ActivitySortField>('due_date');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const limit = 20;

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    let response;

    if (filterType === 'upcoming') {
      response = await getUpcomingActivities();
    } else if (filterType === 'overdue') {
      response = await getOverdueActivities();
    } else {
      const filters: ActivityFilters = {};
      if (typeFilter !== 'all') filters.type = typeFilter as Activity['type'];
      if (statusFilter !== 'all') filters.completed = statusFilter === 'completed';
      const sort: SortOptions = { field: sortField, direction: 'asc' };
      response = await getActivities(filters, { page, limit }, sort);
    }

    if (response.error) {
      setActivities([]);
      setTotalCount(0);
    } else {
      setActivities(response.data);
      setTotalCount(response.count);
    }
    setLoading(false);
  }, [typeFilter, statusFilter, filterType, sortField, page]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const filteredActivities = useMemo(() => {
    if (!searchTerm) return activities;
    const q = searchTerm.toLowerCase();
    return activities.filter(a => a.title.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q));
  }, [activities, searchTerm]);

  const handleComplete = async (id: string) => {
    if (completingIds.has(id)) return;
    setCompletingIds(prev => new Set(prev).add(id));
    try {
      const result = await updateActivity(id, { completed: true, completed_at: new Date().toISOString() });
      if (result.error) toast.error('Failed to complete');
      else {
        toast.success('Task completed');
        setActivities(prev => prev.map(a => a.id === id ? { ...a, completed: true } : a));
      }
    } catch { toast.error('Failed to complete'); }
    finally {
      setCompletingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const navigateToEntity = (a: Activity) => {
    if (a.deal_id) router.push(`/deals/${a.deal_id}`);
    else if (a.contact_id) router.push(`/contacts/${a.contact_id}`);
    else if (a.company_id) router.push(`/companies/${a.company_id}`);
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Activities</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Track calls, emails, meetings, tasks, and notes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {[
          { key: 'all', label: 'All' },
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'overdue', label: 'Overdue', icon: AlertCircle },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setFilterType(tab.key as FilterType); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1 ${
              filterType === tab.key
                ? tab.key === 'overdue'
                  ? 'bg-rose-600 text-white'
                  : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -tranzinc-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search activities..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
          >
            {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
          >
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as ActivitySortField)}
            className="px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
          >
            <option value="due_date">Due Date</option>
            <option value="created_at">Created</option>
            <option value="title">Title</option>
          </select>
        </div>
      </div>

      {/* Activities List */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {loading ? (
          <div className="p-6 animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-700 rounded" />
                  <div className="h-3 w-32 bg-zinc-100 dark:bg-zinc-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {searchTerm || typeFilter !== 'all' || statusFilter !== 'all' ? 'No matching activities' : 'No activities yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filteredActivities.map((activity) => {
              const Icon = typeIcons[activity.type] || MessageSquare;
              const colorClass = typeColors[activity.type] || typeColors.note;
              const isOverdue = activity.due_date && new Date(activity.due_date) < new Date() && !activity.completed;

              return (
                <div
                  key={activity.id}
                  onClick={() => navigateToEntity(activity)}
                  className={`flex items-center gap-3 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer ${activity.completed ? 'opacity-50' : ''}`}
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium text-zinc-900 dark:text-white truncate ${activity.completed ? 'line-through' : ''}`}>
                      {activity.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="capitalize">{activity.type}</span>
                      {activity.due_date && (
                        <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                          {isOverdue ? 'Overdue · ' : ''}
                          {new Date(activity.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  {!activity.completed && activity.type === 'task' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleComplete(activity.id); }}
                      disabled={completingIds.has(activity.id)}
                      className="shrink-0 p-1.5 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950 text-zinc-400 hover:text-emerald-500 transition-colors"
                      title="Complete"
                    >
                      <CheckCircle2 className={`h-4 w-4 ${completingIds.has(activity.id) ? 'animate-pulse' : ''}`} />
                    </button>
                  )}
                  {activity.completed && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && filterType === 'all' && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-200 dark:border-zinc-800">
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              {(page - 1) * limit + 1}–{Math.min(page * limit, totalCount)} of {totalCount}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50">
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
