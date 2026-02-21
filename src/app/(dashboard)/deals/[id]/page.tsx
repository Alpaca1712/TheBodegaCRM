'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  DollarSign, Tag, Calendar, Building, User, FileText, Edit, Trash2,
  ArrowLeft, TrendingUp, Plus
} from 'lucide-react';
import Link from 'next/link';
import { getDealById, updateDeal, deleteDeal, type Deal } from '@/lib/api/deals';
import { getActivities, type Activity } from '@/lib/api/activities';
import ActivityTimeline from '@/components/activities/activity-timeline';
import ActivityForm from '@/components/activities/activity-form';
import AiInsightsPanel from '@/components/ai/ai-insights-panel';
import { Sheet, SheetHeader, SheetBody } from '@/components/ui/sheet';
import DealForm, { type DealFormData } from '@/components/deals/deal-form';
import { useCreateActivity } from '@/hooks/use-activities';
import { toast } from 'sonner';

const stageLabels: Record<Deal['stage'], string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost'
};

const stageColors: Record<Deal['stage'], string> = {
  lead: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  qualified: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  proposal: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  negotiation: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  closed_won: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  closed_lost: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
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
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createActivityMutation = useCreateActivity();
  const dealId = params.id as string;

  useEffect(() => {
    async function fetchDeal() {
      setLoading(true);
      const result = await getDealById(dealId);
      if (result.error) setError(result.error);
      else setDeal(result.data);
      setLoading(false);
    }

    async function fetchActivities() {
      setActivitiesLoading(true);
      const result = await getActivities({ deal_id: dealId });
      if (!result.error) setActivities(result.data || []);
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
    if (result.error) setError(result.error);
    else router.push('/deals');
    setDeleting(false);
  };

  const handleEditSubmit = async (data: DealFormData) => {
    setIsSubmitting(true);
    try {
      const result = await updateDeal(dealId, {
        title: data.title,
        value: data.value ? parseFloat(data.value) : null,
        currency: data.currency,
        stage: data.stage,
        contact_id: data.contact_id || null,
        company_id: data.company_id || null,
        expected_close_date: data.expected_close_date || null,
        probability: data.probability ? parseInt(data.probability) : null,
        notes: data.notes || null,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        setDeal(result.data);
        setIsEditOpen(false);
        toast.success('Deal updated');
      }
    } catch {
      toast.error('Failed to update deal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateActivity = async (activityData: Omit<Activity, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      await createActivityMutation.mutateAsync({ ...activityData, deal_id: dealId });
      setShowActivityForm(false);
      const result = await getActivities({ deal_id: dealId });
      if (!result.error) setActivities(result.data || []);
      return { error: undefined };
    } catch {
      return { error: 'Failed to create activity' };
    }
  };

  const daysInStage = deal ? Math.floor((Date.now() - new Date(deal.updated_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto animate-pulse">
        <div className="h-5 w-24 bg-zinc-200 rounded mb-4" />
        <div className="h-7 w-48 bg-zinc-200 rounded mb-2" />
        <div className="h-4 w-64 bg-zinc-100 rounded mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-zinc-100 rounded-xl" />
          <div className="h-80 bg-zinc-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading deal</p>
          <p className="text-sm mt-1">{error || 'Deal not found'}</p>
          <Link href="/deals" className="inline-flex items-center mt-3 text-sm font-medium hover:underline">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to deals
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <Link href="/deals" className="inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 mb-4">
          <ArrowLeft size={14} /> Deals
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{deal.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${stageColors[deal.stage]}`}>
                {stageLabels[deal.stage]}
              </span>
              {deal.value != null && (
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  ${deal.value.toLocaleString()}
                </span>
              )}
              {deal.probability != null && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {deal.probability}% probability
                </span>
              )}
              {deal.expected_close_date && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(deal.expected_close_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowActivityForm(!showActivityForm)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              <Plus size={14} /> Log Activity
            </button>
            <button
              onClick={() => setIsEditOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              <Edit size={14} /> Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <Trash2 size={14} /> {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main: Activity Timeline */}
          <div className="lg:col-span-2 space-y-4">
            {showActivityForm && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
                <ActivityForm
                  dealId={dealId}
                  onSubmit={handleCreateActivity}
                  onCancel={() => setShowActivityForm(false)}
                  isLoading={createActivityMutation.isPending}
                />
              </div>
            )}

            {/* Notes */}
            {deal.notes && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4" /> Notes
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{deal.notes}</p>
              </div>
            )}

            {/* Activity Timeline */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Activity</h2>
              {activitiesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">No activities yet</p>
                  <button
                    onClick={() => setShowActivityForm(true)}
                    className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Log your first activity
                  </button>
                </div>
              ) : (
                <ActivityTimeline activities={activities} />
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Deal Properties */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Details</h2>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">Stage</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageColors[deal.stage]}`}>
                    {stageLabels[deal.stage]}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">Value</span>
                  <span className="text-zinc-900 dark:text-white font-medium">
                    {deal.value ? `$${deal.value.toLocaleString()}` : '--'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">Probability</span>
                  <span className="text-zinc-900 dark:text-white font-medium">
                    {deal.probability != null ? `${deal.probability}%` : '--'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">Close Date</span>
                  <span className="text-zinc-900 dark:text-white">
                    {deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : '--'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">Days in Stage</span>
                  <span className="text-zinc-900 dark:text-white">{daysInStage}d</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">Created</span>
                  <span className="text-zinc-900 dark:text-white">{new Date(deal.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Related */}
            {(deal.contact_id || deal.company_id) && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-2">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">Related</h2>
                {deal.contact_id && (
                  <Link
                    href={`/contacts/${deal.contact_id}`}
                    className="flex items-center gap-2 p-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <User className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">Contact</span>
                  </Link>
                )}
                {deal.company_id && (
                  <Link
                    href={`/companies/${deal.company_id}`}
                    className="flex items-center gap-2 p-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Building className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">Company</span>
                  </Link>
                )}
              </div>
            )}

            {/* AI Insights */}
            <AiInsightsPanel
              type="deal"
              data={{
                title: deal.title,
                value: deal.value,
                stage: deal.stage,
                probability: deal.probability,
                expected_close_date: deal.expected_close_date,
                notes: deal.notes,
                days_in_stage: daysInStage,
                activities_count: activities.length,
                last_activity_date: activities[0]?.created_at,
              }}
            />
          </div>
        </div>
      </div>

      {/* Edit Sheet */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetHeader onClose={() => setIsEditOpen(false)}>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Edit Deal</h2>
        </SheetHeader>
        <SheetBody>
          <DealForm
            initialData={deal}
            onSubmit={handleEditSubmit}
            isSubmitting={isSubmitting}
            onCancel={() => setIsEditOpen(false)}
          />
        </SheetBody>
      </Sheet>
    </>
  );
}
