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
  Camera,
  GraduationCap,
  Sparkles,
  BookOpen,
  Trash,
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

interface AgentMemory {
  id: string;
  memory_type: string;
  content: string;
  source: string | null;
  relevance_score: number;
  created_at: string;
}

type TabId = 'overview' | 'emails' | 'conversation' | 'memory';

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
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>(
    urlTab === 'emails' || urlTab === 'conversation' || urlTab === 'memory' ? urlTab : 'overview'
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null);
  const [coachingLoading, setCoachingLoading] = useState(false);
  const [coaching, setCoaching] = useState<Record<string, unknown> | null>(null);

  const fetchLead = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${id}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setLead(data.lead);
      setEmails(data.emails || []);
      setInteractions(data.interactions || []);
      setRelatedLeads(data.relatedLeads || []);
      if (data.lead?.account_snapshot) setSnapshot(data.lead.account_snapshot);
    } catch {
      toast.error('Lead not found');
      router.push('/leads');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const fetchMemories = useCallback(async () => {
    try {
      const res = await fetch(`/api/ai/extract-memories?leadId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
      }
    } catch { /* ignore */ }
  }, [id]);

  useEffect(() => { fetchLead(); fetchMemories(); }, [fetchLead, fetchMemories]);

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
    } catch { /* silent */ }
  };

  const generateSnapshot = async () => {
    setSnapshotLoading(true);
    try {
      const res = await fetch('/api/ai/account-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: id }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setSnapshot(data);
      toast.success('Snapshot generated');
    } catch {
      toast.error('Failed to generate snapshot');
    } finally {
      setSnapshotLoading(false);
    }
  };

  const generateCoaching = async () => {
    setCoachingLoading(true);
    try {
      const res = await fetch('/api/ai/sales-coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: id }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setCoaching(data);
      toast.success('Coaching report generated');
    } catch {
      toast.error('Failed to generate coaching');
    } finally {
      setCoachingLoading(false);
    }
  };

  const deleteMemory = async (memoryId: string) => {
    try {
      await fetch(`/api/ai/extract-memories?id=${memoryId}`, { method: 'DELETE' });
      setMemories(prev => prev.filter(m => m.id !== memoryId));
      toast.success('Memory deleted');
    } catch {
      toast.error('Failed to delete');
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

  const tabs: Array<{ id: TabId; label: string; count?: number }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'emails', label: 'Emails', count: emails.length },
    { id: 'conversation', label: 'Conversation' },
    { id: 'memory', label: 'Memory', count: memories.length },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link href="/leads" className="mt-1.5 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <ArrowLeft className="h-4 w-4 text-zinc-500" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{lead.contact_name}</h1>
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${LEAD_TYPE_COLORS[lead.type].bg} ${LEAD_TYPE_COLORS[lead.type].text}`}>
                {LEAD_TYPE_LABELS[lead.type]}
              </span>
              {lead.risk_score != null && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${
                  lead.risk_score > 50 ? 'bg-red-100 dark:bg-red-900/40 text-red-600' :
                  lead.risk_score > 15 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600' :
                  'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600'
                }`}>
                  Risk: {lead.risk_score}
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {lead.contact_title && `${lead.contact_title} at `}{lead.company_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={generateSnapshot}
            disabled={snapshotLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {snapshotLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            Snapshot
          </button>
          <button
            onClick={generateCoaching}
            disabled={coachingLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {coachingLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GraduationCap className="h-3.5 w-3.5" />}
            Coach Me
          </button>
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
          </button>
        </div>
      </div>

      {/* Pipeline Stage */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4">
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
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                lead.stage === stage
                  ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
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
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'border-red-600 text-red-600 dark:text-red-400'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 tabular-nums">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Snapshot Panel */}
          {snapshot && activeTab === 'overview' && (
            <SnapshotPanel snapshot={snapshot} />
          )}

          {/* Coaching Panel */}
          {coaching && activeTab === 'emails' && (
            <CoachingPanel coaching={coaching} />
          )}

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {lead.conversation_summary && <EnhancedAISummary lead={lead} />}
              <ResearchSection lead={lead} />
            </div>
          )}

          {activeTab === 'emails' && (
            <div className="space-y-5">
              <EmailGenerator
                lead={lead}
                emails={emails}
                followUpType={urlFollowup}
                onEmailSaved={handleEmailSaved}
              />
              <EmailThread emails={emails} />
            </div>
          )}

          {activeTab === 'conversation' && (
            <ConversationIntel lead={lead} emails={emails} interactions={interactions} relatedLeads={relatedLeads} />
          )}

          {activeTab === 'memory' && (
            <MemoryTab memories={memories} onDelete={deleteMemory} leadId={id} onRefresh={fetchMemories} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <ContactCard lead={lead} />
          <LogInteractionCard leadId={id} onLogged={fetchLead} />
          <DetailsCard lead={lead} />
          {(lead.total_emails_in > 0 || lead.total_emails_out > 0) && <EmailStatsCard lead={lead} />}
          {relatedLeads.length > 0 && <RelatedLeadsCard leads={relatedLeads} domain={lead.email_domain || lead.company_name} />}
          <InlineNotes leadId={id} initialNotes={lead.notes} onSaved={(notes) => setLead(prev => prev ? { ...prev, notes } : prev)} />
        </div>
      </div>
    </div>
  );
}

// --- Snapshot Panel ---
function SnapshotPanel({ snapshot }: { snapshot: Record<string, unknown> }) {
  const s = snapshot as {
    executive_summary?: string; health_grade?: string; sentiment_score?: number;
    relationship_highlights?: Array<{ date: string; event: string; significance: string }>;
    active_blockers?: string[]; opportunities?: string[]; recommended_actions?: string[];
  };
  const gradeColors: Record<string, string> = {
    A: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30', B: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
    C: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30', D: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30',
    F: 'text-red-600 bg-red-50 dark:bg-red-950/30',
  };

  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900/50 dark:to-zinc-900/30 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-red-500" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Account Snapshot</h3>
        </div>
        <div className="flex items-center gap-2">
          {s.health_grade && (
            <span className={`text-lg font-bold px-2.5 py-0.5 rounded-lg ${gradeColors[s.health_grade] || gradeColors.C}`}>
              {s.health_grade}
            </span>
          )}
          {s.sentiment_score != null && (
            <span className="text-xs text-zinc-500">Sentiment: {s.sentiment_score}/10</span>
          )}
        </div>
      </div>
      {s.executive_summary && <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{s.executive_summary}</p>}
      {s.active_blockers && s.active_blockers.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Blockers</p>
          <ul className="space-y-1">{s.active_blockers.map((b, i) => <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-1.5"><AlertCircle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />{b}</li>)}</ul>
        </div>
      )}
      {s.opportunities && s.opportunities.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Opportunities</p>
          <ul className="space-y-1">{s.opportunities.map((o, i) => <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-1.5"><Sparkles className="h-3 w-3 text-emerald-400 mt-0.5 shrink-0" />{o}</li>)}</ul>
        </div>
      )}
      {s.recommended_actions && s.recommended_actions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Recommended Actions</p>
          <ol className="space-y-1">{s.recommended_actions.map((a, i) => <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-1.5"><span className="text-[10px] font-bold text-blue-500 mt-0.5">{i + 1}.</span>{a}</li>)}</ol>
        </div>
      )}
    </div>
  );
}

// --- Coaching Panel ---
function CoachingPanel({ coaching }: { coaching: Record<string, unknown> }) {
  const c = coaching as {
    overall_grade?: string; overall_summary?: string; mckenna_score?: number; hormozi_score?: number;
    strengths?: string[]; weaknesses?: string[]; top_improvement?: string;
    email_feedback?: Array<{ subject: string; grade: string; strengths: string[]; weaknesses: string[]; rewrite_suggestion: string }>;
  };
  const gradeColors: Record<string, string> = {
    A: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30', B: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
    C: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30', D: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30',
    F: 'text-red-600 bg-red-50 dark:bg-red-950/30',
  };

  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-zinc-900/30 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-purple-500" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Sales Coaching Report</h3>
        </div>
        {c.overall_grade && (
          <span className={`text-lg font-bold px-2.5 py-0.5 rounded-lg ${gradeColors[c.overall_grade] || gradeColors.C}`}>
            {c.overall_grade}
          </span>
        )}
      </div>
      {c.overall_summary && <p className="text-sm text-zinc-700 dark:text-zinc-300">{c.overall_summary}</p>}
      <div className="flex gap-4">
        {c.mckenna_score != null && <div className="text-center"><p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{c.mckenna_score}/10</p><p className="text-[10px] text-zinc-500">McKenna</p></div>}
        {c.hormozi_score != null && <div className="text-center"><p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{c.hormozi_score}/10</p><p className="text-[10px] text-zinc-500">Hormozi</p></div>}
      </div>
      {c.top_improvement && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">Top Improvement</p>
          <p className="text-xs text-amber-600 dark:text-amber-400">{c.top_improvement}</p>
        </div>
      )}
      {c.email_feedback && c.email_feedback.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Per-Email Feedback</p>
          {c.email_feedback.slice(0, 5).map((ef, i) => (
            <div key={i} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{ef.subject}</p>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${gradeColors[ef.grade] || gradeColors.C}`}>{ef.grade}</span>
              </div>
              {ef.rewrite_suggestion && <p className="text-[11px] text-zinc-500">{ef.rewrite_suggestion}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Memory Tab ---
function MemoryTab({ memories, onDelete, leadId, onRefresh }: { memories: AgentMemory[]; onDelete: (id: string) => void; leadId: string; onRefresh: () => void }) {
  const [addContent, setAddContent] = useState('');
  const [addType, setAddType] = useState('context');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!addContent.trim()) return;
    setAdding(true);
    try {
      await fetch('/api/ai/extract-memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, text: addContent, source: 'manual' }),
      });
      setAddContent('');
      onRefresh();
      toast.success('Memory added');
    } catch {
      toast.error('Failed to add');
    } finally {
      setAdding(false);
    }
  };

  const typeColors: Record<string, string> = {
    preference: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600',
    objection: 'bg-red-100 dark:bg-red-900/40 text-red-600',
    personal: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600',
    strategic: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600',
    context: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600',
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Add Memory</h3>
        <textarea
          value={addContent}
          onChange={(e) => setAddContent(e.target.value)}
          placeholder="Type a fact, preference, or context to remember about this lead..."
          className="w-full min-h-[60px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 resize-y"
        />
        <div className="flex items-center gap-2">
          <select value={addType} onChange={(e) => setAddType(e.target.value)} className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2 py-1.5 text-xs text-zinc-700 dark:text-zinc-300">
            <option value="context">Context</option>
            <option value="preference">Preference</option>
            <option value="objection">Objection</option>
            <option value="personal">Personal</option>
            <option value="strategic">Strategic</option>
          </select>
          <button onClick={handleAdd} disabled={adding || !addContent.trim()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50">
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add
          </button>
        </div>
      </div>

      {memories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 p-8 text-center">
          <BookOpen className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No memories yet</p>
          <p className="text-xs text-zinc-400 mt-1">Memories are auto-extracted from email syncs and interactions, or add them manually above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {memories.map(m => (
            <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 group">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 ${typeColors[m.memory_type] || typeColors.context}`}>
                {m.memory_type}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{m.content}</p>
                <p className="text-[10px] text-zinc-400 mt-1">
                  {m.source && `Source: ${m.source}`}
                  {m.source && ' / '}
                  Relevance: {m.relevance_score}/10
                  {' / '}
                  {new Date(m.created_at).toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => onDelete(m.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-all">
                <Trash className="h-3 w-3 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Sidebar Cards ---
function ContactCard({ lead }: { lead: Lead }) {
  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Contact</h3>
      {lead.contact_email && (
        <div className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 text-zinc-400" />
          <a href={`mailto:${lead.contact_email}`} className="text-sm text-red-600 dark:text-red-400 hover:underline truncate">{lead.contact_email}</a>
        </div>
      )}
      {lead.contact_linkedin && (
        <div className="flex items-center gap-2">
          <Linkedin className="h-3.5 w-3.5 text-[#0A66C2]" />
          <a href={lead.contact_linkedin.startsWith('http') ? lead.contact_linkedin : `https://${lead.contact_linkedin}`} target="_blank" rel="noopener noreferrer" className="text-sm text-[#0A66C2] hover:underline truncate">LinkedIn</a>
        </div>
      )}
      {lead.contact_twitter && (
        <div className="flex items-center gap-2">
          <Twitter className="h-3.5 w-3.5 text-zinc-400" />
          <a href={`https://twitter.com/${lead.contact_twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-red-600 dark:text-red-400 hover:underline">{lead.contact_twitter}</a>
        </div>
      )}
      {lead.contact_phone && (
        <div className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 text-zinc-400" />
          <a href={`tel:${lead.contact_phone}`} className="text-sm text-red-600 dark:text-red-400 hover:underline">{lead.contact_phone}</a>
        </div>
      )}
    </div>
  );
}

function DetailsCard({ lead }: { lead: Lead }) {
  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4 space-y-2.5">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Details</h3>
      <InfoRow label="Type" value={LEAD_TYPE_LABELS[lead.type]} />
      {lead.product_name && <InfoRow label="Product" value={lead.product_name} />}
      {lead.fund_name && <InfoRow label="Fund" value={lead.fund_name} />}
      <InfoRow label="Priority" value={lead.priority} />
      {lead.source && <InfoRow label="Source" value={lead.source} />}
      <InfoRow label="Stage" value={STAGE_LABELS[lead.stage]} />
    </div>
  );
}

function EmailStatsCard({ lead }: { lead: Lead }) {
  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Email Activity</h3>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800">
          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{lead.total_emails_out}</p>
          <p className="text-[10px] text-zinc-500">Sent</p>
        </div>
        <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800">
          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{lead.total_emails_in}</p>
          <p className="text-[10px] text-zinc-500">Received</p>
        </div>
      </div>
    </div>
  );
}

function RelatedLeadsCard({ leads, domain }: { leads: RelatedLead[]; domain: string }) {
  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Users className="h-3.5 w-3.5 text-zinc-400" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Same Company ({domain})</h3>
      </div>
      {leads.map(rl => (
        <Link key={rl.id} href={`/leads/${rl.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
          <div>
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{rl.contact_name}</p>
            <p className="text-[10px] text-zinc-400">{rl.contact_email}</p>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">{STAGE_LABELS[rl.stage as PipelineStage] || rl.stage}</span>
        </Link>
      ))}
    </div>
  );
}

// --- Research Section ---
function ResearchSection({ lead }: { lead: Lead }) {
  return (
    <div className="space-y-4">
      <ResearchField label="Company Description" value={lead.company_description} />
      {lead.type === 'customer' && <ResearchField label="Attack Surface Notes" value={lead.attack_surface_notes} />}
      {lead.type === 'investor' && <ResearchField label="Investment Thesis Notes" value={lead.investment_thesis_notes} />}
      {lead.type === 'partnership' && <ResearchField label="Partnership Opportunity Notes" value={lead.investment_thesis_notes} />}
      <ResearchField label="Personal Details" value={lead.personal_details} />
      {lead.smykm_hooks?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">SMYKM Hooks</p>
          <div className="flex flex-wrap gap-2">
            {lead.smykm_hooks.map((hook, i) => (
              <span key={i} className="px-2.5 py-1 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-md text-xs">{hook}</span>
            ))}
          </div>
        </div>
      )}
      {lead.research_sources?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Research Sources</p>
          <div className="space-y-2">
            {lead.research_sources.map((source, i) => (
              <a key={i} href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-red-300 dark:hover:border-red-700 transition-colors group">
                <ExternalLink className="h-3.5 w-3.5 mt-0.5 text-zinc-400 group-hover:text-red-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">{source.title}</p>
                  <p className="text-[11px] text-zinc-500 line-clamp-1">{source.detail}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResearchField({ label, value }: { label: string; value: string | null }) {
  if (!value) return <div><p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{label}</p><p className="text-sm text-zinc-400 italic">Not filled in yet</p></div>;
  return <div><p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{label}</p><p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{value}</p></div>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between"><span className="text-xs text-zinc-500">{label}</span><span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 capitalize">{value}</span></div>;
}

// --- Inline Notes ---
function InlineNotes({ leadId, initialNotes, onSaved }: { leadId: string; initialNotes: string | null; onSaved: (notes: string) => void }) {
  const [notes, setNotes] = useState(initialNotes || '');
  const [saving, setSaving] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async (value: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: value }) });
      if (res.ok) onSaved(value);
    } catch { /* silent */ } finally { setSaving(false); }
  }, [leadId, onSaved]);

  const handleChange = (value: string) => {
    setNotes(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => save(value), 1500);
  };

  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notes</h3>
        {saving && <span className="text-[10px] text-zinc-400 animate-pulse">Saving...</span>}
      </div>
      <textarea
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => { if (timeoutRef.current) { clearTimeout(timeoutRef.current); save(notes); } }}
        placeholder="Paste LinkedIn DMs, call notes, or any context..."
        className="w-full min-h-[80px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 resize-y"
      />
    </div>
  );
}

// --- Log Interaction ---
const channelIcons: Record<string, React.ReactNode> = {
  linkedin: <Linkedin className="h-3.5 w-3.5" />, twitter: <Twitter className="h-3.5 w-3.5" />,
  phone: <Phone className="h-3.5 w-3.5" />, in_person: <MapPin className="h-3.5 w-3.5" />, other: <Hash className="h-3.5 w-3.5" />,
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
    if (!availableTypes.includes(interactionType)) setInteractionType(availableTypes[0]);
  }, [channel, availableTypes, interactionType]);

  const handleSubmit = async () => {
    if (!summary.trim() && !content.trim()) { toast.error('Add a summary or content'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/lead-interactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: leadId, channel, interaction_type: interactionType, content: content || null, summary: summary || null }) });
      if (!res.ok) throw new Error('Failed');
      toast.success('Interaction logged');
      setContent(''); setSummary(''); setOpen(false); onLogged();
    } catch { toast.error('Failed to log interaction'); } finally { setSubmitting(false); }
  };

  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full text-left">
        <Plus className={`h-3.5 w-3.5 text-red-500 transition-transform ${open ? 'rotate-45' : ''}`} />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Log Interaction</h3>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {INTERACTION_CHANNELS.map((ch) => (
              <button key={ch} onClick={() => setChannel(ch)} className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${channel === ch ? 'bg-red-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>
                {channelIcons[ch]}{CHANNEL_LABELS[ch]}
              </button>
            ))}
          </div>
          <select value={interactionType} onChange={(e) => setInteractionType(e.target.value as InteractionType)} className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300">
            {availableTypes.map((t) => <option key={t} value={t}>{INTERACTION_TYPE_LABELS[t]}</option>)}
          </select>
          <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Quick summary..." className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400" />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste DM, call notes..." className="w-full min-h-[60px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 resize-y" />
          <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50 w-full justify-center">
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {submitting ? 'Logging...' : 'Log & Analyze'}
          </button>
        </div>
      )}
    </div>
  );
}

// --- Enhanced AI Summary ---
function parseNextStep(nextStep: string): { channel: string | null; framework: string | null; text: string; tactical: string | null } {
  const channelMatch = nextStep.match(/^\[([^\]]+)\]\s*/);
  let rest = channelMatch ? nextStep.slice(channelMatch[0].length) : nextStep;
  const frameworkMatch = rest.match(/^\[([^\]]+)\]\s*/);
  rest = frameworkMatch ? rest.slice(frameworkMatch[0].length) : rest;
  const tacticalSplit = rest.split('\n\nTactical: ');
  return { channel: channelMatch?.[1] || null, framework: frameworkMatch?.[1] || null, text: tacticalSplit[0], tactical: tacticalSplit[1] || null };
}

