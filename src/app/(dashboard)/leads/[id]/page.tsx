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
  RefreshCw,
  Globe,
  Building2,
  Swords,
  Target,
  ChevronDown,
  ChevronRight,
  Network,
  User,
} from 'lucide-react';
import {
  STAGE_LABELS, STAGE_NEXT_ACTIONS, LEAD_TYPE_LABELS, LEAD_TYPE_COLORS,
  CHANNEL_LABELS, INTERACTION_TYPE_LABELS, CHANNEL_INTERACTION_TYPES,
  INTERACTION_CHANNELS,
  type Lead, type LeadEmail, type LeadInteraction, type PipelineStage, type InteractionChannel, type InteractionType,
  PIPELINE_STAGES, type ConversationSignal, type OrgChartMember,
} from '@/types/leads';
import EmailGenerator from '@/components/email/email-generator';
import EmailThread from '@/components/email/email-thread';

interface RelatedLead {
  id: string;
  contact_name: string;
  contact_email: string | null;
  contact_title: string | null;
  contact_photo_url: string | null;
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

type TabId = 'overview' | 'emails' | 'conversation' | 'company' | 'memory';

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
    urlTab === 'emails' || urlTab === 'conversation' || urlTab === 'company' || urlTab === 'memory' ? urlTab : 'overview'
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null);
  const [coachingLoading, setCoachingLoading] = useState(false);
  const [coaching, setCoaching] = useState<Record<string, unknown> | null>(null);
  const [battleCardLoading, setBattleCardLoading] = useState(false);
  const [battleCard, setBattleCard] = useState<Record<string, unknown> | null>(null);
  const [orgChartLoading, setOrgChartLoading] = useState(false);

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
      if (data.lead?.battle_card) setBattleCard(data.lead.battle_card);
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
    } catch {
      toast.error('Failed to load memories');
    }
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
    } catch {
      toast.error('Failed to refresh lead data');
    }
  };

  const generateBattleCard = async () => {
    setBattleCardLoading(true);
    try {
      const res = await fetch('/api/ai/battle-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `Failed (${res.status})`);
      }
      const data = await res.json();
      setBattleCard(data);
      setActiveTab('overview');
      await fetchLead();
      toast.success('Battle card generated');
    } catch (err) {
      console.error('Battle card error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to generate battle card');
    } finally { setBattleCardLoading(false); }
  };

  const enrichOrgChart = async () => {
    setOrgChartLoading(true);
    try {
      const res = await fetch('/api/ai/enrich-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: id }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      await fetchLead();
      toast.success(`Found ${data.org_chart?.length || 0} team members`);
    } catch { toast.error('Failed to enrich company'); } finally { setOrgChartLoading(false); }
  };

  const handleSyncLead = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/gmail/sync-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: id }),
      });
      if (!res.ok) {
        const err = await res.json();
        if (err.code === 'TOKEN_EXPIRED') {
          toast.error('Gmail connection expired. Please reconnect in Settings > Email.');
          setIsSyncing(false);
          return;
        }
        throw new Error(err.error || 'Sync failed');
      }
      const data = await res.json();
      const parts: string[] = [];
      if (data.newEmails > 0) parts.push(`${data.newEmails} new emails`);
      if (data.stageChanged) parts.push(`stage: ${data.previousStage} \u2192 ${data.newStage}`);
      if (data.memoriesExtracted > 0) parts.push(`${data.memoriesExtracted} memories`);
      toast.success(parts.length > 0 ? `Synced: ${parts.join(', ')}` : 'Synced (no new data)');
      await fetchLead();
      await fetchMemories();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
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

  const orgChartCount = lead.org_chart?.length || 0;
  const tabs: Array<{ id: TabId; label: string; count?: number }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'emails', label: 'Emails', count: emails.length },
    { id: 'conversation', label: 'Conversation' },
    { id: 'company', label: 'Company', count: orgChartCount + relatedLeads.length },
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
              {lead.icp_score != null && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${
                  lead.icp_score >= 70 ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' :
                  lead.icp_score >= 50 ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' :
                  'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                }`}>
                  ICP: {lead.icp_score}
                </span>
              )}
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
            onClick={generateBattleCard}
            disabled={battleCardLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {battleCardLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Swords className="h-3.5 w-3.5" />}
            Battle Card
          </button>
          <button
            onClick={handleSyncLead}
            disabled={isSyncing || !lead.contact_email}
            title={lead.contact_email ? 'Sync Gmail for this lead' : 'No email address on this lead'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Sync
          </button>
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
              {battleCard && <BattleCardPanel card={battleCard} />}
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
            <ConversationIntel lead={lead} emails={emails} interactions={interactions} onRefresh={fetchLead} />
          )}

          {activeTab === 'company' && (
            <div className="space-y-5">
              <CompanyTab
                lead={lead}
                relatedLeads={relatedLeads}
                onEnrich={enrichOrgChart}
                isEnriching={orgChartLoading}
              />
              {battleCard && <BattleCardPanel card={battleCard} />}
            </div>
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
  const initials = lead.contact_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4 space-y-3">
      {/* Profile header with photo */}
      <div className="flex items-center gap-3">
        {lead.contact_photo_url ? (
          <img
            src={lead.contact_photo_url}
            alt={lead.contact_name}
            className="h-12 w-12 rounded-full object-cover ring-2 ring-zinc-100 dark:ring-zinc-700"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
          />
        ) : null}
        <div className={`h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-sm font-bold text-red-600 dark:text-red-400 ring-2 ring-zinc-100 dark:ring-zinc-700 ${lead.contact_photo_url ? 'hidden' : ''}`}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{lead.contact_name}</p>
          {lead.contact_title && <p className="text-[11px] text-zinc-500 truncate">{lead.contact_title}</p>}
        </div>
      </div>

      {/* Company row */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
        {lead.company_logo_url ? (
          <img src={lead.company_logo_url} alt="" className="h-5 w-5 rounded object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <Building2 className="h-4 w-4 text-zinc-400" />
        )}
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{lead.company_name}</span>
        {lead.company_website && (
          <a href={lead.company_website.startsWith('http') ? lead.company_website : `https://${lead.company_website}`} target="_blank" rel="noopener noreferrer" className="ml-auto">
            <Globe className="h-3.5 w-3.5 text-zinc-400 hover:text-red-500 transition-colors" />
          </a>
        )}
      </div>

      {/* Contact links */}
      <div className="space-y-2">
        {lead.contact_email && (
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <a href={`mailto:${lead.contact_email}`} className="text-xs text-red-600 dark:text-red-400 hover:underline truncate">{lead.contact_email}</a>
          </div>
        )}
        {lead.contact_linkedin && (
          <div className="flex items-center gap-2">
            <Linkedin className="h-3.5 w-3.5 text-[#0A66C2] shrink-0" />
            <a href={lead.contact_linkedin.startsWith('http') ? lead.contact_linkedin : `https://${lead.contact_linkedin}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#0A66C2] hover:underline truncate">LinkedIn Profile</a>
          </div>
        )}
        {lead.contact_twitter && (
          <div className="flex items-center gap-2">
            <Twitter className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <a href={`https://twitter.com/${lead.contact_twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-red-600 dark:text-red-400 hover:underline">{lead.contact_twitter}</a>
          </div>
        )}
        {lead.contact_phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <a href={`tel:${lead.contact_phone}`} className="text-xs text-red-600 dark:text-red-400 hover:underline">{lead.contact_phone}</a>
          </div>
        )}
      </div>
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
      {leads.map(rl => {
        const initials = rl.contact_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        return (
          <Link key={rl.id} href={`/leads/${rl.id}`} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            {rl.contact_photo_url ? (
              <img src={rl.contact_photo_url} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className="h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-500 shrink-0">{initials}</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{rl.contact_name}</p>
              <p className="text-[10px] text-zinc-400 truncate">{rl.contact_title || rl.contact_email}</p>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shrink-0">{STAGE_LABELS[rl.stage as PipelineStage] || rl.stage}</span>
          </Link>
        );
      })}
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
    } catch {
      toast.error('Failed to save notes');
    } finally { setSaving(false); }
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
  const [lastResult, setLastResult] = useState<{ analysis: Record<string, unknown> | null } | null>(null);
  const availableTypes = CHANNEL_INTERACTION_TYPES[channel];

  useEffect(() => {
    if (!availableTypes.includes(interactionType)) setInteractionType(availableTypes[0]);
  }, [channel, availableTypes, interactionType]);

  const handleSubmit = async () => {
    if (!summary.trim() && !content.trim()) { toast.error('Add a summary or content'); return; }
    setSubmitting(true);
    setLastResult(null);
    try {
      const res = await fetch('/api/lead-interactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: leadId, channel, interaction_type: interactionType, content: content || null, summary: summary || null }) });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setLastResult({ analysis: data.analysis });
      toast.success('Interaction logged and analyzed');
      setContent(''); setSummary('');
      onLogged();
    } catch { toast.error('Failed to log interaction'); } finally { setSubmitting(false); }
  };

  const analysisData = lastResult?.analysis as {
    conversation_summary?: string; next_step?: string; warmth?: string; framework_tag?: string;
  } | null;

  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4">
      <button onClick={() => { setOpen(!open); if (open) setLastResult(null); }} className="flex items-center gap-2 w-full text-left">
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
            {submitting ? 'Analyzing...' : 'Log & Analyze'}
          </button>
        </div>
      )}

      {analysisData && (
        <div className="mt-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 space-y-2">
          <div className="flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 text-green-600" />
            <span className="text-[11px] font-semibold text-green-700 dark:text-green-300">AI Analysis Complete</span>
            {analysisData.warmth && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ml-auto ${
                analysisData.warmth === 'hot' ? 'bg-red-100 dark:bg-red-900/40 text-red-600' :
                analysisData.warmth === 'warm' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600' :
                'bg-blue-100 dark:bg-blue-900/40 text-blue-600'
              }`}>{analysisData.warmth}</span>
            )}
          </div>
          {analysisData.conversation_summary && <p className="text-xs text-zinc-700 dark:text-zinc-300">{analysisData.conversation_summary}</p>}
          {analysisData.next_step && (
            <div className="flex items-start gap-1.5 pt-1 border-t border-green-200/50 dark:border-green-700/50">
              <ArrowRight className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-green-700 dark:text-green-400">{analysisData.next_step}</p>
            </div>
          )}
          {analysisData.framework_tag && (
            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-600 font-medium">{analysisData.framework_tag}</span>
          )}
          <p className="text-[10px] text-green-600 dark:text-green-500">View full details in the Conversation tab timeline.</p>
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

interface TimelineEntry {
  id: string;
  date: string;
  type: 'email' | 'interaction';
  direction: 'inbound' | 'outbound';
  channel: string;
  label: string;
  snippet: string;
  fullContent: string | null;
  subject: string | null;
  aiSummary: Record<string, unknown> | null;
  interactionType: string | null;
}

function decodeEntities(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function buildTimeline(emails: LeadEmail[], interactions: LeadInteraction[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  for (const e of emails) {
    const subj = decodeEntities(e.subject);
    const body = decodeEntities(e.body);
    entries.push({
      id: e.id, date: e.sent_at || e.created_at, type: 'email', direction: e.direction,
      channel: 'email', label: e.direction === 'outbound' ? 'Email sent' : 'Email received',
      snippet: subj || body?.slice(0, 120) || '', fullContent: body || null, subject: subj || null,
      aiSummary: null, interactionType: null,
    });
  }
  for (const ix of interactions) {
    const isOutbound = ['dm_sent', 'connection_request', 'comment', 'post_like', 'post_share', 'call', 'meeting'].includes(ix.interaction_type);
    entries.push({
      id: ix.id, date: ix.occurred_at, type: 'interaction', direction: isOutbound ? 'outbound' : 'inbound',
      channel: ix.channel, label: `${CHANNEL_LABELS[ix.channel]} - ${INTERACTION_TYPE_LABELS[ix.interaction_type]}`,
      snippet: ix.summary || ix.content?.slice(0, 120) || '', fullContent: ix.content, subject: ix.summary,
      aiSummary: ix.ai_summary || null, interactionType: ix.interaction_type,
    });
  }
  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return entries;
}

function TimelineEntryCard({ entry, isLast }: { entry: TimelineEntry; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const hasExpandableContent = entry.fullContent && entry.fullContent.length > 120;
  const aiData = entry.aiSummary as {
    summary?: string; action_items?: Array<{ owner: string; task: string; deadline: string | null }>;
    key_quotes?: string[]; objections_raised?: string[]; sentiment?: string;
    next_steps?: string[]; deal_signals?: Array<{ type: string; signal: string }>;
  } | null;

  const dotColor = entry.channel === 'email'
    ? entry.direction === 'outbound' ? 'bg-red-500' : 'bg-blue-500'
    : entry.channel === 'linkedin' ? 'bg-[#0A66C2]'
    : entry.channel === 'twitter' ? 'bg-zinc-600'
    : entry.channel === 'phone' ? 'bg-green-500' : 'bg-zinc-400';

  const channelIcon = entry.channel === 'email' ? <Mail className="h-3 w-3" />
    : entry.channel === 'linkedin' ? <Linkedin className="h-3 w-3" />
    : entry.channel === 'twitter' ? <Twitter className="h-3 w-3" />
    : entry.channel === 'phone' ? <Phone className="h-3 w-3" />
    : <Hash className="h-3 w-3" />;

  return (
    <div className="flex gap-3 relative">
      {!isLast && <div className="absolute left-[13px] top-8 bottom-0 w-px bg-zinc-200 dark:bg-zinc-700" />}
      <div className={`mt-2 h-[11px] w-[11px] rounded-full shrink-0 ring-2 ring-white dark:ring-zinc-900 ${dotColor}`} />
      <div className={`pb-4 min-w-0 flex-1 ${hasExpandableContent || aiData ? 'cursor-pointer' : ''}`} onClick={() => (hasExpandableContent || aiData) && setExpanded(!expanded)}>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-zinc-500">{channelIcon}</div>
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{entry.label}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${entry.direction === 'outbound' ? 'bg-red-50 dark:bg-red-950/30 text-red-600' : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600'}`}>
            {entry.direction === 'outbound' ? 'You' : 'Them'}
          </span>
          <span className="text-[10px] text-zinc-400 ml-auto tabular-nums">
            {new Date(entry.date).toLocaleDateString()} {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {(hasExpandableContent || aiData) && (
            <ChevronDown className={`h-3 w-3 text-zinc-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          )}
        </div>

        {entry.subject && entry.type === 'email' && (
          <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mt-1">{entry.subject}</p>
        )}

        {entry.subject && entry.type === 'interaction' && (
          <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-1 leading-relaxed">{entry.subject}</p>
        )}

        {!expanded && !entry.subject && entry.snippet && (
          <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">{entry.snippet}</p>
        )}

        {expanded && (
          <div className="mt-2 space-y-3">
            {entry.fullContent && (
              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/80">
                <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
                  {entry.fullContent}
                </p>
              </div>
            )}

            {aiData && (
              <div className="p-3 rounded-lg bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/60 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Brain className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">AI Analysis</span>
                  {aiData.sentiment && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ml-auto ${
                      aiData.sentiment.includes('positive') ? 'bg-green-100 dark:bg-green-900/40 text-green-600' :
                      aiData.sentiment.includes('negative') ? 'bg-red-100 dark:bg-red-900/40 text-red-600' :
                      'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                    }`}>{aiData.sentiment.replace('_', ' ')}</span>
                  )}
                </div>

                {aiData.summary && <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">{aiData.summary}</p>}

                {aiData.action_items && aiData.action_items.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mb-1">Action Items</p>
                    {aiData.action_items.map((item, i) => (
                      <div key={i} className="flex items-start gap-1.5 mb-1">
                        <CheckCircle2 className="h-3 w-3 text-blue-400 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                          <span className={`font-medium ${item.owner === 'us' ? 'text-red-600' : item.owner === 'them' ? 'text-blue-600' : 'text-purple-600'}`}>[{item.owner}]</span> {item.task}
                          {item.deadline && <span className="text-zinc-400"> (by {item.deadline})</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {aiData.key_quotes && aiData.key_quotes.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mb-1">Key Quotes</p>
                    {aiData.key_quotes.map((q, i) => (
                      <p key={i} className="text-[11px] text-zinc-600 dark:text-zinc-400 italic border-l-2 border-blue-300 dark:border-blue-700 pl-2 mb-1">&ldquo;{q}&rdquo;</p>
                    ))}
                  </div>
                )}

                {aiData.objections_raised && aiData.objections_raised.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-red-600 dark:text-red-400 mb-1">Objections</p>
                    {aiData.objections_raised.map((o, i) => (
                      <div key={i} className="flex items-start gap-1.5 mb-1">
                        <AlertCircle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{o}</p>
                      </div>
                    ))}
                  </div>
                )}

                {aiData.next_steps && aiData.next_steps.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-green-600 dark:text-green-400 mb-1">Next Steps</p>
                    {aiData.next_steps.map((s, i) => (
                      <div key={i} className="flex items-start gap-1.5 mb-1">
                        <ArrowRight className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{s}</p>
                      </div>
                    ))}
                  </div>
                )}

                {aiData.deal_signals && aiData.deal_signals.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 mb-1">Deal Signals</p>
                    {aiData.deal_signals.map((ds, i) => (
                      <div key={i} className="flex items-start gap-1.5 mb-1">
                        {ds.type === 'positive' ? <TrendingUp className="h-3 w-3 text-green-400 mt-0.5 shrink-0" /> :
                         ds.type === 'negative' ? <AlertCircle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" /> :
                         <MessageSquare className="h-3 w-3 text-zinc-400 mt-0.5 shrink-0" />}
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{ds.signal}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationIntel({ lead, emails, interactions, onRefresh }: { lead: Lead; emails: LeadEmail[]; interactions: LeadInteraction[]; onRefresh: () => void }) {
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingType, setMeetingType] = useState<'call' | 'meeting' | 'demo'>('meeting');
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'email' | 'interaction'>('all');

  const hasData = lead.conversation_summary || (lead.conversation_signals?.length ?? 0) > 0 || emails.length > 0 || interactions.length > 0;
  const timeline = buildTimeline(emails, interactions);
  const filteredTimeline = timeline.filter(e => timelineFilter === 'all' || e.type === timelineFilter);

  const emailCount = timeline.filter(e => e.type === 'email').length;
  const interactionCount = timeline.filter(e => e.type === 'interaction').length;

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
      toast.success('Meeting summarized and logged');
      setMeetingNotes('');
      setMeetingOpen(false);
      onRefresh();
    } catch { toast.error('Failed to summarize'); } finally { setMeetingLoading(false); }
  };

  if (!hasData) {
    return (
      <div className="space-y-4">
        <LogMeetingCard
          open={meetingOpen} setOpen={setMeetingOpen}
          notes={meetingNotes} setNotes={setMeetingNotes}
          type={meetingType} setType={setMeetingType}
          loading={meetingLoading} onSubmit={handleMeetingSummary}
        />
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 p-8 text-center">
          <Brain className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-500">No conversation data yet</p>
          <p className="text-xs text-zinc-400 mt-1">Sync Gmail or log an interaction to start.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Log Meeting */}
      <LogMeetingCard
        open={meetingOpen} setOpen={setMeetingOpen}
        notes={meetingNotes} setNotes={setMeetingNotes}
        type={meetingType} setType={setMeetingType}
        loading={meetingLoading} onSubmit={handleMeetingSummary}
      />

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

      {/* Activity Timeline */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Activity Timeline</h3>
          <div className="flex items-center gap-1">
            {[
              { id: 'all' as const, label: 'All', count: timeline.length },
              { id: 'email' as const, label: 'Emails', count: emailCount },
              { id: 'interaction' as const, label: 'Interactions', count: interactionCount },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setTimelineFilter(f.id)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  timelineFilter === f.id
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {f.label} <span className={timelineFilter === f.id ? 'text-red-200' : 'text-zinc-400'}>{f.count}</span>
              </button>
            ))}
          </div>
        </div>

        {filteredTimeline.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center py-4">No {timelineFilter === 'all' ? 'activity' : timelineFilter + 's'} yet.</p>
        ) : (
          <div className="space-y-0">
            {filteredTimeline.map((entry, i) => (
              <TimelineEntryCard key={entry.id} entry={entry} isLast={i === filteredTimeline.length - 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LogMeetingCard({ open, setOpen, notes, setNotes, type, setType, loading, onSubmit }: {
  open: boolean; setOpen: (v: boolean) => void;
  notes: string; setNotes: (v: string) => void;
  type: 'call' | 'meeting' | 'demo'; setType: (v: 'call' | 'meeting' | 'demo') => void;
  loading: boolean; onSubmit: () => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full text-left">
        <Plus className={`h-3.5 w-3.5 text-red-500 transition-transform ${open ? 'rotate-45' : ''}`} />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Log Meeting / Call</h3>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <select value={type} onChange={(e) => setType(e.target.value as 'call' | 'meeting' | 'demo')} className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1.5 text-xs">
            <option value="meeting">Meeting</option>
            <option value="call">Call</option>
            <option value="demo">Demo</option>
          </select>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paste transcript or type notes..." className="w-full min-h-[100px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 resize-y" />
          <button onClick={onSubmit} disabled={loading || !notes.trim()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50 w-full justify-center">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
            {loading ? 'Summarizing...' : 'Summarize with AI'}
          </button>
        </div>
      )}
    </div>
  );
}

// --- Company Tab ---
function CompanyTab({ lead, relatedLeads, onEnrich, isEnriching }: { lead: Lead; relatedLeads: RelatedLead[]; onEnrich: () => void; isEnriching: boolean }) {
  const orgChart = (lead.org_chart || []) as OrgChartMember[];
  const hasOrgChart = orgChart.length > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {lead.company_logo_url ? (
              <img src={lead.company_logo_url} alt="" className="h-10 w-10 rounded-lg object-contain bg-white p-1 border border-zinc-200 dark:border-zinc-700" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-zinc-400" />
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{lead.company_name}</h3>
              {lead.company_website && (
                <a href={lead.company_website.startsWith('http') ? lead.company_website : `https://${lead.company_website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1">
                  <Globe className="h-3 w-3" />{lead.company_website}
                </a>
              )}
            </div>
          </div>
          <button
            onClick={onEnrich}
            disabled={isEnriching}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {isEnriching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Network className="h-3.5 w-3.5" />}
            {hasOrgChart ? 'Refresh Team' : 'Discover Team'}
          </button>
        </div>
        {lead.company_description && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{lead.company_description}</p>
        )}
        {lead.icp_score != null && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-xs font-medium text-zinc-500">ICP Fit</span>
            </div>
            <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  lead.icp_score >= 70 ? 'bg-emerald-500' : lead.icp_score >= 50 ? 'bg-blue-500' : lead.icp_score >= 30 ? 'bg-amber-500' : 'bg-zinc-400'
                }`}
                style={{ width: `${lead.icp_score}%` }}
              />
            </div>
            <span className="text-xs font-bold tabular-nums text-zinc-700 dark:text-zinc-300">{lead.icp_score}/100</span>
          </div>
        )}
        {lead.icp_reasons && lead.icp_reasons.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {lead.icp_reasons.map((r, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">{r}</span>
            ))}
          </div>
        )}
      </div>

      {hasOrgChart && <OrgChartTree members={orgChart} companyName={lead.company_name} />}

      {relatedLeads.length > 0 && (
        <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">People in Your CRM</h3>
          </div>
          <div className="space-y-2">
            {relatedLeads.map(rl => {
              const initials = rl.contact_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <Link key={rl.id} href={`/leads/${rl.id}`} className="flex items-center gap-3 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:border-red-200 dark:hover:border-red-800 transition-colors">
                  {rl.contact_photo_url ? (
                    <img src={rl.contact_photo_url} alt="" className="h-9 w-9 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-500">{initials}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{rl.contact_name}</p>
                    <p className="text-[11px] text-zinc-500">{rl.contact_title || rl.contact_email}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    rl.stage === 'closed_won' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' :
                    rl.stage === 'replied' || rl.stage === 'meeting_booked' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' :
                    'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                  }`}>{STAGE_LABELS[rl.stage as PipelineStage] || rl.stage}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {!hasOrgChart && relatedLeads.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 p-8 text-center">
          <Network className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-500">No team data yet</p>
          <p className="text-xs text-zinc-400 mt-1">Click &quot;Discover Team&quot; to find team members and build an org chart.</p>
        </div>
      )}
    </div>
  );
}

// --- Org Chart Tree ---
function OrgChartTree({ members, companyName }: { members: OrgChartMember[]; companyName: string }) {
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set(['Leadership']));

  const departments = new Map<string, OrgChartMember[]>();
  for (const m of members) {
    const dept = m.department || 'Other';
    if (!departments.has(dept)) departments.set(dept, []);
    departments.get(dept)!.push(m);
  }

  const sortedDepts = [...departments.entries()].sort(([a], [b]) => {
    if (a === 'Leadership') return -1;
    if (b === 'Leadership') return 1;
    return a.localeCompare(b);
  });

  const toggleDept = (dept: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept); else next.add(dept);
      return next;
    });
  };

  const deptColors: Record<string, string> = {
    Leadership: 'bg-red-100 dark:bg-red-900/40 text-red-600',
    Engineering: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600',
    Product: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600',
    Sales: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600',
    Marketing: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600',
    Operations: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600',
    Finance: 'bg-green-100 dark:bg-green-900/40 text-green-600',
    Legal: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600',
    Other: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500',
  };

  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-red-500" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Organization Map</h3>
        </div>
        <span className="text-[10px] text-zinc-400 tabular-nums">{members.length} people at {companyName}</span>
      </div>

      <div className="space-y-1">
        {sortedDepts.map(([dept, people]) => {
          const isExpanded = expandedDepts.has(dept);
          return (
            <div key={dept}>
              <button
                onClick={() => toggleDept(dept)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-zinc-400" /> : <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />}
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${deptColors[dept] || deptColors.Other}`}>{dept}</span>
                <span className="text-[10px] text-zinc-400 tabular-nums">{people.length}</span>
              </button>
              {isExpanded && (
                <div className="ml-6 space-y-0.5 mt-0.5">
                  {people.map((person, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors group">
                      {person.photo_url ? (
                        <img src={person.photo_url} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center shrink-0">
                          <User className="h-3 w-3 text-zinc-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{person.name}</p>
                          {person.lead_id && (
                            <Link href={`/leads/${person.lead_id}`} className="text-[9px] px-1 py-0.5 rounded bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-medium hover:bg-red-100 dark:hover:bg-red-950/50">
                              In CRM
                            </Link>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate">{person.title}</p>
                      </div>
                      {person.linkedin_url && (
                        <a href={person.linkedin_url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Linkedin className="h-3.5 w-3.5 text-[#0A66C2]" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Battle Card Panel ---
function BattleCardPanel({ card, defaultExpanded = true }: { card: Record<string, unknown>; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const bc = card as {
    company_overview?: string; their_product?: string;
    their_strengths?: string[]; their_weaknesses?: string[];
    competitive_landscape?: string[]; our_angle?: string;
    objection_handlers?: Array<{ objection: string; response: string }>;
    discovery_questions?: string[]; trigger_events?: string[];
    icp_score?: number; icp_reasons?: string[]; pricing_intel?: string; tech_stack?: string[];
    decision_makers?: Array<{ role: string; concerns: string; pitch_angle: string }>;
  };

  const hasContent = bc.our_angle || bc.their_product || bc.company_overview;
  if (!hasContent) return null;

  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-red-500" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Battle Card</h3>
          {bc.icp_score != null && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums ${
              bc.icp_score >= 70 ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' :
              bc.icp_score >= 50 ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' :
              bc.icp_score >= 30 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600' :
              'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
            }`}>ICP: {bc.icp_score}/100</span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${expanded ? '' : '-rotate-90'}`} />
      </button>

      {bc.our_angle && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <p className="text-[10px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Our Angle</p>
          <p className="text-sm text-zinc-800 dark:text-zinc-200">{bc.our_angle}</p>
        </div>
      )}

      {expanded && (
        <div className="space-y-4">
          {bc.company_overview && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Company Overview</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{bc.company_overview}</p>
            </div>
          )}

          {bc.their_product && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Their Product</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{bc.their_product}</p>
            </div>
          )}

          {bc.tech_stack && bc.tech_stack.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Tech Stack</p>
              <div className="flex flex-wrap gap-1.5">
                {bc.tech_stack.map((t, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">{t}</span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {bc.their_strengths && bc.their_strengths.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">Their Strengths</p>
                <ul className="space-y-1">
                  {bc.their_strengths.map((s, i) => <li key={i} className="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-start gap-1"><span className="text-emerald-500 mt-0.5">+</span>{s}</li>)}
                </ul>
              </div>
            )}
            {bc.their_weaknesses && bc.their_weaknesses.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wider mb-1">Their Weaknesses</p>
                <ul className="space-y-1">
                  {bc.their_weaknesses.map((w, i) => <li key={i} className="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-start gap-1"><span className="text-red-500 mt-0.5">-</span>{w}</li>)}
                </ul>
              </div>
            )}
          </div>

          {bc.competitive_landscape && bc.competitive_landscape.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Competitive Landscape</p>
              <ul className="space-y-1">
                {bc.competitive_landscape.map((c, i) => <li key={i} className="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-start gap-1.5"><span className="text-zinc-400 mt-0.5 shrink-0">&bull;</span>{c}</li>)}
              </ul>
            </div>
          )}

          {bc.objection_handlers && bc.objection_handlers.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Objection Handlers</p>
              <div className="space-y-2">
                {bc.objection_handlers.map((oh, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 space-y-1">
                    <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">&quot;{oh.objection}&quot;</p>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{oh.response}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bc.discovery_questions && bc.discovery_questions.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Discovery Questions</p>
              <ul className="space-y-1">
                {bc.discovery_questions.map((q, i) => <li key={i} className="text-[11px] text-zinc-600 dark:text-zinc-400">{i + 1}. {q}</li>)}
              </ul>
            </div>
          )}

          {bc.trigger_events && bc.trigger_events.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Trigger Events</p>
              <div className="flex flex-wrap gap-1.5">
                {bc.trigger_events.map((t, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">{t}</span>
                ))}
              </div>
            </div>
          )}

          {bc.decision_makers && bc.decision_makers.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Decision Makers</p>
              <div className="space-y-2">
                {bc.decision_makers.map((dm, i) => (
                  <div key={i} className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{dm.role}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Concerns: {dm.concerns}</p>
                    <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">Pitch: {dm.pitch_angle}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bc.icp_reasons && bc.icp_reasons.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">ICP Fit Reasons</p>
              <ul className="space-y-1">
                {bc.icp_reasons.map((r, i) => <li key={i} className="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-start gap-1.5"><Target className="h-3 w-3 text-zinc-400 mt-0.5 shrink-0" />{r}</li>)}
              </ul>
            </div>
          )}

          {bc.pricing_intel && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Pricing Intel</p>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{bc.pricing_intel}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
