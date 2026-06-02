'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { differenceInDays, formatDistanceToNow } from 'date-fns';
import {
  LEAD_TYPE_COLORS,
  LEAD_TYPE_SHORT,
  PIPELINE_STAGES,
  STAGE_DESCRIPTIONS,
  STAGE_LABELS,
  type BattleCard,
  type Lead,
  type PipelineStage,
} from '@/types/leads';
import { AlertCircle, ClipboardCheck, GripVertical, Loader2, Sparkles, Swords, Zap } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';

function parseNextStep(nextStep: string): { channel: string | null; framework: string | null; text: string; tactical: string | null } {
  const channelMatch = nextStep.match(/^\[([^\]]+)\]\s*/);
  let rest = channelMatch ? nextStep.slice(channelMatch[0].length) : nextStep;
  const frameworkMatch = rest.match(/^\[([^\]]+)\]\s*/);
  rest = frameworkMatch ? rest.slice(frameworkMatch[0].length) : rest;
  const tacticalSplit = rest.split('\n\nTactical: ');
  return { channel: channelMatch?.[1] || null, framework: frameworkMatch?.[1] || null, text: tacticalSplit[0], tactical: tacticalSplit[1] || null };
}

interface LeadPipelineBoardProps {
  leads: Lead[];
  onLeadUpdate?: (leadId: string, newStage: PipelineStage) => void;
  onRefresh?: () => void;
}

const stageColors: Record<PipelineStage, string> = {
  researched: 'border-t-zinc-400',
  email_drafted: 'border-t-blue-500',
  email_sent: 'border-t-amber-500',
  replied: 'border-t-green-500',
  meeting_booked: 'border-t-purple-500',
  meeting_held: 'border-t-indigo-500',
  follow_up: 'border-t-orange-500',
  closed_won: 'border-t-emerald-500',
  closed_lost: 'border-t-red-500',
  no_response: 'border-t-zinc-300',
};

export function groupLeadsByStage(leads: Lead[]) {
  const grouped = PIPELINE_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = [];
      return acc;
    },
    {} as Record<PipelineStage, Lead[]>
  );

  for (const lead of leads) {
    grouped[lead.stage].push(lead);
  }

  return grouped;
}

