'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Zap,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import type { SalesAction } from '@/lib/dashboard/sales-actions';

interface SalesActionPlanProps {
  actions: SalesAction[];
  onRefresh?: () => void;
}

export default function SalesActionPlan({ actions, onRefresh }: SalesActionPlanProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const handleMagicDraft = async (e: React.MouseEvent, leadId: string, leadName: string) => {
    e.preventDefault();
    e.stopPropagation();

    setIsProcessing(leadId);
    const promise = (async () => {
      const res = await fetch('/api/ai/draft-next-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      if (!res.ok) throw new Error('Magic drafting failed');
      onRefresh?.();
    })();

    toast.promise(promise, {
      loading: `Magic drafting for ${leadName}...`,
      success: `Draft ready for ${leadName}`,
      error: 'Drafting failed',
    });

    promise.finally(() => setIsProcessing(null));
  };

  if (actions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 p-8 text-center bg-white dark:bg-zinc-900/50">
        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Action plan clear</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">You&apos;re all caught up on critical sales actions.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-red-500" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Sales Action Plan</h2>
        </div>
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Prioritized by AI</span>
      </div>

      <div className="space-y-3">
        {actions.map((action) => {
          const isDraftable = ['reply', 'follow_up', 'prospecting'].includes(action.category);

          return (
            <div
              key={action.id}
              className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 hover:border-red-200 dark:hover:border-red-900/40 transition-all"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                    action.priority === 'critical' ? 'bg-red-100 dark:bg-red-900/40 text-red-600' :
                    action.priority === 'high' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600' :
                    'bg-blue-100 dark:bg-blue-900/40 text-blue-600'
                  }`}>
                    {action.priority}
                  </span>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{action.title}</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">{action.reason}</p>
                <div className="flex items-start gap-2 bg-white dark:bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <Zap className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed italic">{action.recommendedAction}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isDraftable && (
                  <button
                    onClick={(e) => handleMagicDraft(e, action.leadId, action.leadName)}
                    disabled={isProcessing !== null}
                    title="Magic Draft"
                    className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg transition-colors border border-amber-100 dark:border-amber-800"
                  >
                    {isProcessing === action.leadId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5 fill-current" />
                    )}
                    Draft
                  </button>
                )}
                <Link
                  href={action.ctaHref}
                  className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors shadow-sm shadow-red-600/20"
                >
                  {action.ctaLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-center">
        <Link href="/follow-ups" className="text-[11px] font-semibold text-zinc-500 hover:text-red-600 transition-colors flex items-center gap-1">
          View full action queue <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
