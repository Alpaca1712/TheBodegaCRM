'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell, Clock, Send, Loader2, MessageSquare, Twitter, Mail,
  AlertTriangle, CheckCircle2, Filter, Linkedin, ArrowRight,
  User, Building2, ChevronDown, Zap, Sparkles, Swords,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { STAGE_LABELS, LEAD_TYPE_LABELS, type PipelineStage } from '@/types/leads';
import type { Lead, LeadEmail } from '@/types/leads';
import {
  ACTION_LABELS,
  FOLLOW_UP_STAGES,
  computeFollowUp,
  filterFollowUps,
  getFollowUpCounts,
  sortFollowUps,
  type FilterType,
  type FollowUpItem,
} from '@/lib/follow-ups/follow-up-engine';
import { FollowUpSheet } from './follow-up-sheet';

interface FollowUpSuggestionsProps {
  compact?: boolean;
  typeFilter?: string;
}

const URGENCY_CONFIG = {
  overdue: { label: 'Overdue', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40', border: 'border-red-200 dark:border-red-800', dot: 'bg-red-500' },
  due_today: { label: 'Due', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' },
  upcoming: { label: 'Soon', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500' },
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="h-3.5 w-3.5" />,
  linkedin: <Linkedin className="h-3.5 w-3.5" />,
  twitter: <Twitter className="h-3.5 w-3.5" />,
};

export default function FollowUpSuggestions({ compact = false, typeFilter }: FollowUpSuggestionsProps) {
  const [items, setItems] = useState<FollowUpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FollowUpItem | null>(null);

  const loadFollowUps = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .in('stage', FOLLOW_UP_STAGES);

      if (typeFilter && typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      const { data: leads } = await query.order('last_contacted_at', { ascending: true });

      if (!leads?.length) { setLoading(false); return; }

      const leadIds = leads.map(l => l.id);
      const { data: emails } = await supabase
        .from('lead_emails')
        .select('*')
        .in('lead_id', leadIds)
        .order('created_at', { ascending: false });

      const emailsByLead = new Map<string, LeadEmail[]>();
      for (const email of emails || []) {
        const existing = emailsByLead.get(email.lead_id) || [];
        existing.push(email as LeadEmail);
        emailsByLead.set(email.lead_id, existing);
      }

      const computed: FollowUpItem[] = [];
      for (const lead of leads) {
        const item = computeFollowUp(lead as Lead, emailsByLead.get(lead.id) || []);
        if (item) computed.push(item);
      }

      setItems(sortFollowUps(computed));
    } catch (err) {
      console.error('Failed to load follow-ups:', err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    loadFollowUps();
  }, [loadFollowUps]);

  const handleResearch = async (lead: Lead) => {
    setIsProcessing(lead.id);
    const promise = (async () => {
      const res = await fetch('/api/ai/research-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          type: lead.type,
          contact_name: lead.contact_name,
          company_name: lead.company_name,
          linkedin_url: lead.contact_linkedin,
        }),
      });
      if (!res.ok) throw new Error('Research failed');
      await loadFollowUps();
    })();

    toast.promise(promise, {
      loading: `Researching ${lead.contact_name}...`,
      success: `Research complete for ${lead.contact_name}`,
      error: 'Research failed',
    });

    promise.finally(() => setIsProcessing(null));
  };

  const handleMagicDraft = async (lead: Lead) => {
    setIsProcessing(lead.id);
    const promise = (async () => {
      const res = await fetch('/api/ai/draft-next-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      });
      if (!res.ok) throw new Error('Magic Draft failed');
      await loadFollowUps();
    })();

    toast.promise(promise, {
      loading: `Drafting next step for ${lead.contact_name}...`,
      success: `Draft ready for ${lead.contact_name}`,
      error: 'Magic Draft failed',
    });

    promise.finally(() => setIsProcessing(null));
  };

  const handlePrep = async (lead: Lead) => {
    setIsProcessing(lead.id);
    const promise = (async () => {
      const res = await fetch('/api/ai/battle-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      });
      if (!res.ok) throw new Error('Prep failed');
      await loadFollowUps();
    })();

    toast.promise(promise, {
      loading: `Prepping for meeting with ${lead.contact_name}...`,
      success: `Battle card ready for ${lead.contact_name}`,
      error: 'Prep failed',
    });

    promise.finally(() => setIsProcessing(null));
  };

  const filtered = filterFollowUps(items, filter);

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-zinc-400" /></div>;
  }

  if (!items.length) {
    return compact ? null : (
      <div className="text-center py-12">
        <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">All caught up!</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">No leads need follow-up right now.</p>
      </div>
    );
  }

  // Compact mode for dashboard widget
  if (compact) {
    const topItems = items.slice(0, 5);
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="h-4 w-4 text-red-500" />
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {items.length} follow-up{items.length !== 1 ? 's' : ''}
          </span>
        </div>
        {topItems.map(item => (
          <CompactCard
            key={item.lead.id}
            item={item}
            onGenerate={() => setSelectedItem(item)}
          />
        ))}
        {items.length > 5 && (
          <Link href="/follow-ups" className="block text-center text-xs text-red-600 dark:text-red-400 hover:text-red-500 py-2 font-medium">
            View all {items.length} follow-ups →
          </Link>
        )}
      </div>
    );
  }

  // Full page mode
  const counts = getFollowUpCounts(items);

  const filters: Array<{ id: FilterType; label: string; count: number; color?: string }> = [
    { id: 'all', label: 'All', count: items.length },
    { id: 'overdue', label: 'Overdue', count: counts.overdue, color: 'text-red-600' },
    { id: 'urgent', label: 'Urgent', count: counts.urgent, color: 'text-blue-600' },
    { id: 'new_leads', label: 'New Leads', count: counts.newLeads, color: 'text-emerald-600' },
    { id: 'cold_sequence', label: 'Cold Sequence', count: counts.coldSequence },
  ];

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total" value={items.length} icon={<Bell className="h-4 w-4" />} color="zinc" />
        <StatCard label="Overdue" value={counts.overdue} icon={<AlertTriangle className="h-4 w-4" />} color="red" />
        <StatCard label="Urgent" value={counts.urgent} icon={<MessageSquare className="h-4 w-4" />} color="blue" />
        <StatCard label="New Leads" value={counts.newLeads} icon={<Zap className="h-4 w-4" />} color="emerald" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors lg:hidden">
          <Filter className="h-3 w-3" />
          Filter
          <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
        <div className={`flex gap-1.5 flex-wrap ${showFilters ? '' : 'hidden lg:flex'}`}>
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                filter === f.id
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {f.label}
              <span className={`ml-1 tabular-nums ${filter === f.id ? 'text-red-200' : 'text-zinc-400'}`}>{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Items grouped by urgency */}
      {filtered.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-zinc-500">No follow-ups match this filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <FollowUpCard
              key={item.lead.id}
              item={item}
              onGenerate={() => setSelectedItem(item)}
              onResearch={() => handleResearch(item.lead)}
              onPrep={() => handlePrep(item.lead)}
              onMagicDraft={() => handleMagicDraft(item.lead)}
              isProcessing={isProcessing === item.lead.id}
            />
          ))}
        </div>
      )}

      <FollowUpSheet
        lead={selectedItem?.lead || null}
        initialFollowUpType={selectedItem?.suggestedType || null}
        isOpen={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
        onEmailSaved={loadFollowUps}
      />
    </div>
  );
}

