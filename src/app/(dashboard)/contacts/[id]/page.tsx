'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Mail, Phone, Building, Briefcase, Tag, Calendar, Edit, Trash2, 
  ArrowLeft, PhoneCall, MessageSquare, CheckCircle, XCircle, Plus 
} from 'lucide-react';
import Link from 'next/link';
import { getContactById, deleteContact } from '@/lib/api/contacts';
import { getActivitiesByContact } from '@/lib/api/activities';
import ActivityTimeline from '@/components/activities/activity-timeline';
import ActivityForm from '@/components/activities/activity-form';
import { useCreateActivity } from '@/hooks/use-activities';
import type { Contact } from '@/lib/api/contacts';
import type { Activity } from '@/lib/api/activities';

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const createActivityMutation = useCreateActivity();

  const contactId = params.id as string;

  useEffect(() => {
    async function fetchContact() {
      setLoading(true);
      const result = await getContactById(contactId);
      if (result.error) {
        setError(result.error);
      } else {
        setContact(result.data);
      }
      setLoading(false);
    }
    async function fetchActivities() {
      setActivitiesLoading(true);
      const result = await getActivitiesByContact(contactId);
      if (!result.error) {
        setActivities(result.data || []);
      }
      setActivitiesLoading(false);
    }
    fetchContact();
    fetchActivities();
  }, [contactId]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this contact?')) {
      return;
    }

    setDeleting(true);
    const result = await deleteContact(contactId);
    if (result.error) {
      setError(result.error);
      setDeleting(false);
    } else {
      router.push('/contacts');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="text-green-500" size={16} />;
      case 'inactive': return <XCircle className="text-slate-400" size={16} />;
      case 'lead': return <MessageSquare className="text-indigo-500" size={16} />;
      default: return <Tag size={16} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-slate-100 text-slate-800';
      case 'lead': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/contacts"
            className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Contacts
          </Link>
        </div>
        <div className="text-center py-12 text-slate-500">Loading contact details...</div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/contacts"
            className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Contacts
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Contact not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/contacts"
              className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to Contacts
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-800 text-2xl font-bold">
                {contact.first_name.charAt(0)}{contact.last_name.charAt(0)}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                {contact.first_name} {contact.last_name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(contact.status)}`}>
                  <span className="flex items-center gap-1">
                    {getStatusIcon(contact.status)}
                    {contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
                  </span>
                </span>
                {contact.title && (
                  <span className="text-slate-600">• {contact.title}</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/contacts/${contact.id}/edit`}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Edit size={18} />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={18} />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
                    <Mail size={16} />
                    Email
                  </div>
                  {contact.email ? (
                    <a 
                      href={`mailto:${contact.email}`}
                      className="text-slate-900 hover:text-indigo-600 hover:underline"
                    >
                      {contact.email}
                    </a>
                  ) : (
                    <span className="text-slate-400">Not provided</span>
                  )}
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
                    <Phone size={16} />
                    Phone
                  </div>
                  {contact.phone ? (
                    <a 
                      href={`tel:${contact.phone}`}
                      className="text-slate-900 hover:text-indigo-600 hover:underline"
                    >
                      {contact.phone}
                    </a>
                  ) : (
                    <span className="text-slate-400">Not provided</span>
                  )}
                </div>
              </div>
              
              <div>
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
                    <Building size={16} />
                    Company
                  </div>
                  {contact.company_id ? (
                    <Link 
                      href={`/companies/${contact.company_id}`}
                      className="text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      View Company
                    </Link>
                  ) : (
                    <span className="text-slate-400">No company assigned</span>
                  )}
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
                    <Briefcase size={16} />
                    Title
                  </div>
                  {contact.title ? (
                    <span className="text-slate-900">{contact.title}</span>
                  ) : (
                    <span className="text-slate-400">Not provided</span>
                  )}
                </div>
              </div>
            </div>
            
            {contact.source && (
              <div className="mt-6">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
                  <Tag size={16} />
                  Source
                </div>
                <span className="text-slate-900">{contact.source}</span>
              </div>
            )}
            
            {contact.notes && (
              <div className="mt-6">
                <div className="text-sm font-medium text-slate-700 mb-2">Notes</div>
                <div className="bg-slate-50 rounded-lg p-4 text-slate-700 whitespace-pre-wrap">
                  {contact.notes}
                </div>
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Activity Timeline</h2>
              <button
                onClick={() => setShowActivityForm(!showActivityForm)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Plus size={16} />
                {showActivityForm ? 'Cancel' : 'Add Activity'}
              </button>
            </div>
            
            {showActivityForm && (
              <div className="mb-6">
                <ActivityForm
                  contactId={contactId}
                  onSubmit={async (data) => {
                    try {
                      const result = await createActivityMutation.mutateAsync(data);
                      if (!result.error) {
                        setShowActivityForm(false);
                        // Refresh activities
                        const activitiesResult = await getActivitiesByContact(contactId);
                        if (!activitiesResult.error) {
                          setActivities(activitiesResult.data || []);
                        }
                      }
                      return result;
                    } catch (_err) {
                      return { error: 'Failed to create activity' };
                    }
                  }}
                  onCancel={() => setShowActivityForm(false)}
                  isLoading={createActivityMutation.isPending}
                />
              </div>
            )}
            
            <ActivityTimeline
              activities={activities}
              isLoading={activitiesLoading}
              onRefresh={async () => {
                setActivitiesLoading(true);
                const result = await getActivitiesByContact(contactId);
                if (!result.error) {
                  setActivities(result.data || []);
                }
                setActivitiesLoading(false);
              }}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Details</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-slate-700 mb-1">Created</div>
                <div className="flex items-center gap-2 text-slate-900">
                  <Calendar size={16} className="text-slate-400" />
                  {formatDate(contact.created_at)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-700 mb-1">Last Updated</div>
                <div className="flex items-center gap-2 text-slate-900">
                  <Calendar size={16} className="text-slate-400" />
                  {formatDate(contact.updated_at)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                <PhoneCall size={18} />
                Log a Call
              </button>
              <button className="w-full flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                <MessageSquare size={18} />
                Send Email
              </button>
              <Link
                href={`/contacts/${contact.id}/edit`}
                className="w-full flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors block"
              >
                <Edit size={18} />
                Edit Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
