'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { PIPELINE_STAGES, STAGE_LABELS, LEAD_TYPE_SHORT, LEAD_TYPE_COLORS, type Lead, type PipelineStage } from '@/types/leads';
import { GripVertical, Zap, Swords, Sparkles, Loader2 } from 'lucide-react';

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

export default function LeadPipelineBoard({ leads, onLeadUpdate, onRefresh }: LeadPipelineBoardProps) {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<PipelineStage | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const leadsByStage = useMemo(() => PIPELINE_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = leads.filter((l) => l.stage === stage);
      return acc;
    },
    {} as Record<PipelineStage, Lead[]>
  ), [leads]);

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

  const handleMagicDraft = async (lead: Lead) => {
    setIsProcessing(lead.id);
    const promise = (async () => {
      const res = await fetch('/api/ai/draft-next-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      });
      if (!res.ok) throw new Error('Magic drafting failed');
      onRefresh?.();
    })();

    toast.promise(promise, {
      loading: `Magic drafting for ${lead.contact_name}...`,
      success: `Draft ready for ${lead.contact_name}`,
      error: 'Drafting failed',
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
      onRefresh?.();
    })();

    toast.promise(promise, {
      loading: `Prepping for meeting with ${lead.contact_name}...`,
      success: `Battle card ready for ${lead.contact_name}`,
      error: 'Prep failed',
    });

    promise.finally(() => setIsProcessing(null));
  };

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
      onRefresh?.();
    })();

    toast.promise(promise, {
      loading: `Researching ${lead.contact_name}...`,
      success: `Research complete for ${lead.contact_name}`,
      error: 'Research failed',
    });

    promise.finally(() => setIsProcessing(null));
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
          <div className={`px-3 py-2.5 border-t-2 ${stageColors[stage]} rounded-t-xl`}>
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
            {leadsByStage[stage].map((lead) => (
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
                    <div className="flex items-start justify-between gap-1">
                      <Link href={`/leads/${lead.id}`} className="min-w-0">
                        <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate hover:text-red-600 dark:hover:text-red-400">
                          {lead.contact_name}
                        </p>
                      </Link>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        {lead.stage === 'researched' && !lead.smykm_hooks?.length && (
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleResearch(lead); }}
                            disabled={!!isProcessing}
                            title="Run Research"
                            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 hover:text-red-500 transition-colors"
                          >
                            {isProcessing === lead.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          </button>
                        )}
                        {['researched', 'email_sent', 'replied', 'follow_up', 'no_response'].includes(lead.stage) && (
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMagicDraft(lead); }}
                            disabled={!!isProcessing}
                            title="Magic Draft"
                            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 hover:text-amber-500 transition-colors"
                          >
                            {isProcessing === lead.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                          </button>
                        )}
                        {lead.stage === 'meeting_booked' && !lead.battle_card && (
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePrep(lead); }}
                            disabled={!!isProcessing}
                            title="Prep Meeting"
                            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 hover:text-blue-500 transition-colors"
                          >
                            {isProcessing === lead.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Swords className="h-3 w-3" />}
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      {lead.company_name}
                    </p>
                    {lead.conversation_next_step && (
                      <p className="text-[10px] text-zinc-400 mt-1 line-clamp-1 italic">
                        {lead.conversation_next_step.replace(/^\[[^\]]+\]\s*/g, '')}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                        lead.priority === 'high' ? 'bg-red-500' : lead.priority === 'medium' ? 'bg-amber-500' : 'bg-zinc-400'
                      }`} title={`Priority: ${lead.priority}`} />
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${LEAD_TYPE_COLORS[lead.type].bg} ${LEAD_TYPE_COLORS[lead.type].text}`}>
                        {LEAD_TYPE_SHORT[lead.type]}
                      </span>
                      {lead.last_contacted_at && (
                        <span className="text-[10px] text-zinc-400">
                          {formatDistanceToNow(new Date(lead.last_contacted_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

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
