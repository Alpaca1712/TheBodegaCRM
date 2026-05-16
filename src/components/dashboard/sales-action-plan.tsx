'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Send,
  CalendarCheck,
  Target,
  Zap,
  ArrowRight,
  Sparkles,
  Swords,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SalesAction } from '@/lib/dashboard/sales-actions';

interface SalesActionPlanProps {
  actions: SalesAction[];
  onRefresh?: () => void;
  typeFilter?: string;
}

const PRIORITY_CONFIG = {
  critical: {
    label: 'Critical',
    dot: 'bg-red-500',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-100 dark:border-red-900/50',
    text: 'text-red-700 dark:text-red-300',
  },
  high: {
    label: 'High',
    dot: 'bg-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-100 dark:border-amber-900/50',
    text: 'text-amber-700 dark:text-amber-300',
  },
  medium: {
    label: 'Medium',
    dot: 'bg-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-100 dark:border-blue-900/50',
    text: 'text-blue-700 dark:text-blue-300',
  },
};

const CATEGORY_CONFIG = {
  reply: { icon: MessageSquare, label: 'Reply', color: 'text-green-500' },
  follow_up: { icon: Send, label: 'Follow-up', color: 'text-amber-500' },
  meeting: { icon: CalendarCheck, label: 'Meeting', color: 'text-purple-500' },
  prospecting: { icon: Target, label: 'Prospecting', color: 'text-red-500' },
};

export default function SalesActionPlan({ actions = [], onRefresh, typeFilter = 'all' }: SalesActionPlanProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const filteredActions = useMemo(() => {
    if (!Array.isArray(actions)) return [];
    if (typeFilter === 'all') return actions;
    return actions.filter(action => action.leadType === typeFilter);
  }, [actions, typeFilter]);

  if (!filteredActions.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="h-12 w-12 rounded-full bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center mb-3">
          <Sparkles className="h-6 w-6 text-zinc-400" />
        </div>
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nothing on the radar</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          {typeFilter === 'all'
            ? 'Your pipeline is clean. Good time to find new prospects.'
            : `No ${typeFilter} actions found. Try changing the filter.`}
        </p>
      </div>
    );
  }

  const handleAction = async (action: SalesAction) => {
    if (isProcessing) return;

    let endpoint = '';
    let body = {};
    let loadingMsg = '';
    let successMsg = '';

    if (action.category === 'follow_up' || action.category === 'prospecting') {
      endpoint = '/api/ai/draft-next-step';
      body = { leadId: action.leadId };
      loadingMsg = `Drafting outreach for ${action.leadName}...`;
      successMsg = `Draft ready for ${action.leadName}`;
    } else if (action.category === 'meeting') {
      endpoint = '/api/ai/battle-card';
      body = { leadId: action.leadId };
      loadingMsg = `Prepping for ${action.leadName}...`;
      successMsg = `Battle card ready for ${action.leadName}`;
    }

    if (!endpoint) return;

    setIsProcessing(action.id);
    const promise = (async () => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Action failed');
      if (onRefresh) onRefresh();
    })();

    toast.promise(promise, {
      loading: loadingMsg,
      success: successMsg,
      error: 'Action failed. Please try again.',
    });

    promise.finally(() => setIsProcessing(null));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-red-500" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recommended Actions</h2>
        </div>
        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
          {filteredActions.length} {typeFilter !== 'all' ? typeFilter : ''} Priorities
        </span>
      </div>

      <div className="space-y-2">
        {filteredActions.map((action) => {
          const prio = PRIORITY_CONFIG[action.priority];
          const cat = CATEGORY_CONFIG[action.category];
          const processing = isProcessing === action.id;

          return (
            <div
              key={action.id}
              className={`group relative rounded-xl border ${prio.border} ${prio.bg} p-3 transition-all hover:shadow-sm`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 h-8 w-8 rounded-lg bg-white/80 dark:bg-black/20 border ${prio.border} flex items-center justify-center shrink-0`}>
                  <cat.icon className={`h-4 w-4 ${cat.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tight border ${prio.border} ${prio.text}`}>
                      {prio.label}
                    </span>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {action.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-1 mb-1">
                    {action.reason}
                  </p>
                  <p className="text-xs text-zinc-800 dark:text-zinc-200 font-medium leading-snug">
                    {action.recommendedAction}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    {(action.category === 'follow_up' || action.category === 'prospecting' || action.category === 'meeting') && (
                      <button
                        onClick={() => handleAction(action)}
                        disabled={!!isProcessing}
                        title={action.category === 'meeting' ? 'Prep Battle Card' : 'Magic Draft Email'}
                        className="h-8 w-8 rounded-lg bg-white/60 dark:bg-black/20 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900/50 transition-all disabled:opacity-50"
                      >
                        {processing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : action.category === 'meeting' ? (
                          <Swords className="h-3.5 w-3.5" />
                        ) : (
                          <Zap className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                    <Link
                      href={action.ctaHref}
                      className="flex items-center gap-1.5 px-3 h-8 text-[11px] font-bold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white rounded-lg transition-colors shadow-sm"
                    >
                      {action.ctaLabel}
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 text-center">
        <Link
          href="/pipeline"
          className="text-[11px] font-medium text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center justify-center gap-1"
        >
          View Full Pipeline <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
