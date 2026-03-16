'use client';

import { useState, useEffect, useRef, useCallback, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Edit,
  Trash2,
  ExternalLink,
  Mail,
  Loader2,
  Brain,
  ArrowRight,
  Users,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Linkedin,
  Twitter,
  Phone,
  MapPin,
  Hash,
  Send,
  ThermometerSun,
  Flame,
  Snowflake,
  Zap,
} from 'lucide-react';
import {
  STAGE_LABELS, STAGE_NEXT_ACTIONS, LEAD_TYPE_LABELS, LEAD_TYPE_COLORS,
  CHANNEL_LABELS, INTERACTION_TYPE_LABELS, CHANNEL_INTERACTION_TYPES,
  INTERACTION_CHANNELS,
  type Lead, type LeadEmail, type LeadInteraction, type PipelineStage, type InteractionChannel, type InteractionType,
  PIPELINE_STAGES, type ConversationSignal,
} from '@/types/leads';
import EmailGenerator from '@/components/email/email-generator';
import EmailThread from '@/components/email/email-thread';

interface RelatedLead {
  id: string;
  contact_name: string;
  contact_email: string | null;
  stage: string;
  type: string;
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get('tab');
  const urlFollowup = searchParams.get('followup');
  const [lead, setLead] = useState<Lead | null>(null);
  const [emails, setEmails] = useState<LeadEmail[]>([]);
  const [interactions, setInteractions] = useState<LeadInteraction[]>([]);
  const [relatedLeads, setRelatedLeads] = useState<RelatedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'email' | 'research' | 'thread' | 'conversation'>(
    (urlTab === 'email' || urlTab === 'thread' || urlTab === 'conversation') ? urlTab : 'research'
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLead = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${id}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setLead(data.lead);
      setEmails(data.emails || []);
      setInteractions(data.interactions || []);
      setRelatedLeads(data.relatedLeads || []);
    } catch {
      toast.error('Lead not found');
      router.push('/leads');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

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

  const handleEmailSaved = async () => {
    try {
      const emailRes = await fetch('/api/leads/' + id, { method: 'GET' });
      if (emailRes.ok) {
        const data = await emailRes.json();
        setLead(data.lead);
        setEmails(data.emails || []);
        setInteractions(data.interactions || []);
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
              <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${LEAD_TYPE_COLORS[lead.type].bg} ${LEAD_TYPE_COLORS[lead.type].text}`}>
                {LEAD_TYPE_LABELS[lead.type]}
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
          <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-700 overflow-x-auto">
            {[
              { id: 'research' as const, label: 'Research' },
              { id: 'conversation' as const, label: 'Conversation Intel' },
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
              {lead.type === 'customer' && (
                <ResearchField label="Attack Surface Notes" value={lead.attack_surface_notes} />
              )}
              {lead.type === 'investor' && (
                <ResearchField label="Investment Thesis Notes" value={lead.investment_thesis_notes} />
              )}
              {lead.type === 'partnership' && (
                <ResearchField label="Partnership Opportunity Notes" value={lead.investment_thesis_notes} />
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

          {activeTab === 'conversation' && (
            <ConversationIntel lead={lead} emails={emails} interactions={interactions} relatedLeads={relatedLeads} />
          )}

          {activeTab === 'email' && (
            <EmailGenerator
              lead={lead}
              emails={emails}
              followUpType={urlFollowup}
              onEmailSaved={handleEmailSaved}
            />
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
                <Linkedin className="h-3.5 w-3.5 text-[#0A66C2]" />
                <a href={lead.contact_linkedin.startsWith('http') ? lead.contact_linkedin : `https://${lead.contact_linkedin}`} target="_blank" rel="noopener noreferrer" className="text-sm text-[#0A66C2] hover:underline truncate">
                  LinkedIn Profile
                </a>
              </div>
            )}
            {lead.contact_twitter && (
              <div className="flex items-center gap-2">
                <Twitter className="h-3.5 w-3.5 text-zinc-400" />
                <a href={`https://twitter.com/${lead.contact_twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-red-600 dark:text-red-400 hover:underline">
                  {lead.contact_twitter}
                </a>
              </div>
            )}
          </div>

          {/* Log Interaction */}
          <LogInteractionCard leadId={id} onLogged={fetchLead} />

          {/* Metadata Card */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Details</h3>
            <InfoRow label="Type" value={LEAD_TYPE_LABELS[lead.type]} />
            {lead.product_name && <InfoRow label="Product" value={lead.product_name} />}
            {lead.fund_name && <InfoRow label="Fund" value={lead.fund_name} />}
            <InfoRow label="Priority" value={lead.priority} />
            {lead.source && <InfoRow label="Source" value={lead.source} />}
            <InfoRow label="Stage" value={STAGE_LABELS[lead.stage]} />
          </div>

          {/* AI Summary with enhanced next step */}
          {lead.conversation_summary && (
            <EnhancedAISummary lead={lead} />
          )}

          {/* Email Stats */}
          {(lead.total_emails_in > 0 || lead.total_emails_out > 0) && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-4">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Email Activity</h3>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                  <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{lead.total_emails_out}</p>
                  <p className="text-[10px] text-zinc-500">Sent</p>
                </div>
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                  <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{lead.total_emails_in}</p>
                  <p className="text-[10px] text-zinc-500">Received</p>
                </div>
              </div>
              {lead.thread_count > 0 && (
                <p className="text-[11px] text-zinc-400 mt-2 text-center">{lead.thread_count} thread{lead.thread_count !== 1 ? 's' : ''}</p>
              )}
            </div>
          )}

          {/* Related Leads (same domain) */}
          {relatedLeads.length > 0 && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-zinc-400" />
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Same Company ({lead.email_domain})
                </h3>
              </div>
              <div className="space-y-1.5">
                {relatedLeads.map(rl => (
                  <Link
                    key={rl.id}
                    href={`/leads/${rl.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors group"
                  >
                    <div>
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-red-600 dark:group-hover:text-red-400">{rl.contact_name}</p>
                      <p className="text-[10px] text-zinc-400">{rl.contact_email}</p>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                      {STAGE_LABELS[rl.stage as PipelineStage] || rl.stage}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Inline editable Notes */}
          <InlineNotes leadId={id} initialNotes={lead.notes} onSaved={(notes) => setLead(prev => prev ? { ...prev, notes } : prev)} />
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

// --- Inline editable Notes ---

function InlineNotes({ leadId, initialNotes, onSaved }: { leadId: string; initialNotes: string | null; onSaved: (notes: string) => void }) {
  const [notes, setNotes] = useState(initialNotes || '');
  const [saving, setSaving] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async (value: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: value }),
      });
      if (res.ok) onSaved(value);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }, [leadId, onSaved]);

  const handleChange = (value: string) => {
    setNotes(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => save(value), 1500);
  };

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notes</h3>
        {saving && <span className="text-[10px] text-zinc-400 animate-pulse">Saving...</span>}
      </div>
      <textarea
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => { if (timeoutRef.current) { clearTimeout(timeoutRef.current); save(notes); } }}
        placeholder="Paste LinkedIn DMs, call notes, or any context..."
        className="w-full min-h-[80px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors resize-y"
      />
    </div>
  );
}