function EnhancedAISummary({ lead }: { lead: Lead }) {
  const parsed = lead.conversation_next_step ? parseNextStep(lead.conversation_next_step) : null;
  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-red-500" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">AI Strategy</h3>
      </div>
      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{lead.conversation_summary}</p>
      {parsed && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <p className="text-xs font-semibold text-green-800 dark:text-green-300">Next Step</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {parsed.channel && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-white/60 dark:bg-zinc-800/60 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">{channelIcons[parsed.channel.toLowerCase()] || <Zap className="h-3 w-3" />}{parsed.channel}</span>}
            {parsed.framework && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-white/60 dark:bg-zinc-800/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700">{parsed.framework}</span>}
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
          <ArrowRight className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
          <p className="text-xs text-green-700 dark:text-green-400">{lead.conversation_next_step}</p>
        </div>
      )}
    </div>
  );
}

// --- Conversation Intel ---
const signalIcons: Record<string, React.ReactNode> = {
  positive: <TrendingUp className="h-3.5 w-3.5 text-green-500" />,
  negative: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
  neutral: <MessageSquare className="h-3.5 w-3.5 text-zinc-400" />,
  action_needed: <Clock className="h-3.5 w-3.5 text-amber-500" />,
  upsell_opportunity: <Sparkles className="h-3.5 w-3.5 text-purple-500" />,
};

