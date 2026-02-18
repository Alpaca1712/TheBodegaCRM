'use client';

import { useState, useEffect } from 'react';
import { Search, Calendar, Filter, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { 
  getActivities, 
  getUpcomingActivities,
  getOverdueActivities, 
  type Activity, 
  type ActivityFilters, 
  type SortOptions 
} from '@/lib/api/activities';
import ActivitiesTable from '@/components/activities/activities-table';

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

const sortOptions = [
  { value: 'due_date', label: 'Due Date' },
  { value: 'created_at', label: 'Recently Added' },
  { value: 'title', label: 'Title' },
  { value: 'type', label: 'Type' },
];

type ActivitySortField = 'title' | 'type' | 'due_date' | 'completed' | 'created_at';

type DateRangeFilter = {
  from?: string;
  to?: string;
};

type FilterType = 'all' | 'upcoming' | 'overdue';

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [dateRange, setDateRange] = useState<DateRangeFilter>({});
  const [sortField, setSortField] = useState<ActivitySortField>('due_date');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  useEffect(() => {
    async function fetchActivities() {
      setLoading(true);
      
      let response;
      
      if (filterType === 'upcoming') {
        response = await getUpcomingActivities();
      } else if (filterType === 'overdue') {
        response = await getOverdueActivities();
      } else {
        const filters: ActivityFilters = {};
        
        if (typeFilter !== 'all') {
          filters.type = typeFilter as Activity['type'];
        }
        
        if (statusFilter !== 'all') {
          filters.completed = statusFilter === 'completed';
        }
        
        if (searchTerm) {
          // Search will be handled client-side or we need a search API
        }
        
        if (dateRange.from) {
          filters.due_date_from = dateRange.from;
        }
        
        if (dateRange.to) {
          filters.due_date_to = dateRange.to;
        }
        
        const sort: SortOptions = {
          field: sortField,
          direction: 'asc', // Default direction since we removed sortDirection state
        };
        
        response = await getActivities(filters, { page, limit }, sort);
      }

      if (response.error) {
        console.error('Error fetching activities:', response.error);
        setActivities([]);
        setTotalCount(0);
      } else {
        setActivities(response.data);
        setTotalCount(response.count);
      }
      
      setLoading(false);
    }

    fetchActivities();
  }, [searchTerm, typeFilter, statusFilter, filterType, dateRange, sortField, page]);

  const handleDateRangeChange = (field: 'from' | 'to', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activities</h1>
          <p className="text-slate-600">Track calls, emails, meetings, tasks, and notes</p>
        </div>
        <Link
          href="/activities/new"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          <span>New Activity</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 border-b border-slate-200">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 text-sm font-medium ${filterType === 'all' 
              ? 'border-b-2 border-indigo-600 text-indigo-600' 
              : 'text-slate-600 hover:text-slate-900'}`}
          >
            All Activities
          </button>
          <button
            onClick={() => setFilterType('upcoming')}
            className={`px-4 py-2 text-sm font-medium ${filterType === 'upcoming' 
              ? 'border-b-2 border-indigo-600 text-indigo-600' 
              : 'text-slate-600 hover:text-slate-900'}`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilterType('overdue')}
            className={`px-4 py-2 text-sm font-medium flex items-center gap-1 ${filterType === 'overdue' 
              ? 'border-b-2 border-red-600 text-red-600' 
              : 'text-slate-600 hover:text-slate-900'}`}
          >
            <AlertCircle className="w-4 h-4" />
            Overdue
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search activities..."
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sort By</label>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as ActivitySortField)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Date Range</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
              <input
                type="date"
                value={dateRange.from || ''}
                onChange={(e) => handleDateRangeChange('from', e.target.value)}
                max={dateRange.to || today}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
              <input
                type="date"
                value={dateRange.to || ''}
                onChange={(e) => handleDateRangeChange('to', e.target.value)}
                min={dateRange.from || ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Activities Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-slate-600">Loading activities...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-12 text-center">
            <Filter className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No activities found</h3>
            <p className="text-slate-600 mb-4">
              {searchTerm || typeFilter !== 'all' || statusFilter !== 'all' || dateRange.from || dateRange.to
                ? 'Try adjusting your filters'
                : 'Get started by creating your first activity'}
            </p>
            {!searchTerm && typeFilter === 'all' && statusFilter === 'all' && !dateRange.from && !dateRange.to && (
              <Link
                href="/activities/new"
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <span>Create Activity</span>
              </Link>
            )}
          </div>
        ) : (
          <ActivitiesTable activities={activities} />
        )}
      </div>

      {/* Pagination */}
      {filterType === 'all' && totalCount > limit && (
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-slate-600">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount} activities
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * limit >= totalCount}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