export default function LeadPipelineBoard({ leads, onLeadUpdate, onRefresh }: LeadPipelineBoardProps) {
  const router = useRouter();
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<PipelineStage | null>(null);
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});

  const leadsByStage = useMemo(() => groupLeadsByStage(leads), [leads]);

  const handleDragStart = (leadId: string) => {
    setDraggedLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault();
    setDropTarget(stage);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = async (stage: PipelineStage) => {
    if (!draggedLeadId) return;

    try {
      const res = await fetch(`/api/leads/${draggedLeadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) throw new Error('Failed to update');
      onLeadUpdate?.(draggedLeadId, stage);
      toast.success(`Moved to ${STAGE_LABELS[stage]}`);
    } catch {
      toast.error('Failed to move lead');
    }

    setDraggedLeadId(null);
    setDropTarget(null);
  };

  const setLeadProcessing = (leadId: string, processing: boolean) => {
    setIsProcessing(prev => ({ ...prev, [leadId]: processing }));
  };

  const handleMagicDraft = async (leadId: string, contactName: string) => {
    setLeadProcessing(leadId, true);
    const promise = (async () => {
      const res = await fetch('/api/ai/draft-next-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      if (!res.ok) throw new Error('Magic drafting failed');
      onLeadUpdate?.(leadId, 'email_drafted');
      onRefresh?.();
    })();

    toast.promise(promise, {
      loading: `Magic drafting for ${contactName}...`,
      success: `Draft ready for ${contactName}`,
      error: 'Drafting failed',
    });

    promise.finally(() => setLeadProcessing(leadId, false));
  };

  const handlePrep = async (leadId: string, contactName: string) => {
    setLeadProcessing(leadId, true);
    const promise = (async () => {
      const res = await fetch('/api/ai/battle-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      if (!res.ok) throw new Error('Prep failed');
      onRefresh?.();
    })();

    toast.promise(promise, {
      loading: `Prepping for meeting with ${contactName}...`,
      success: `Battle card ready for ${contactName}`,
      error: 'Prep failed',
    });

    promise.finally(() => setLeadProcessing(leadId, false));
  };

  const handleResearch = async (lead: Lead) => {
    setLeadProcessing(lead.id, true);
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
      onRefresh?.();
    })();

    toast.promise(promise, {
      loading: `Researching ${lead.contact_name}...`,
      success: `Research complete for ${lead.contact_name}`,
      error: 'Research failed',
    });

    promise.finally(() => setLeadProcessing(lead.id, false));
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
      {PIPELINE_STAGES.map((stage) => (
        <div
          key={stage}
          className={`shrink-0 w-[240px] flex flex-col rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 ${
            dropTarget === stage ? 'ring-2 ring-red-500/40' : ''
          }`}
          onDragOver={(e) => handleDragOver(e, stage)}
          onDragLeave={handleDragLeave}
          onDrop={() => handleDrop(stage)}
        >
          <div
            title={STAGE_DESCRIPTIONS[stage]}
            className={`px-3 py-2.5 border-t-2 ${stageColors[stage]} rounded-t-xl cursor-help`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {STAGE_LABELS[stage]}
              </span>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 px-1.5 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 tabular-nums">
                {leadsByStage[stage].length}
              </span>
            </div>
          </div>

          <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(60vh-60px)]">
            {leadsByStage[stage].map((lead) => {
              const daysSinceLastContact = lead.last_contacted_at ? differenceInDays(new Date(), new Date(lead.last_contacted_at)) : null;
              const isStale = (lead.stage === 'email_sent' || lead.stage === 'follow_up') && daysSinceLastContact !== null && daysSinceLastContact >= 5;
              const strategyText = lead.conversation_next_step
                ? parseNextStep(lead.conversation_next_step).text
                : (lead.battle_card as BattleCard | null)?.our_angle;
              const needsResearch = lead.stage === 'researched' && !lead.smykm_hooks?.length;
              const showAction = needsResearch ||
                ['researched', 'replied', 'follow_up', 'no_response', 'meeting_booked', 'email_drafted'].includes(lead.stage) ||
                (lead.stage === 'email_sent' && daysSinceLastContact !== null && daysSinceLastContact >= 3);
              const isLeadProcessing = !!isProcessing[lead.id];

              return (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => handleDragStart(lead.id)}
                  className={`group rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-all ${
                    draggedLeadId === lead.id ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 text-zinc-300 dark:text-zinc-600 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/leads/${lead.id}`} className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate hover:text-red-600 dark:hover:text-red-400">
                            {lead.contact_name}
                          </p>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                            {lead.company_name}
                          </p>
                        </Link>
                        {isStale && (
                          <div className="flex items-center gap-1 text-[9px] font-bold text-red-500 shrink-0 bg-red-50 dark:bg-red-900/20 px-1 rounded border border-red-100 dark:border-red-900/30">
                            <AlertCircle className="h-2.5 w-2.5" />
                            STALE
                          </div>
                        )}
                      </div>

                      {strategyText && (
                        <div className="mt-2 p-1.5 rounded bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50 group/strategy relative">
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-1">
                              <Sparkles className="h-2.5 w-2.5 text-red-500" />
                              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">Strategy</span>
                            </div>
                            <CopyButton
                              value={strategyText}
                              label="Strategy"
                              className="opacity-0 group-hover/strategy:opacity-100 focus:opacity-100 -mr-1 -mt-1"
                            />
                          </div>
                          <p className="text-[10px] text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                            {strategyText}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            role="img"
                            tabIndex={0}
                            aria-label={`${lead.priority} priority`}
                            title={`${lead.priority.charAt(0).toUpperCase() + lead.priority.slice(1)} Priority`}
                            className={`inline-block h-1.5 w-1.5 rounded-full cursor-help outline-none focus:ring-2 focus:ring-offset-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 ${
                              lead.priority === 'high' ? 'bg-red-500 focus:ring-red-500' : lead.priority === 'medium' ? 'bg-amber-500 focus:ring-amber-500' : 'bg-zinc-400'
                            }`}
                          />
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${LEAD_TYPE_COLORS[lead.type].bg} ${LEAD_TYPE_COLORS[lead.type].text}`}>
                            {LEAD_TYPE_SHORT[lead.type]}
                          </span>
                        </div>

                        {showAction && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (needsResearch) handleResearch(lead);
                              else if (lead.stage === 'meeting_booked') handlePrep(lead.id, lead.contact_name);
                              else if (lead.stage === 'email_drafted') router.push(`/leads/${lead.id}?tab=emails`);
                              else handleMagicDraft(lead.id, lead.contact_name);
                            }}
                            disabled={isLeadProcessing}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50 border border-red-100 dark:border-red-900/30"
                          >
                            {isLeadProcessing ? (
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            ) : needsResearch ? (
                              <Sparkles className="h-2.5 w-2.5" />
                            ) : lead.stage === 'meeting_booked' ? (
                              <Swords className="h-2.5 w-2.5" />
                            ) : lead.stage === 'email_drafted' ? (
                              <ClipboardCheck className="h-2.5 w-2.5" />
                            ) : (
                              <Zap className="h-2.5 w-2.5" />
                            )}
                            <span className="text-[9px] font-bold uppercase tracking-tight">
                              {isLeadProcessing ? '...' : needsResearch ? 'Research' : lead.stage === 'meeting_booked' ? 'Prep' : lead.stage === 'email_drafted' ? 'Review' : 'Magic'}
                            </span>
                          </button>
                        )}
                      </div>

                      {lead.last_contacted_at && (
                        <p className="text-[9px] text-zinc-400 mt-1.5 text-right">
                          {formatDistanceToNow(new Date(lead.last_contacted_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {!leadsByStage[stage].length && (
              <div className="text-center py-4">
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">No leads</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
