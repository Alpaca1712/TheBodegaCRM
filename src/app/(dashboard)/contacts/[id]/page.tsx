'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Mail, Phone, Building, Briefcase, Calendar, Edit, Trash2,
  ArrowLeft, Plus, Clock, Sparkles,
  ExternalLink, Zap, Inbox,
} from 'lucide-react';
import Link from 'next/link';
import { getContactById, deleteContact } from '@/lib/api/contacts';
import { getActivitiesByContact } from '@/lib/api/activities';
import { getDeals, type Deal } from '@/lib/api/deals';
import ActivityTimeline from '@/components/activities/activity-timeline';
import ActivityForm from '@/components/activities/activity-form';
import TagManager from '@/components/contacts/tag-manager';
import AiInsightsPanel, { AiEmailDraftButton } from '@/components/ai/ai-insights-panel';
import { Sheet, SheetHeader, SheetBody, SheetFooter } from '@/components/ui/sheet';
import ContactForm, { type ContactFormData } from '@/components/contacts/contact-form';
import { updateContact } from '@/lib/api/contacts';
import { useCreateActivity } from '@/hooks/use-activities';
import { useTagsByContactId, useAvailableTagsForContact, useAddTagToContact, useRemoveTagFromContact } from '@/hooks/use-tags';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { Contact } from '@/lib/api/contacts';
import type { Activity } from '@/lib/api/activities';

interface EmailSummaryItem {
  id: string;
  subject: string | null;
  from_address: string | null;
  ai_summary: string | null;
  ai_sentiment: string | null;
  date: string;
}

