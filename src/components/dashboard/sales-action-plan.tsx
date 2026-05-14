'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Zap,
  MessageSquare,
  Send,
  CalendarCheck,
  Search,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SalesAction, SalesActionPriority, SalesActionCategory } from '@/lib/dashboard/sales-actions';

interface SalesActionPlanProps {
  actions: SalesAction[];
  onRefresh: () => void;
}

const PRIORITY_CONFIG: Record<SalesActionPriority, { label: string; color: string; bg: string; dot: string }> = {
  critical: {
    label: 'Critical',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/40',
    dot: 'bg-red-500',
  },
  high: {
    label: 'High',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    dot: 'bg-amber-500',
  },
  medium: {
    label: 'Medium',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    dot: 'bg-blue-500',
  },
};

const CATEGORY_ICONS: Record<SalesActionCategory, React.ReactNode> = {
  reply: <MessageSquare className="h-4 w-4" />,
  follow_up: <Send className="h-4 w-4" />,
  meeting: <CalendarCheck className="h-4 w-4" />,
  prospecting: <Search className="h-4 w-4" />,
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
      onRefresh();
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
        <p className="text-sm text-zinc-500">No urgent actions identified. You&apos;re all caught up!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500 fill-amber-500/20" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Next Actions</h2>
        </div>
        <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
          Prioritized by AI
        </span>
      </div>

      <div className="space-y-2">
        {actions.map((action) => (
          <ActionCard
            key={action.id}
            action={action}
            onMagicDraft={() => handleMagicDraft(action)}
            isProcessing={isProcessing === action.id}
          />
        ))}
      </div>
    </div>
  );
}

function ActionCard({
  action,
  onMagicDraft,
  isProcessing,
}: {
  action: SalesAction;
  onMagicDraft: () => void;
  isProcessing: boolean;
}) {
  const priority = PRIORITY_CONFIG[action.priority];
  const canMagicDraft = action.category === 'follow_up' || action.category === 'prospecting';

  return (
    <div className={`group relative rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4 transition-all hover:shadow-sm hover:border-zinc-300 dark:hover:border-zinc-600`}>
      <div className="flex items-start gap-3">
        {/* Category Icon */}
        <div className={`mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${priority.bg} ${priority.color}`}>
          {CATEGORY_ICONS[action.category]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={action.ctaHref}
              className="text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:text-red-600 dark:hover:text-red-400 truncate transition-colors"
            >
              {action.title}
            </Link>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tight ${priority.bg} ${priority.color}`}>
              {priority.label}
            </span>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{action.companyName}</span> · {action.reason}
          </p>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50">
            <ArrowRight className="h-3 w-3 text-red-500 shrink-0" />
            <p className="text-[11px] text-zinc-600 dark:text-zinc-300 font-medium">
              {action.recommendedAction}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 shrink-0">
          {canMagicDraft && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMagicDraft();
              }}
              disabled={isProcessing}
              title="Magic Draft with AI"
              className="h-8 w-8 flex items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors border border-amber-200/50 dark:border-amber-800/50 disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 fill-amber-500/20" />
              )}
            </button>
          )}
          <Link
            href={action.ctaHref}
            className="h-8 px-3 flex items-center gap-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[11px] font-semibold hover:bg-zinc-800 dark:hover:bg-white transition-colors"
          >
            {action.ctaLabel}
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
