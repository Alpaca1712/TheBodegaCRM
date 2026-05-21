'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquare,
  Sparkles,
  Swords,
  Target,
  Zap,
} from 'lucide-react';
import type { SalesAction } from '@/lib/dashboard/sales-actions';
import { CopyButton } from '@/components/ui/copy-button';

interface SalesActionPlanProps {
  actions: SalesAction[];
  isProcessing?: string | null;
  onMagicDraft?: (leadId: string, leadName: string) => void;
  onResearch?: (leadId: string, leadName: string) => void;
  onPrep?: (leadId: string, leadName: string) => void;
  onInvestorMemo?: (leadId: string, leadName: string) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  reply: <MessageSquare className="h-4 w-4 text-red-500" />,
  follow_up: <Clock className="h-4 w-4 text-amber-500" />,
  meeting: <CalendarCheck className="h-4 w-4 text-purple-500" />,
  prospecting: <Target className="h-4 w-4 text-blue-500" />,
  research: <Sparkles className="h-4 w-4 text-emerald-500" />,
  meeting_prep: <Swords className="h-4 w-4 text-indigo-500" />,
  review: <ClipboardCheck className="h-4 w-4 text-blue-500" />,
  investor_memo: <FileText className="h-4 w-4 text-purple-500" />,
};

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  critical: {
    color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    label: 'Critical',
  },
  high: {
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    label: 'High',
  },
  medium: {
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
    label: 'Medium',
  },
};

export default function SalesActionPlan({
  actions,
  isProcessing,
  onMagicDraft,
  onResearch,
  onPrep,
  onInvestorMemo,
}: SalesActionPlanProps) {
  if (!actions || actions.length === 0) {
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
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Target className="h-4 w-4 text-red-500" />
          Sales Action Plan
        </h2>
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Prioritized by AI</span>
      </div>

      <div className="space-y-3">
        {actions.map((action) => {
          const isLoading = isProcessing === action.leadId;
          const priority = PRIORITY_CONFIG[action.priority] || PRIORITY_CONFIG.medium;

          return (
            <div
              key={action.id}
              className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 hover:border-red-200 dark:hover:border-red-900/40 transition-all"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="mt-0.5 shrink-0">
                  {CATEGORY_ICONS[action.category] || <AlertCircle className="h-4 w-4 text-zinc-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${action.priority === 'critical' ? 'bg-red-500' : action.priority === 'high' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tight ${priority.color}`} title={`${priority.label} Priority`}>
                        {priority.label}
                      </span>
                    </div>
                    <Link
                      href={`/leads/${action.leadId}`}
                      className="text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:text-red-600 dark:hover:text-red-400 truncate"
                      aria-label={`View details for ${action.leadName}`}
                    >
                      {action.title}
                    </Link>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                    {action.companyName && <span className="font-medium text-zinc-700 dark:text-zinc-300">{action.companyName} · </span>}
                    {action.reason}
                  </p>
                  <div className="group/action relative flex items-start gap-2 bg-white dark:bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <Zap className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed italic pr-8">{action.recommendedAction}</p>
                    <CopyButton
                      value={action.recommendedAction}
                      label="Action"
                      className="absolute top-2 right-2 opacity-0 group-hover/action:opacity-100 focus:opacity-100 transition-opacity"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {/* Secondary AI Actions */}
                {action.category === 'research' && onResearch && (
                  <button
                    onClick={() => onResearch(action.leadId, action.leadName)}
                    disabled={!!isProcessing}
                    className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition-colors border border-emerald-100 dark:border-emerald-800 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Research
                  </button>
                )}
                {action.category === 'meeting_prep' && onPrep && (
                  <button
                    onClick={() => onPrep(action.leadId, action.leadName)}
                    disabled={!!isProcessing}
                    className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-800 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Swords className="h-3.5 w-3.5" />}
                    Prep
                  </button>
                )}
                {action.category === 'investor_memo' && onInvestorMemo && (
                  <button
                    onClick={() => onInvestorMemo(action.leadId, action.leadName)}
                    disabled={!!isProcessing}
                    className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg transition-colors border border-purple-100 dark:border-purple-800 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                    Memo
                  </button>
                )}
                {['reply', 'follow_up', 'prospecting'].includes(action.category) && onMagicDraft && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onMagicDraft(action.leadId, action.leadName);
                    }}
                    disabled={!!isProcessing}
                    title="Magic Draft"
                    aria-label={isLoading ? "Drafting email..." : "Generate AI draft"}
                    className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg transition-colors border border-amber-100 dark:border-amber-800 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5 fill-current" />
                    )}
                    {isLoading ? "Drafting..." : "Draft"}
                  </button>
                )}

                {/* Primary CTA */}
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
