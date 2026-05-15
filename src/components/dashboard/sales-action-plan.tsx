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

const PRIORITY_CONFIG: Record<SalesActionPriority, { label: string; color: string; dot: string; bg: string; border: string }> = {
  critical: {
    label: 'Critical',
    color: 'text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-200 dark:border-red-800',
  },
  high: {
    label: 'High',
    color: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
  },
  medium: {
    label: 'Medium',
    color: 'text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800',
  },
};

const CATEGORY_CONFIG: Record<SalesActionCategory, { icon: React.ElementType; color: string }> = {
  reply: { icon: MessageSquare, color: 'text-emerald-500' },
  follow_up: { icon: Send, color: 'text-amber-500' },
  meeting: { icon: CalendarCheck, color: 'text-purple-500' },
  prospecting: { icon: Target, color: 'text-blue-500' },
};

export default function SalesActionPlan({ actions, onRefresh }: SalesActionPlanProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const handleMagicDraft = async (action: SalesAction) => {
    setIsProcessing(action.id);
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

    promise.finally(() => setIsProcessing(null));
  };

  if (actions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-zinc-500">No immediate actions recommended.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recommended Actions</h2>
        </div>
        <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Prioritized by Score</span>
      </div>

      <div className="space-y-2">
        {actions.map((action) => {
          const prio = PRIORITY_CONFIG[action.priority];
          const cat = CATEGORY_CONFIG[action.category];
          const Icon = cat.icon;
          const canMagicDraft = action.category === 'follow_up' || action.category === 'prospecting';

          return (
            <div
              key={action.id}
              className={`rounded-xl border ${prio.border} ${prio.bg} p-4 transition-all hover:shadow-sm`}
            >
              <div className="flex items-start gap-4">
                <div className={`mt-1 h-8 w-8 rounded-lg bg-white/60 dark:bg-black/20 flex items-center justify-center shrink-0`}>
                  <Icon className={`h-4 w-4 ${cat.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Link
                      href={action.ctaHref}
                      className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:text-red-600 dark:hover:text-red-400 truncate"
                    >
                      {action.title}
                    </Link>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${prio.border} ${prio.bg} ${prio.color}`}>
                      {prio.label}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                    {action.reason}
                  </p>

                  <div className="bg-white/40 dark:bg-black/10 rounded-lg p-2.5 mb-3">
                    <p className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed italic">
                      &quot;{action.recommendedAction}&quot;
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${prio.dot}`} />
                      <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-tight">
                        {action.category.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {canMagicDraft && (
                        <button
                          onClick={() => handleMagicDraft(action)}
                          disabled={isProcessing === action.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 bg-white/60 dark:bg-zinc-800/60 hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-200 dark:border-zinc-700 disabled:opacity-50"
                        >
                          {isProcessing === action.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Zap className="h-3.5 w-3.5 text-amber-500" />
                          )}
                          Magic Draft
                        </button>
                      )}
                      <Link
                        href={action.ctaHref}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors shadow-sm shadow-red-600/20"
                      >
                        {action.ctaLabel}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
