'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Zap,
  MessageSquare,
  CalendarCheck,
  Mail,
  Target,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SalesAction } from '@/lib/dashboard/sales-actions';

interface SalesActionPlanProps {
  actions: SalesAction[];
  onRefresh: () => Promise<void>;
}

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: 'text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800' },
  high: { label: 'High', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
  medium: { label: 'Medium', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' },
};

const CATEGORY_ICONS = {
  reply: MessageSquare,
  follow_up: Mail,
  meeting: CalendarCheck,
  prospecting: Target,
};

export default function SalesActionPlan({ actions = [], onRefresh }: SalesActionPlanProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const handleMagicDraft = async (action: SalesAction) => {
    setIsProcessing(action.id);
    const promise = (async () => {
      const res = await fetch('/api/ai/draft-next-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: action.leadId }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Magic drafting failed' }));
        throw new Error(error.error);
      }
      await onRefresh();
    })();

    toast.promise(promise, {
      loading: `Magic drafting for ${action.leadName}...`,
      success: `Draft ready for ${action.leadName}`,
      error: (err) => err instanceof Error ? err.message : 'Drafting failed',
    });

    promise.finally(() => setIsProcessing(null));
  };

  if (!actions.length) {
    return (
      <div className="text-center py-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 mx-auto mb-3">
          <Zap className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Clean slate!</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">No high-priority actions right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Zap className="h-4 w-4 text-red-500 fill-red-500/20" />
          Sales Action Plan
        </h2>
        <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Top {actions.length} Priorities</span>
      </div>
      <div className="space-y-2">
        {actions.map((action) => {
          const Icon = CATEGORY_ICONS[action.category] || AlertCircle;
          const priority = PRIORITY_CONFIG[action.priority] || PRIORITY_CONFIG.medium;
          const canMagicDraft = ['follow_up', 'prospecting'].includes(action.category);

          return (
            <div
              key={action.id}
              className="group relative flex items-start gap-3 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all hover:shadow-sm"
            >
              <div className={`mt-0.5 p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shrink-0`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 max-w-full">
                  <Link href={`/leads/${action.leadId}`} className="inline-block max-w-full text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:text-red-600 dark:hover:text-red-400 truncate">
                    {action.title}
                  </Link>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${priority.color}`}>
                    {priority.label}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2">{action.reason}</p>
                <div className="bg-zinc-50 dark:bg-zinc-800/80 rounded-lg px-2.5 py-2 border border-zinc-100 dark:border-zinc-700/50">
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                    {action.recommendedAction}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0 self-stretch justify-between">
                <div className="flex items-center gap-1.5">
                  {canMagicDraft && (
                    <button
                      onClick={() => handleMagicDraft(action)}
                      disabled={isProcessing !== null}
                      title="Magic Draft"
                      className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                    >
                      {isProcessing === action.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Zap className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                  <Link
                    href={action.ctaHref}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-lg transition-colors shadow-sm"
                  >
                    {action.ctaLabel}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
