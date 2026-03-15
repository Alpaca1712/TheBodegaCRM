'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Edit,
  Trash2,
  ExternalLink,
  Mail,
  MapPin,
  Loader2,
} from 'lucide-react';
import { STAGE_LABELS, STAGE_NEXT_ACTIONS, type Lead, type LeadEmail, type PipelineStage, PIPELINE_STAGES } from '@/types/leads';
import EmailGenerator from '@/components/email/email-generator';
import EmailThread from '@/components/email/email-thread';

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [emails, setEmails] = useState<LeadEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'email' | 'research' | 'thread'>('research');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchLead();
  }, [id]);

  const fetchLead = async () => {
    try {
      const res = await fetch(`/api/leads/${id}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setLead(data.lead);
      setEmails(data.emails || []);
    } catch {
      toast.error('Lead not found');
      router.push('/leads');
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (newStage: PipelineStage) => {
    if (!lead) return;
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) throw new Error('Failed');
      const updated = await res.json();
      setLead(updated);
      toast.success(`Stage updated to ${STAGE_LABELS[newStage]}`);
    } catch {
      toast.error('Failed to update stage');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this lead? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      toast.success('Lead deleted');
      router.push('/leads');
    } catch {
      toast.error('Failed to delete lead');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEmailSaved = async (variant: { subject: string; body: string }, ctaType: 'mckenna' | 'hormozi') => {
    try {
      const emailRes = await fetch('/api/leads/' + id, { method: 'GET' });
      if (emailRes.ok) {
        const data = await emailRes.json();
        setLead(data.lead);
        setEmails(data.emails || []);
      }
    } catch {
      // refresh silently
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/leads" className="mt-1 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <ArrowLeft className="h-4 w-4 text-zinc-500" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{lead.contact_name}</h1>
              <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                lead.type === 'customer'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                  : 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
              }`}>
                {lead.type === 'customer' ? 'Customer' : 'Investor'}
              </span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {lead.contact_title && `${lead.contact_title} at `}{lead.company_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/leads/${id}/edit`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 rounded-lg transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Stage & Contact Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pipeline Stage */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Pipeline Stage</h3>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Next: {STAGE_NEXT_ACTIONS[lead.stage]}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PIPELINE_STAGES.map((stage) => (
                <button
                  key={stage}
                  onClick={() => handleStageChange(stage)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    lead.stage === stage
                      ? 'bg-red-600 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {STAGE_LABELS[stage]}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-700">
            {[
              { id: 'research' as const, label: 'Research' },
              { id: 'email' as const, label: 'Generate Email' },
              { id: 'thread' as const, label: `Email Thread (${emails.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? 'border-red-600 text-red-600 dark:text-red-400'
                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'research' && (
            <div className="space-y-4">
              <ResearchField label="Company Description" value={lead.company_description} />
              {lead.type === 'customer' ? (
                <ResearchField label="Attack Surface Notes" value={lead.attack_surface_notes} />
              ) : (
                <ResearchField label="Investment Thesis Notes" value={lead.investment_thesis_notes} />
              )}
              <ResearchField label="Personal Details" value={lead.personal_details} />
              {lead.smykm_hooks?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">SMYKM Hooks</p>
                  <div className="flex flex-wrap gap-2">
                    {lead.smykm_hooks.map((hook, i) => (
                      <span key={i} className="px-2.5 py-1 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-md text-xs">
                        {hook}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'email' && (
            <EmailGenerator lead={lead} onEmailSaved={handleEmailSaved} />
          )}

          {activeTab === 'thread' && (
            <EmailThread emails={emails} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Contact Card */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Contact Info</h3>

            {lead.contact_email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-zinc-400" />
                <a href={`mailto:${lead.contact_email}`} className="text-sm text-red-600 dark:text-red-400 hover:underline">
                  {lead.contact_email}
                </a>
              </div>
            )}
            {lead.contact_linkedin && (
              <div className="flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
                <a href={lead.contact_linkedin} target="_blank" rel="noopener noreferrer" className="text-sm text-red-600 dark:text-red-400 hover:underline truncate">
                  LinkedIn
                </a>
              </div>
            )}
            {lead.contact_twitter && (
              <div className="flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
                <a href={`https://twitter.com/${lead.contact_twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-red-600 dark:text-red-400 hover:underline">
                  {lead.contact_twitter}
                </a>
              </div>
            )}
          </div>

          {/* Metadata Card */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Details</h3>
            <InfoRow label="Type" value={lead.type === 'customer' ? 'Customer' : 'Investor'} />
            {lead.product_name && <InfoRow label="Product" value={lead.product_name} />}
            {lead.fund_name && <InfoRow label="Fund" value={lead.fund_name} />}
            <InfoRow label="Priority" value={lead.priority} />
            {lead.source && <InfoRow label="Source" value={lead.source} />}
            <InfoRow label="Stage" value={STAGE_LABELS[lead.stage]} />
          </div>

          {/* Notes */}
          {lead.notes && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-4">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Notes</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResearchField({ label, value }: { label: string; value: string | null }) {
  if (!value) {
    return (
      <div>
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>
        <p className="text-sm text-zinc-400 dark:text-zinc-500 italic">Not filled in yet</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>
      <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 capitalize">{value}</span>
    </div>
  );
}
