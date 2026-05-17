'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Send,
  CalendarCheck,
  Target,
  Zap,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SalesAction, SalesActionPriority, SalesActionCategory } from '@/lib/dashboard/sales-actions';

interface SalesActionPlanProps {
  actions: SalesAction[];
  onRefresh?: () => void;
}

const PRIORITY_CONFIG: Record<SalesActionPriority, { label: string; color: string; bg: string; border: string; dot: string }> = {
  critical: {
    label: 'Critical',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-200 dark:border-red-800',
    dot: 'bg-red-500',
  },
  high: {
    label: 'High',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
  medium: {
    label: 'Medium',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
  },
};

const CATEGORY_CONFIG: Record<SalesActionCategory, { icon: React.ReactNode; label: string }> = {
  reply: { icon: <MessageSquare className="h-4 w-4" />, label: 'Reply' },
  follow_up: { icon: <Send className="h-4 w-4" />, label: 'Follow-up' },
  meeting: { icon: <CalendarCheck className="h-4 w-4" />, label: 'Meeting' },
  prospecting: { icon: <Target className="h-4 w-4" />, label: 'Prospecting' },
};

export function SalesActionPlan({ actions, onRefresh }: SalesActionPlanProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleMagicDraft = async (action: SalesAction) => {
    setProcessingId(action.id);
    const promise = (async () => {
      const res = await fetch('/api/ai/draft-next-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: action.leadId }),
      });
      if (!res.ok) throw new Error('Magic drafting failed');
      onRefresh?.();
    })();

    toast.promise(promise, {
      loading: `Magic drafting for ${action.leadName}...`,
      success: `Draft ready for ${action.leadName}`,
      error: 'Drafting failed',
    });

    try {
      await promise;
    } finally {
      setProcessingId(null);
    }
  };

  if (!actions || actions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
        <div className="h-12 w-12 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center mb-4">
          <Zap className="h-6 w-6 text-zinc-400" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No actions needed</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[240px]">
          Your pipeline is in good shape. New actions will appear here as leads move or age.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-red-500" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Sales Action Plan
          </h2>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 uppercase tracking-tight">
          {actions.length} prioritized
        </span>
      </div>

      <div className="space-y-3">
        {actions.map((action) => {
          const prio = PRIORITY_CONFIG[action.priority];
          const cat = CATEGORY_CONFIG[action.category];
          const isProcessing = processingId === action.id;
          const showMagicDraft = ['reply', 'follow_up', 'prospecting'].includes(action.category);

          return (
            <div
              key={action.id}
              className={`rounded-xl border ${prio.border} ${prio.bg} p-4 transition-all hover:shadow-sm`}
            >
              <div className="flex items-start gap-4">
                <div className={`mt-1 h-8 w-8 rounded-lg bg-white/60 dark:bg-black/20 flex items-center justify-center shrink-0 ${prio.color}`}>
                  {cat.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${prio.dot}`} />
                    <Link
                      href={`/leads/${action.leadId}`}
                      className="text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:text-red-600 dark:hover:text-red-400 truncate"
                    >
                      {action.leadName}
                    </Link>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">·</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{action.companyName}</span>
                  </div>

                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                    {action.title}
                  </h3>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-2 leading-relaxed">
                    {action.reason}
                  </p>

                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3 text-red-500 shrink-0" />
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {action.recommendedAction}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${prio.border} ${prio.color} uppercase tracking-wider`}>
                    {prio.label}
                  </span>

                  {showMagicDraft ? (
                    <button
                      onClick={() => handleMagicDraft(action)}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors shadow-sm shadow-red-600/20 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Zap className="h-3 w-3" />
                      )}
                      {isProcessing ? 'Drafting...' : 'Magic Draft'}
                    </button>
                  ) : (
                    <Link
                      href={action.ctaHref}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg transition-colors shadow-sm"
                    >
                      {action.ctaLabel}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
