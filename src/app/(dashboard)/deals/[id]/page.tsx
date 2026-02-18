'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  DollarSign, Tag, Calendar, Building, User, FileText, Edit, Trash2,
  ArrowLeft, TrendingUp, Plus
} from 'lucide-react';
import Link from 'next/link';
import { getDealById, deleteDeal, type Deal } from '@/lib/api/deals';
import { getActivities, type Activity } from '@/lib/api/activities';
import ActivityTimeline from '@/components/activities/activity-timeline';
import ActivityForm from '@/components/activities/activity-form';
import { useCreateActivity } from '@/hooks/use-activities';

const stageLabels: Record<Deal['stage'], string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost'
};

const stageColors: Record<Deal['stage'], string> = {
  lead: 'bg-blue-100 text-blue-800',
  qualified: 'bg-indigo-100 text-indigo-800',
  proposal: 'bg-purple-100 text-purple-800',
  negotiation: 'bg-amber-100 text-amber-800',
  closed_won: 'bg-green-100 text-green-800',
  closed_lost: 'bg-red-100 text-red-800'
};

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const createActivityMutation = useCreateActivity();

  const dealId = params.id as string;

  useEffect(() => {
    async function fetchDeal() {
      setLoading(true);
      const result = await getDealById(dealId);
      if (result.error) {
        setError(result.error);
      } else {
        setDeal(result.data);
      }
      setLoading(false);
    }

    async function fetchActivities() {
      setActivitiesLoading(true);
      const result = await getActivities({ deal_id: dealId });
      if (!result.error) {
        setActivities(result.data || []);
      }
      setActivitiesLoading(false);
    }

    if (dealId) {
      fetchDeal();
      fetchActivities();
    }
  }, [dealId]);

  const handleDelete = async () => {
    if (!deal || !window.confirm('Are you sure you want to delete this deal?')) return;
    
    setDeleting(true);
    const result = await deleteDeal(deal.id);
    if (result.error) {
      setError(result.error);
    } else {
      router.push('/deals');
    }
    setDeleting(false);
  };

  const handleCreateActivity = async (activityData: Omit<Activity, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      await createActivityMutation.mutateAsync({
        ...activityData,
        deal_id: dealId,
      });
      setShowActivityForm(false);
      
      // Refresh activities
      const result = await getActivities({ deal_id: dealId });
      if (!result.error) {
        setActivities(result.data || []);
      }
      return { error: undefined };
    } catch (_err) {
      return { error: 'Failed to create activity' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading deal details...</p>
        </div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading deal</p>
          <p className="text-sm mt-1">{error || 'Deal not found'}</p>
          <Link href="/deals" className="inline-flex items-center mt-3 text-sm font-medium text-red-700 hover:text-red-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to deals
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/deals" className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to deals
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{deal.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${stageColors[deal.stage]}`}>
                <Tag className="w-3 h-3 mr-1" />
                {stageLabels[deal.stage]}
              </span>
              {deal.value && (
                <span className="inline-flex items-center text-slate-700 bg-slate-100 px-3 py-1 rounded-full text-sm font-medium">
                  <DollarSign className="w-3 h-3 mr-1" />
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: deal.currency || 'USD',
                  }).format(deal.value)}
                </span>
              )}
              {deal.expected_close_date && (
                <span className="inline-flex items-center text-slate-700 bg-slate-100 px-3 py-1 rounded-full text-sm font-medium">
                  <Calendar className="w-3 h-3 mr-1" />
                  {new Date(deal.expected_close_date).toLocaleDateString()}
                </span>
              )}
              {deal.probability !== null && (
                <span className="inline-flex items-center text-slate-700 bg-slate-100 px-3 py-1 rounded-full text-sm font-medium">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {deal.probability}%
                </span>
              )}
            </div>
          </div>
          <div className="flex space-x-3">
            <Link
              href={`/deals/${deal.id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Deal details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notes */}
          {deal.notes && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-slate-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Notes
              </h2>
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-600 whitespace-pre-wrap">{deal.notes}</p>
              </div>
            </div>
          )}

          {/* Related entities */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-slate-900 mb-4">Related</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {deal.contact_id && (
                <Link
                  href={`/contacts/${deal.contact_id}`}
                  className="flex items-center p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <User className="w-5 h-5 text-slate-500 mr-3" />
                  <div>
                    <p className="font-medium text-slate-900">Contact</p>
                    <p className="text-sm text-slate-500">View associated contact</p>
                  </div>
                </Link>
              )}
              {deal.company_id && (
                <Link
                  href={`/companies/${deal.company_id}`}
                  className="flex items-center p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Building className="w-5 h-5 text-slate-500 mr-3" />
                  <div>
                    <p className="font-medium text-slate-900">Company</p>
                    <p className="text-sm text-slate-500">View associated company</p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Right column - Activity timeline */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-slate-900">Activity Timeline</h2>
              <button
                onClick={() => setShowActivityForm(!showActivityForm)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Activity
              </button>
            </div>

            {showActivityForm && (
              <div className="mb-6">
                <ActivityForm
                  dealId={dealId}
                  onSubmit={handleCreateActivity}
                  onCancel={() => setShowActivityForm(false)}
                  isLoading={createActivityMutation.isPending}
                />
              </div>
            )}

            {activitiesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 mb-4">
                  <Calendar className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="text-sm font-medium text-slate-900 mb-2">No activities yet</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">Add an activity to track calls, meetings, or tasks related to this deal.</p>
              </div>
            ) : (
              <ActivityTimeline activities={activities} />
            )}
          </div>

          {/* Deal info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-slate-900 mb-4">Deal Information</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-slate-500">Created</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {new Date(deal.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {new Date(deal.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Deal ID</dt>
                <dd className="mt-1 text-sm text-slate-900 font-mono">{deal.id}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