const signalColors: Record<string, string> = {
  positive: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30',
  negative: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30',
  neutral: 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800',
  action_needed: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
  upsell_opportunity: 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30',
};

interface TimelineEntry { id: string; date: string; type: 'email' | 'interaction'; direction: 'inbound' | 'outbound'; channel: string; label: string; snippet: string; }

function buildTimeline(emails: LeadEmail[], interactions: LeadInteraction[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  for (const e of emails) entries.push({ id: e.id, date: e.sent_at || e.created_at, type: 'email', direction: e.direction, channel: 'email', label: e.direction === 'outbound' ? 'Email sent' : 'Email received', snippet: e.subject || e.body?.slice(0, 80) || '' });
  for (const ix of interactions) {
    const isOutbound = ['dm_sent', 'connection_request', 'comment', 'post_like', 'post_share', 'call', 'meeting'].includes(ix.interaction_type);
    entries.push({ id: ix.id, date: ix.occurred_at, type: 'interaction', direction: isOutbound ? 'outbound' : 'inbound', channel: ix.channel, label: `${CHANNEL_LABELS[ix.channel]} - ${INTERACTION_TYPE_LABELS[ix.interaction_type]}`, snippet: ix.summary || ix.content?.slice(0, 80) || '' });
  }
  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return entries;
}

function ConversationIntel({ lead, emails, interactions, relatedLeads }: { lead: Lead; emails: LeadEmail[]; interactions: LeadInteraction[]; relatedLeads: RelatedLead[] }) {
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingType, setMeetingType] = useState<'call' | 'meeting' | 'demo'>('meeting');
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [meetingSummary, setMeetingSummary] = useState<Record<string, unknown> | null>(null);

  const hasData = lead.conversation_summary || (lead.conversation_signals?.length ?? 0) > 0 || emails.length > 0 || interactions.length > 0;
  const timeline = buildTimeline(emails, interactions);

  const handleMeetingSummary = async () => {
    if (!meetingNotes.trim()) return;
    setMeetingLoading(true);
    try {
      const res = await fetch('/api/ai/meeting-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, content: meetingNotes, meetingType }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setMeetingSummary(data.summary);
      toast.success('Meeting summarized');
    } catch { toast.error('Failed to summarize'); } finally { setMeetingLoading(false); }
  };

  if (!hasData) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 p-8 text-center">
        <Brain className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
        <p className="text-sm font-medium text-zinc-500">No conversation data yet</p>
        <p className="text-xs text-zinc-400 mt-1">Sync Gmail or log an interaction to start.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Log Meeting */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4">
        <button onClick={() => setMeetingOpen(!meetingOpen)} className="flex items-center gap-2 w-full text-left">
          <Plus className={`h-3.5 w-3.5 text-red-500 transition-transform ${meetingOpen ? 'rotate-45' : ''}`} />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Log Meeting / Call</h3>
        </button>
        {meetingOpen && (
          <div className="mt-3 space-y-3">
            <select value={meetingType} onChange={(e) => setMeetingType(e.target.value as 'call' | 'meeting' | 'demo')} className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1.5 text-xs">
              <option value="meeting">Meeting</option>
              <option value="call">Call</option>
              <option value="demo">Demo</option>
            </select>
            <textarea value={meetingNotes} onChange={(e) => setMeetingNotes(e.target.value)} placeholder="Paste transcript or type notes..." className="w-full min-h-[100px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 resize-y" />
            <button onClick={handleMeetingSummary} disabled={meetingLoading || !meetingNotes.trim()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50 w-full justify-center">
              {meetingLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
              {meetingLoading ? 'Summarizing...' : 'Summarize with AI'}
            </button>
          </div>
        )}
        {meetingSummary && (
          <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-2">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Meeting Summary</p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">{(meetingSummary as { summary?: string }).summary}</p>
            {(meetingSummary as { action_items?: Array<{ task: string }> }).action_items?.map((item, i) => (
              <div key={i} className="flex items-start gap-1.5"><CheckCircle2 className="h-3 w-3 text-blue-500 mt-0.5" /><p className="text-xs text-zinc-600 dark:text-zinc-400">{item.task}</p></div>
            ))}
          </div>
        )}
      </div>

      {/* Signals */}
      {lead.conversation_signals && lead.conversation_signals.length > 0 && (
        <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Signals</h3>
          <div className="space-y-2">
            {lead.conversation_signals.map((signal: ConversationSignal, i: number) => (
              <div key={i} className={`flex items-start gap-2.5 p-3 rounded-lg border ${signalColors[signal.type] || signalColors.neutral}`}>
                <div className="mt-0.5">{signalIcons[signal.type] || signalIcons.neutral}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-800 dark:text-zinc-200">{signal.signal}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Source: {signal.source}{signal.detected_at && ` / ${new Date(signal.detected_at).toLocaleDateString()}`}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Activity Timeline</h3>
          <div className="space-y-0">
            {timeline.map((entry, i) => (
              <div key={entry.id} className="flex gap-3 relative">
                {i < timeline.length - 1 && <div className="absolute left-[11px] top-6 bottom-0 w-px bg-zinc-200 dark:bg-zinc-700" />}
                <div className={`mt-1.5 h-[9px] w-[9px] rounded-full shrink-0 ring-2 ring-white dark:ring-zinc-900 ${
                  entry.channel === 'email' ? entry.direction === 'outbound' ? 'bg-red-500' : 'bg-blue-500'
                  : entry.channel === 'linkedin' ? 'bg-[#0A66C2]' : entry.channel === 'phone' ? 'bg-green-500' : 'bg-zinc-400'
                }`} />
                <div className="pb-4 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">{entry.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${entry.direction === 'outbound' ? 'bg-red-50 dark:bg-red-950/30 text-red-600' : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600'}`}>
                      {entry.direction === 'outbound' ? 'You' : 'Them'}
                    </span>
                  </div>
                  {entry.snippet && <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{entry.snippet}</p>}
                  <p className="text-[10px] text-zinc-400 mt-0.5">{new Date(entry.date).toLocaleDateString()} {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
