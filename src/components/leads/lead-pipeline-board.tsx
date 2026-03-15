'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { PIPELINE_STAGES, STAGE_LABELS, type Lead, type PipelineStage } from '@/types/leads';
import { GripVertical } from 'lucide-react';

interface LeadPipelineBoardProps {
  leads: Lead[];
  onLeadUpdate?: (leadId: string, newStage: PipelineStage) => void;
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

export default function LeadPipelineBoard({ leads, onLeadUpdate }: LeadPipelineBoardProps) {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<PipelineStage | null>(null);

  const leadsByStage = PIPELINE_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = leads.filter((l) => l.stage === stage);
      return acc;
    },
    {} as Record<PipelineStage, Lead[]>
  );

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
                    <Link href={`/leads/${lead.id}`}>
                      <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate hover:text-red-600 dark:hover:text-red-400">
                        {lead.contact_name}
                      </p>
                    </Link>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      {lead.company_name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                        lead.priority === 'high' ? 'bg-red-500' : lead.priority === 'medium' ? 'bg-amber-500' : 'bg-zinc-400'
                      }`} />
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        lead.type === 'customer'
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300'
                          : 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300'
                      }`}>
                        {lead.type === 'customer' ? 'Cust' : 'Inv'}
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