// --- Log Interaction Card ---

const channelIcons: Record<string, React.ReactNode> = {
  linkedin: <Linkedin className="h-3.5 w-3.5" />,
  twitter: <Twitter className="h-3.5 w-3.5" />,
  phone: <Phone className="h-3.5 w-3.5" />,
  in_person: <MapPin className="h-3.5 w-3.5" />,
  other: <Hash className="h-3.5 w-3.5" />,
};

function LogInteractionCard({ leadId, onLogged }: { leadId: string; onLogged: () => void }) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<InteractionChannel>('linkedin');
  const [interactionType, setInteractionType] = useState<InteractionType>('dm_sent');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const availableTypes = CHANNEL_INTERACTION_TYPES[channel];

  useEffect(() => {
    if (!availableTypes.includes(interactionType)) {
      setInteractionType(availableTypes[0]);
    }
  }, [channel, availableTypes, interactionType]);

  const handleSubmit = async () => {
    if (!summary.trim() && !content.trim()) {
      toast.error('Add a summary or paste content');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/lead-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          channel,
          interaction_type: interactionType,
          content: content || null,
          summary: summary || null,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Interaction logged — AI analyzing...');
      setContent('');
      setSummary('');
      setOpen(false);
      onLogged();
    } catch {
      toast.error('Failed to log interaction');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left"
      >
        <Plus className={`h-3.5 w-3.5 text-red-500 transition-transform ${open ? 'rotate-45' : ''}`} />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Log Interaction</h3>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {/* Channel selector */}
          <div className="flex flex-wrap gap-1.5">
            {INTERACTION_CHANNELS.map((ch) => (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  channel === ch
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {channelIcons[ch]}
                {CHANNEL_LABELS[ch]}
              </button>
            ))}
          </div>

          {/* Type selector */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Type</label>
            <select
              value={interactionType}
              onChange={(e) => setInteractionType(e.target.value as InteractionType)}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            >
              {availableTypes.map((t) => (
                <option key={t} value={t}>{INTERACTION_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Summary</label>
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Quick summary of what happened..."
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Content (paste DM, call notes, etc.)</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste the conversation or notes here..."
              className="w-full min-h-[60px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 resize-y"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50 w-full justify-center"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {submitting ? 'Logging & Analyzing...' : 'Log & Analyze'}
          </button>
        </div>
      )}
    </div>
  );
}

// --- Enhanced AI Summary sidebar card ---

function parseNextStep(nextStep: string): { channel: string | null; framework: string | null; text: string; tactical: string | null } {
  const channelMatch = nextStep.match(/^\[([^\]]+)\]\s*/)
  let rest = channelMatch ? nextStep.slice(channelMatch[0].length) : nextStep
  const frameworkMatch = rest.match(/^\[([^\]]+)\]\s*/)
  rest = frameworkMatch ? rest.slice(frameworkMatch[0].length) : rest
  const tacticalSplit = rest.split('\n\nTactical: ')
  return {
    channel: channelMatch?.[1] || null,
    framework: frameworkMatch?.[1] || null,
    text: tacticalSplit[0],
    tactical: tacticalSplit[1] || null,
  }
}

const warmthConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  cold: { icon: <Snowflake className="h-3 w-3" />, label: 'Cold', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30' },
  warm: { icon: <ThermometerSun className="h-3 w-3" />, label: 'Warm', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' },
  hot: { icon: <Flame className="h-3 w-3" />, label: 'Hot', color: 'text-red-500 bg-red-50 dark:bg-red-950/30' },
}

function EnhancedAISummary({ lead }: { lead: Lead }) {
  const parsed = lead.conversation_next_step ? parseNextStep(lead.conversation_next_step) : null

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Brain className="h-3.5 w-3.5 text-red-500" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">AI Strategy</h3>
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{lead.conversation_summary}</p>

      {parsed && (
        <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-700 space-y-2">
          {/* Tags row */}
          <div className="flex flex-wrap gap-1.5">
            {parsed.channel && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-300">
                {channelIcons[parsed.channel.toLowerCase()] || <Zap className="h-3 w-3" />}
                {parsed.channel}
              </span>
            )}
            {parsed.framework && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-300">
                {parsed.framework}
              </span>
            )}
          </div>

          {/* Main recommendation */}
          <div className="flex items-start gap-2">
            <ArrowRight className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
            <p className="text-xs text-green-700 dark:text-green-400 leading-relaxed">{parsed.text}</p>
          </div>

          {/* Tactical move */}
          {parsed.tactical && (
            <div className="flex items-start gap-2 pl-5">
              <Zap className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-700 dark:text-amber-400 italic">{parsed.tactical}</p>
            </div>
          )}
        </div>
      )}

      {!parsed && lead.conversation_next_step && (
        <div className="flex items-start gap-2 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-700">
          <ArrowRight className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
          <p className="text-xs text-green-700 dark:text-green-400">{lead.conversation_next_step}</p>
        </div>
      )}

      {lead.auto_stage_reason && (
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 italic mt-1">
          Stage set by AI: {lead.auto_stage_reason}
        </p>
      )}
    </div>
  );
}

