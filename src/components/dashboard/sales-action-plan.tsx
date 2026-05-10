'use client';

import React from 'react';
import Link from 'next/link';
import {
  Zap,
  ArrowRight,
  MessageSquare,
  Clock,
  CalendarCheck,
  Target,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { SalesAction } from '@/lib/dashboard/sales-actions';

interface SalesActionPlanProps {
  actions: SalesAction[];
  isDrafting?: string | null;
  onMagicDraft?: (leadId: string, leadName: string) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  reply: <MessageSquare className="h-4 w-4 text-red-500" />,
  follow_up: <Clock className="h-4 w-4 text-amber-500" />,
  meeting: <CalendarCheck className="h-4 w-4 text-purple-500" />,
  prospecting: <Target className="h-4 w-4 text-blue-500" />,
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
};

export default function SalesActionPlan({ actions, isDrafting, onMagicDraft }: SalesActionPlanProps) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Target className="h-4 w-4 text-red-500" />
          Prioritized Action Plan
        </h2>
        <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Top {actions.length} Priorities</span>
      </div>

      <div className="space-y-3">
        {actions.map((action) => {
          const canMagicDraft = onMagicDraft && (action.category === 'reply' || action.category === 'follow_up' || action.category === 'prospecting');
          const isProcessing = isDrafting === action.leadId;

          return (
            <div
              key={action.id}
              className="group relative flex items-start gap-4 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-red-200 dark:hover:border-red-900/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all"
            >
              <div className="mt-0.5 shrink-0">
                {CATEGORY_ICONS[action.category] || <AlertCircle className="h-4 w-4 text-zinc-400" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link href={`/leads/${action.leadId}`} className="text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:text-red-600 dark:hover:text-red-400 truncate">
                    {action.title}
                  </Link>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tight ${PRIORITY_COLORS[action.priority]}`}>
                    {action.priority}
                  </span>
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                  {action.reason}
                </p>

                <div className="bg-white dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-lg p-2.5">
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed italic">
                    {action.recommendedAction}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-center">
                {canMagicDraft && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onMagicDraft(action.leadId, action.leadName);
                    }}
                    disabled={!!isDrafting}
                    className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                    title="Magic Draft"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                  </button>
                )}
                <Link
                  href={action.ctaHref}
                  className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  title={action.ctaLabel}
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