type StatCardColor = 'zinc' | 'red' | 'blue' | 'amber' | 'emerald';

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: StatCardColor }) {
  const colors: Record<StatCardColor, { bg: string; iconColor: string; text: string }> = {
    zinc: { bg: 'bg-zinc-50 dark:bg-zinc-800/50', iconColor: 'text-zinc-400', text: 'text-zinc-900 dark:text-zinc-100' },
    red: { bg: 'bg-red-50 dark:bg-red-950/30', iconColor: 'text-red-500', text: 'text-red-700 dark:text-red-300' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-500', text: 'text-blue-700 dark:text-blue-300' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-500', text: 'text-amber-700 dark:text-amber-300' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' },
  };
  const c = colors[color];
  return (
    <div className={`rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 ${c.bg} p-3`}>
      <div className={`${c.iconColor} mb-1`}>{icon}</div>
      <p className={`text-xl font-bold tabular-nums ${c.text}`}>{value}</p>
      <p className="text-[10px] text-zinc-500 font-medium">{label}</p>
    </div>
  );
}

function parseNextStep(nextStep: string): { channel: string | null; framework: string | null; text: string; tactical: string | null } {
  const channelMatch = nextStep.match(/^\[([^\]]+)\]\s*/);
  let rest = channelMatch ? nextStep.slice(channelMatch[0].length) : nextStep;
  const frameworkMatch = rest.match(/^\[([^\]]+)\]\s*/);
  rest = frameworkMatch ? rest.slice(frameworkMatch[0].length) : rest;
  const tacticalSplit = rest.split('\n\nTactical: ');
  return { channel: channelMatch?.[1] || null, framework: frameworkMatch?.[1] || null, text: tacticalSplit[0], tactical: tacticalSplit[1] || null };
}