// --- Conversation Intel tab (with timeline) ---

const signalIcons: Record<string, React.ReactNode> = {
  positive: <TrendingUp className="h-3.5 w-3.5 text-green-500" />,
  negative: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
  neutral: <MessageSquare className="h-3.5 w-3.5 text-zinc-400" />,
  action_needed: <Clock className="h-3.5 w-3.5 text-amber-500" />,
}

const signalColors: Record<string, string> = {
  positive: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30',
  negative: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30',
  neutral: 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800',
  action_needed: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
}

interface TimelineEntry {
  id: string;
  date: string;
  type: 'email' | 'interaction';
  direction: 'inbound' | 'outbound';
  channel: string;
  label: string;
  snippet: string;
}

function buildTimeline(emails: LeadEmail[], interactions: LeadInteraction[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const e of emails) {
    entries.push({
      id: e.id,
      date: e.sent_at || e.created_at,
      type: 'email',
      direction: e.direction,
      channel: 'email',
      label: e.direction === 'outbound' ? 'Email sent' : 'Email received',
      snippet: e.subject || e.body?.slice(0, 80) || '',
    });
  }

  for (const ix of interactions) {
    const isOutbound = ['dm_sent', 'connection_request', 'comment', 'post_like', 'post_share', 'call', 'meeting'].includes(ix.interaction_type);
    entries.push({
      id: ix.id,
      date: ix.occurred_at,
      type: 'interaction',
      direction: isOutbound ? 'outbound' : 'inbound',
      channel: ix.channel,
      label: `${CHANNEL_LABELS[ix.channel]} — ${INTERACTION_TYPE_LABELS[ix.interaction_type]}`,
      snippet: ix.summary || ix.content?.slice(0, 80) || '',
    });
  }

  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return entries;
}