interface LeadScore {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  signals: Array<{ label: string; impact: 'positive' | 'negative' | 'neutral'; points: number }>;
}

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [contactDeals, setContactDeals] = useState<Deal[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leadScore, setLeadScore] = useState<LeadScore | null>(null);
  const [leadScoreLoading, setLeadScoreLoading] = useState(false);
  const [emailSummaries, setEmailSummaries] = useState<EmailSummaryItem[]>([]);

  const createActivityMutation = useCreateActivity();
  const contactId = params.id as string;

  const { data: tags = [], isLoading: tagsLoading } = useTagsByContactId(contactId);
  const { data: availableTags = [], isLoading: availableTagsLoading } = useAvailableTagsForContact(contactId);
  const addTagMutation = useAddTagToContact();
  const removeTagMutation = useRemoveTagFromContact();

  const handleAddTag = (tagId: string) => addTagMutation.mutate({ contactId, tagId });
  const handleRemoveTag = (tagId: string) => removeTagMutation.mutate({ contactId, tagId });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [contactResult, activitiesResult, dealsResult] = await Promise.all([
        getContactById(contactId),
        getActivitiesByContact(contactId),
        getDeals({ contact_id: contactId }),
      ]);
      if (contactResult.error) setError(contactResult.error);
      else setContact(contactResult.data);
      if (!activitiesResult.error) setActivities(activitiesResult.data || []);
      if (!dealsResult.error) setContactDeals(dealsResult.data || []);

      if (contactResult.data?.email) {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: emails } = await supabase
            .from('email_summaries')
            .select('id, subject, from_address, ai_summary, ai_sentiment, date')
            .eq('user_id', session.user.id)
            .or(`from_address.ilike.%${contactResult.data.email}%,to_addresses.cs.{${contactResult.data.email}}`)
            .order('date', { ascending: false })
            .limit(10);
          setEmailSummaries((emails as EmailSummaryItem[]) || []);
        }
      }

      setLoading(false);
    }
    fetchData();
  }, [contactId]);

  useEffect(() => {
    if (!contact || activities === undefined) return;
    async function fetchLeadScore() {
      setLeadScoreLoading(true);
      try {
        const res = await fetch('/api/ai/lead-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: contact!.first_name,
            last_name: contact!.last_name,
            email: contact!.email,
            phone: contact!.phone,
            title: contact!.title,
            status: contact!.status,
            source: contact!.source,
            notes: contact!.notes,
            activities_count: activities.length,
            last_activity_date: activities[0]?.created_at,
            deals_count: contactDeals.length,
            deals_value: contactDeals.reduce((s, d) => s + (d.value || 0), 0),
            days_since_created: Math.floor((Date.now() - new Date(contact!.created_at).getTime()) / 86400000),
            has_company: !!contact!.company_id,
            tags_count: tags.length,
          }),
        });
        if (res.ok) setLeadScore(await res.json());
      } catch { /* ignore */ }
      setLeadScoreLoading(false);
    }
    fetchLeadScore();
  }, [contact, activities, contactDeals, tags]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    setDeleting(true);
    const result = await deleteContact(contactId);
    if (result.error) { setError(result.error); setDeleting(false); }
    else router.push('/contacts');
  };

  const handleEditSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const result = await updateContact(contactId, {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        company_id: data.company_id || undefined,
        title: data.title || undefined,
        status: data.status,
        source: data.source || undefined,
        notes: data.notes || undefined,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Contact updated');
        setContact(result.data);
        setIsEditOpen(false);
      }
    } catch {
      toast.error('Failed to update contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshActivities = async () => {
    setActivitiesLoading(true);
    const result = await getActivitiesByContact(contactId);
    if (!result.error) setActivities(result.data || []);
    setActivitiesLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400';
      case 'inactive': return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
      case 'lead': return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400';
      default: return 'bg-zinc-100 text-zinc-600';
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <Link href="/contacts" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 mb-4">
          <ArrowLeft size={14} /> Contacts
        </Link>
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
            <div className="space-y-2">
              <div className="h-6 w-40 bg-zinc-200 dark:bg-zinc-700 rounded" />
              <div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="max-w-5xl mx-auto">
        <Link href="/contacts" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 mb-4">
          <ArrowLeft size={14} /> Contacts
        </Link>
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error || 'Contact not found'}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <Link href="/contacts" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 mb-4">
          <ArrowLeft size={14} /> Contacts
        </Link>

        {/* Contact Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shrink-0">
              <span className="text-indigo-700 dark:text-indigo-300 text-xl font-bold">
                {contact.first_name.charAt(0)}{contact.last_name.charAt(0)}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {contact.first_name} {contact.last_name}
                </h1>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(contact.status)}`}>
                  {contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                {contact.title && <span>{contact.title}</span>}
                {contact.title && contact.email && <span className="text-zinc-300 dark:text-zinc-600">·</span>}
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">
                    {contact.email}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowActivityForm(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 shadow-sm shadow-indigo-600/20 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Log Activity
            </button>
            <button
              onClick={() => setIsEditOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Two-column layout: Timeline (main) + Properties (sidebar) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main: Activity Timeline */}
          <div className="lg:col-span-2 space-y-4">
            {/* Quick action row for logging activities */}
            {showActivityForm && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">Log Activity</h3>
                <ActivityForm
                  contactId={contactId}
                  onSubmit={async (data) => {
                    try {
                      const result = await createActivityMutation.mutateAsync(data);
                      if (!result.error) {
                        setShowActivityForm(false);
                        await refreshActivities();
                      }
                      return result;
                    } catch (err) {
                      console.error('Failed to create activity:', err);
                      return { error: 'Failed to create activity' };
                    }
                  }}
                  onCancel={() => setShowActivityForm(false)}
                  isLoading={createActivityMutation.isPending}
                />
              </div>
            )}

            {/* Unified Timeline */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                <h2 className="font-semibold text-zinc-900 dark:text-white">Timeline</h2>
                {!showActivityForm && (
                  <button
                    onClick={() => setShowActivityForm(true)}
                    className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" /> Log activity
                  </button>
                )}
              </div>
              <div className="p-5">
                {activitiesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex gap-3 animate-pulse">
                        <div className="h-7 w-7 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-4 w-40 bg-zinc-200 dark:bg-zinc-700 rounded" />
                          <div className="h-3 w-28 bg-zinc-100 dark:bg-zinc-800 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <UnifiedTimeline
                    activities={activities}
                    emails={emailSummaries}
                    deals={contactDeals}
                    onShowForm={() => setShowActivityForm(true)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Sidebar: Properties + AI Insights */}
          <div className="space-y-4">
            {/* Lead Score */}
            {(leadScore || leadScoreLoading) && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                  <h2 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" /> Lead Score
                  </h2>
                </div>
                {leadScoreLoading ? (
                  <div className="px-5 py-6 text-center">
                    <div className="h-12 w-12 bg-zinc-100 dark:bg-zinc-800 rounded-full mx-auto animate-pulse" />
                  </div>
                ) : leadScore && (
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-4 mb-3">
                      <div className={`h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
                        leadScore.grade === 'A' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' :
                        leadScore.grade === 'B' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' :
                        leadScore.grade === 'C' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                        'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                      }`}>
                        {leadScore.grade}
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-zinc-900 dark:text-white">{leadScore.score}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">out of 100</p>
                      </div>
                      <div className="flex-1">
                        <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              leadScore.score >= 80 ? 'bg-emerald-500' :
                              leadScore.score >= 65 ? 'bg-blue-500' :
                              leadScore.score >= 50 ? 'bg-amber-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${leadScore.score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {leadScore.signals.slice(0, 5).map((sig, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className={`shrink-0 ${
                            sig.impact === 'positive' ? 'text-emerald-500' :
                            sig.impact === 'negative' ? 'text-red-500' :
                            'text-zinc-400'
                          }`}>
                            {sig.impact === 'positive' ? '+' : sig.impact === 'negative' ? '−' : '·'}
                          </span>
                          <span className="text-zinc-600 dark:text-zinc-400 truncate">{sig.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Contact Properties */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                <h2 className="font-semibold text-zinc-900 dark:text-white">Details</h2>
              </div>
              <div className="px-5 py-4 space-y-4">
                <PropertyRow icon={Mail} label="Email" value={contact.email} href={contact.email ? `mailto:${contact.email}` : undefined} />
                <PropertyRow icon={Phone} label="Phone" value={contact.phone} href={contact.phone ? `tel:${contact.phone}` : undefined} />
                <PropertyRow icon={Briefcase} label="Title" value={contact.title} />
                {contact.company_id && (
                  <PropertyRow
                    icon={Building}
                    label="Company"
                    value="View Company"
                    href={`/companies/${contact.company_id}`}
                  />
                )}
                {contact.source && (
                  <PropertyRow icon={ExternalLink} label="Source" value={contact.source} />
                )}
                <PropertyRow icon={Calendar} label="Added" value={new Date(contact.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
                <PropertyRow icon={Clock} label="Updated" value={new Date(contact.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
              <TagManager
                tags={tags}
                availableTags={availableTags}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
                isLoading={tagsLoading || availableTagsLoading || addTagMutation.isPending || removeTagMutation.isPending}
              />
            </div>

            {/* Associated Deals */}
            {contactDeals.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <h2 className="font-semibold text-zinc-900 dark:text-white">Deals</h2>
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{contactDeals.length}</span>
                </div>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {contactDeals.map((deal) => (
                    <Link
                      key={deal.id}
                      href={`/deals/${deal.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">{deal.title}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">{deal.stage?.replace('_', ' ')}</p>
                      </div>
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">
                        ${(deal.value || 0).toLocaleString()}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {contact.notes && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                  <h2 className="font-semibold text-zinc-900 dark:text-white">Notes</h2>
                </div>
                <div className="px-5 py-4">
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{contact.notes}</p>
                </div>
              </div>
            )}

            {/* AI Insights */}
            <AiInsightsPanel
              type="contact"
              data={{
                first_name: contact.first_name,
                last_name: contact.last_name,
                email: contact.email,
                phone: contact.phone,
                title: contact.title,
                status: contact.status,
                source: contact.source,
                notes: contact.notes,
                activities_count: activities.length,
                last_activity_date: activities[0]?.created_at,
                deals_count: contactDeals.length,
                deals_value: contactDeals.reduce((sum, d) => sum + (d.value || 0), 0),
              }}
            />

            {/* Quick Actions */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">Quick Actions</h3>
              <div className="space-y-2">
                {contact.email && (
                  <AiEmailDraftButton
                    recipientName={`${contact.first_name} ${contact.last_name}`}
                    recipientEmail={contact.email}
                    recipientTitle={contact.title}
                    className="w-full justify-center px-3 py-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
                  />
                )}
                <Link
                  href="/sequences"
                  className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-sm font-medium bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
                >
                  <Zap className="h-4 w-4" />
                  Enroll in Sequence
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Sheet */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetHeader onClose={() => setIsEditOpen(false)}>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Edit Contact</h2>
        </SheetHeader>
        <SheetBody>
          <ContactForm
            initialData={contact}
            onSubmit={handleEditSubmit}
            isSubmitting={isSubmitting}
            onCancel={() => setIsEditOpen(false)}
          />
        </SheetBody>
      </Sheet>
    </>
  );
}

type TimelineEvent = {
  id: string;
  type: 'activity' | 'email' | 'deal';
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  date: string;
  color: string;
  meta?: string;
};

function UnifiedTimeline({
  activities,
  emails,
  deals,
  onShowForm,
}: {
  activities: Activity[];
  emails: EmailSummaryItem[];
  deals: Deal[];
  onShowForm: () => void;
}) {
  const events: TimelineEvent[] = [
    ...activities.map((a): TimelineEvent => ({
      id: `act-${a.id}`,
      type: 'activity',
      icon: a.type === 'call' ? <Phone className="h-3 w-3" /> :
            a.type === 'email' ? <Mail className="h-3 w-3" /> :
            a.type === 'meeting' ? <Calendar className="h-3 w-3" /> :
            <Briefcase className="h-3 w-3" />,
      title: a.title,
      subtitle: a.description || `${a.type.charAt(0).toUpperCase() + a.type.slice(1)} logged`,
      date: a.created_at,
      color: a.completed ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' :
             a.type === 'call' ? 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400' :
             a.type === 'email' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400' :
             'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
      meta: a.completed ? 'Completed' : a.due_date ? `Due ${new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : undefined,
    })),
    ...emails.map((e): TimelineEvent => ({
      id: `email-${e.id}`,
      type: 'email',
      icon: <Inbox className="h-3 w-3" />,
      title: e.subject || '(no subject)',
      subtitle: e.ai_summary || `From ${e.from_address}`,
      date: e.date,
      color: e.ai_sentiment === 'positive' ? 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400' :
             e.ai_sentiment === 'negative' ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' :
             'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
      meta: e.ai_sentiment ? e.ai_sentiment.charAt(0).toUpperCase() + e.ai_sentiment.slice(1) : undefined,
    })),
    ...deals.map((d): TimelineEvent => ({
      id: `deal-${d.id}`,
      type: 'deal',
      icon: <Briefcase className="h-3 w-3" />,
      title: d.title,
      subtitle: `$${(d.value || 0).toLocaleString()} · ${d.stage?.replace('_', ' ')}`,
      date: d.created_at,
      color: d.stage === 'closed_won' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' :
             d.stage === 'closed_lost' ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' :
             'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
      meta: d.stage?.replace('_', ' '),
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No touchpoints yet</p>
        <button onClick={onShowForm} className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          Log your first activity
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-[13px] top-3 bottom-3 w-px bg-zinc-200 dark:bg-zinc-700" />
      <div className="space-y-4">
        {events.map((event) => (
          <div key={event.id} className="flex gap-3 relative">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 z-10 ${event.color}`}>
              {event.icon}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{event.title}</p>
                {event.meta && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 capitalize shrink-0">
                    {event.meta}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">{event.subtitle}</p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PropertyRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-zinc-400 dark:text-zinc-500">{label}</p>
        {value ? (
          href ? (
            href.startsWith('/') ? (
              <Link href={href} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                {value}
              </Link>
            ) : (
              <a href={href} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                {value}
              </a>
            )
          ) : (
            <p className="text-sm text-zinc-700 dark:text-zinc-300">{value}</p>
          )
        ) : (
          <p className="text-sm text-zinc-300 dark:text-zinc-600">—</p>
        )}
      </div>
    </div>
  );
}