function parseActionBadges(action: string): { badges: string[]; text: string } {
  const badges: string[] = [];
  let text = action;
  const badgeRegex = /^\[([^\]]+)\]\s*/;
  let match;
  while ((match = text.match(badgeRegex))) {
    badges.push(match[1]);
    text = text.slice(match[0].length);
  }
  return { badges, text };
}

function FollowUpCard({
  item,
  onGenerate,
  onResearch,
  onPrep,
  onMagicDraft,
  isProcessing
}: {
  item: FollowUpItem;
  onGenerate: () => void;
  onResearch: () => void;
  onPrep: () => void;
  onMagicDraft: () => void;
  isProcessing: boolean;
}) {

  const urg = URGENCY_CONFIG[item.urgency];
  const action = ACTION_LABELS[item.suggestedType];
  const initials = item.lead.contact_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const isReply = ['reply_needed', 'post_meeting'].includes(item.suggestedType);
  const isInitial = item.suggestedType === 'initial_outreach';
  const canMagicDraft = ['initial_outreach', 'follow_up_1', 'follow_up_2', 'follow_up_3', 'break_up', 'reply_needed'].includes(item.suggestedType);

  // Prioritize AI Strategy, then Our Angle (for cold leads), then suggested action
  const battleCard = item.lead.battle_card as Record<string, unknown> | null;
  const ourAngle = (battleCard?.our_angle as string) || null;
  const rawAction = item.lead.conversation_next_step || ourAngle || item.suggestedAction;
  const { badges, text: actionText } = parseActionBadges(rawAction);
  const aiStrategy = item.lead.conversation_next_step ? parseNextStep(item.lead.conversation_next_step) : null;

  return (
    <div className={`rounded-xl border ${urg.border} ${urg.bg} p-4 transition-all hover:shadow-sm`}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="shrink-0">
          {item.lead.contact_photo_url ? (
            <img src={item.lead.contact_photo_url} alt="" className="h-10 w-10 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div className="h-10 w-10 rounded-full bg-white/60 dark:bg-black/20 flex items-center justify-center text-xs font-bold text-zinc-500">{initials}</div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Link href={`/leads/${item.lead.id}`} className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:text-red-600 dark:hover:text-red-400 truncate">
              {item.lead.contact_name}
            </Link>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${urg.bg} ${urg.color} border ${urg.border}`}>
              {urg.label}
            </span>
            {item.lead.icp_score != null && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                item.lead.icp_score >= 80 ? 'bg-red-600 text-white shadow-sm shadow-red-600/20' :
                item.lead.icp_score >= 70 ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' :
                item.lead.icp_score >= 50 ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' :
                'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
              }`}>
                {item.lead.icp_score >= 80 ? 'High ICP: ' : 'ICP: '}{item.lead.icp_score}
              </span>
            )}
            {item.lead.risk_score != null && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                item.lead.risk_score > 50 ? 'bg-red-100 dark:bg-red-900/40 text-red-600' :
                item.lead.risk_score > 15 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600' :
                'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600'
              }`}>
                Risk: {item.lead.risk_score}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-zinc-500 mb-2">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {item.lead.company_name}
            </span>
            <span>·</span>
            <span>{STAGE_LABELS[item.lead.stage as PipelineStage]}</span>
            <span>·</span>
            <span>{LEAD_TYPE_LABELS[item.lead.type]}</span>
          </div>

          {/* Sequence progress */}
          <div className="flex items-center gap-1.5 mb-2">
            {isInitial ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 uppercase tracking-tight">
                New Lead
              </span>
            ) : (
              [1, 2, 3, 4].map(step => {
                const stepTypes = ['follow_up_1', 'follow_up_2', 'follow_up_3', 'break_up'];
                const currentStepIdx = stepTypes.indexOf(item.suggestedType);
                const isCompleted = step <= item.outboundCount && !isReply;
                const isCurrent = step - 1 === currentStepIdx && !isReply;
                return (
                  <div key={step} className="flex items-center gap-1.5">
                    <div className={`h-1.5 w-6 rounded-full ${
                      isCompleted ? 'bg-emerald-400' : isCurrent ? `${urg.dot} animate-pulse` : 'bg-zinc-200 dark:bg-zinc-700'
                    }`} />
                  </div>
                );
              })
            )}
            <span className="text-[10px] text-zinc-400 ml-1">
              {isReply || isInitial ? item.sequenceDay : `${item.outboundCount} sent · ${item.sequenceDay}`}
            </span>
          </div>

          {/* Action description */}
          {aiStrategy ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <ArrowRight className="h-3 w-3 text-red-500" />
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">AI Strategy</p>
                {aiStrategy.framework && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-600 font-medium border border-purple-100 dark:border-purple-800">
                    {aiStrategy.framework}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">{aiStrategy.text}</p>
              {aiStrategy.tactical && (
                <p className="text-[10px] text-red-600 dark:text-red-400 italic">Tactical: {aiStrategy.tactical}</p>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-1 mb-1">
                {badges.map((b, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-white/40 dark:bg-black/20 text-[9px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50">
                    {b}
                  </span>
                ))}
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">{actionText}</p>
            </>
          )}

          {/* Email stats */}
          <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-400">
            <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{item.outboundCount} sent</span>
            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{item.inboundCount} replies</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{item.daysSinceLastContact}d ago</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-white/60 dark:bg-black/20 font-medium text-zinc-600 dark:text-zinc-400">
            {CHANNEL_ICONS[item.suggestedChannel]}
            <span>{action.short}</span>
          </div>

          <div className="flex items-center gap-2">
            {canMagicDraft && (
              <button
                onClick={onMagicDraft}
                disabled={isProcessing}
                title="Magic Draft (Background)"
                className="p-1.5 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 bg-white/60 dark:bg-black/20 rounded-lg transition-colors border border-zinc-200 dark:border-zinc-800 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              </button>
            )}

            <button
              onClick={() => {
                if (item.suggestedType === 'run_research') onResearch();
                else if (item.suggestedType === 'prep_meeting') onPrep();
                else onGenerate();
              }}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors shadow-sm shadow-red-600/20 disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : item.suggestedType === 'run_research' ? (
                <Sparkles className="h-3 w-3" />
              ) : item.suggestedType === 'prep_meeting' ? (
                <Swords className="h-3 w-3" />
              ) : item.suggestedType === 'review_draft' ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Send className="h-3 w-3" />
              )}

              {isProcessing ? (
                'Processing...'
              ) : item.suggestedType === 'run_research' ? (
                'Research'
              ) : item.suggestedType === 'prep_meeting' ? (
                'Prep'
              ) : item.suggestedType === 'review_draft' ? (
                'Review'
              ) : (
                'Generate'
              )}
              {!isProcessing && <ArrowRight className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompactCard({ item, onGenerate }: { item: FollowUpItem; onGenerate: () => void }) {
  const urg = URGENCY_CONFIG[item.urgency];
  const action = ACTION_LABELS[item.suggestedType];
  return (
    <button
      onClick={onGenerate}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border ${urg.border} ${urg.bg} transition-all hover:shadow-sm text-left`}
    >
      <div className={`h-2 w-2 rounded-full shrink-0 ${urg.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{item.lead.contact_name}</p>
        <p className="text-[10px] text-zinc-500 truncate">{action.short} · {item.daysSinceLastContact}d</p>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
        {CHANNEL_ICONS[item.suggestedChannel]}
        <ArrowRight className="h-3 w-3" />
      </div>
    </button>
  );
}