function ConversationIntel({ lead, emails, interactions, relatedLeads }: { lead: Lead; emails: LeadEmail[]; interactions: LeadInteraction[]; relatedLeads: RelatedLead[] }) {
  const hasData = lead.conversation_summary || lead.conversation_signals?.length > 0 || emails.length > 0 || interactions.length > 0
  const timeline = buildTimeline(emails, interactions);

  if (!hasData) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 p-8 text-center">
        <Brain className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No conversation data yet</p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
          Sync Gmail or log an interaction to start building conversation intelligence.
        </p>
      </div>
    )
  }

  const parsed = lead.conversation_next_step ? parseNextStep(lead.conversation_next_step) : null

  return (
    <div className="space-y-4">
      {/* Summary & Enhanced Next Step */}
      {lead.conversation_summary && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Conversation Summary</h3>
          </div>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{lead.conversation_summary}</p>

          {parsed && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <p className="text-xs font-semibold text-green-800 dark:text-green-300">Recommended Next Step</p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {parsed.channel && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-white/60 dark:bg-zinc-800/60 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">
                    {channelIcons[parsed.channel.toLowerCase()] || <Zap className="h-3 w-3" />}
                    {parsed.channel}
                  </span>
                )}
                {parsed.framework && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-white/60 dark:bg-zinc-800/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
                    {parsed.framework}
                  </span>
                )}
              </div>

              <p className="text-sm text-green-700 dark:text-green-400">{parsed.text}</p>

              {parsed.tactical && (
                <div className="flex items-start gap-2 pt-1 border-t border-green-200/50 dark:border-green-700/50">
                  <Zap className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 italic">{parsed.tactical}</p>
                </div>
              )}
            </div>
          )}

          {!parsed && lead.conversation_next_step && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-green-800 dark:text-green-300">Recommended Next Step</p>
                <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">{lead.conversation_next_step}</p>
              </div>
            </div>
          )}

          {lead.auto_stage_reason && (
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 italic">
              Pipeline auto-updated: {lead.auto_stage_reason}
            </p>
          )}
        </div>
      )}

      {/* Signals */}
      {lead.conversation_signals && lead.conversation_signals.length > 0 && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Detected Signals</h3>
          <div className="space-y-2">
            {lead.conversation_signals.map((signal: ConversationSignal, i: number) => (
              <div key={i} className={`flex items-start gap-2.5 p-3 rounded-lg border ${signalColors[signal.type] || signalColors.neutral}`}>
                <div className="mt-0.5">{signalIcons[signal.type] || signalIcons.neutral}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-800 dark:text-zinc-200">{signal.signal}</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Source: {signal.source}
                    {signal.detected_at && ` · ${new Date(signal.detected_at).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Multi-channel Timeline */}
      {timeline.length > 0 && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Activity Timeline</h3>
          <div className="space-y-0">
            {timeline.map((entry, i) => (
              <div key={entry.id} className="flex gap-3 relative">
                {/* Vertical line */}
                {i < timeline.length - 1 && (
                  <div className="absolute left-[11px] top-6 bottom-0 w-px bg-zinc-200 dark:bg-zinc-700" />
                )}
                {/* Dot */}
                <div className={`mt-1.5 h-[9px] w-[9px] rounded-full shrink-0 ring-2 ring-white dark:ring-zinc-800 ${
                  entry.channel === 'email'
                    ? entry.direction === 'outbound' ? 'bg-red-500' : 'bg-blue-500'
                    : entry.channel === 'linkedin' ? 'bg-[#0A66C2]'
                    : entry.channel === 'twitter' ? 'bg-zinc-800 dark:bg-zinc-200'
                    : entry.channel === 'phone' ? 'bg-green-500'
                    : 'bg-zinc-400'
                }`} />
                {/* Content */}
                <div className="pb-4 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">{entry.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      entry.direction === 'outbound'
                        ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                        : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                    }`}>
                      {entry.direction === 'outbound' ? 'You' : 'Them'}
                    </span>
                  </div>
                  {entry.snippet && (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{entry.snippet}</p>
                  )}
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                    {new Date(entry.date).toLocaleDateString()} {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email stats */}
      {(lead.total_emails_in > 0 || lead.total_emails_out > 0) && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Email Activity</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-center">
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{lead.total_emails_out}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Sent</p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-center">
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{lead.total_emails_in}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Received</p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-center">
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{lead.thread_count}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Threads</p>
            </div>
          </div>
          <div className="mt-3 flex gap-4 text-[11px] text-zinc-500">
            {lead.last_outbound_at && <span>Last sent: {new Date(lead.last_outbound_at).toLocaleDateString()}</span>}
            {lead.last_inbound_at && <span>Last received: {new Date(lead.last_inbound_at).toLocaleDateString()}</span>}
          </div>
        </div>
      )}

      {/* Related leads at same company */}
      {relatedLeads.length > 0 && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Other contacts at {lead.email_domain || lead.company_name}
            </h3>
          </div>
          <div className="space-y-2">
            {relatedLeads.map(rl => (
              <Link
                key={rl.id}
                href={`/leads/${rl.id}`}
                className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{rl.contact_name}</p>
                  <p className="text-[11px] text-zinc-400">{rl.contact_email}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                  {STAGE_LABELS[rl.stage as PipelineStage] || rl.stage}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
