'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { api, formatRelative, type Paginated } from '@/lib/api/client';
import type { Sequence } from '@/types';
import type { SequenceStats } from '@/lib/sequences/service';

type Row = Sequence & { stats: SequenceStats };

export default function SequencesPage() {
  const router = useRouter();
  const sequences = useQuery({ queryKey: ['sequences', 'list'], queryFn: () => api<Paginated<Row>>('/sequences?limit=200') });
  const rows = sequences.data?.data ?? [];
  const total = sequences.data?.total ?? rows.length;

  return (
    <div className="-m-4 flex min-h-[calc(100dvh-3.5rem)] flex-col md:-m-6 lg:-m-8">
      <header className="flex-shrink-0 border-b border-zinc-200/80 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900 md:px-6">
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Sequences</h1>
          {!sequences.isLoading ? (
            <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {total}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Create and edit via MCP or the API. Activate, pause, and monitor here.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-auto bg-zinc-50/60 dark:bg-zinc-950">
        {sequences.isLoading ? (
          <div className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800/80 dark:bg-zinc-900">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex animate-pulse items-center gap-3 px-4 py-4 md:px-6">
                <div className="h-9 w-9 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-zinc-100 dark:bg-zinc-800" />
                  <div className="h-2.5 w-1/4 rounded bg-zinc-50 dark:bg-zinc-800/70" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!sequences.isLoading && rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-400 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <Send className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No sequences yet</p>
            <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
              Ask Claude to create one through MCP, or POST to <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">/api/v1/sequences</code>.
            </p>
          </div>
        ) : null}

        {rows.length > 0 ? (
          <ul className="divide-y divide-zinc-100 border-b border-zinc-200/80 bg-white dark:divide-zinc-800/80 dark:border-zinc-800 dark:bg-zinc-900">
            {rows.map((sequence) => {
              const live = (sequence.stats.enrollments.active || 0) + (sequence.stats.enrollments.paused || 0);
              return (
                <li key={sequence.id}>
                  <button
                    type="button"
                    onClick={() => router.push(`/sequences/${sequence.id}`)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40 md:px-6"
                  >
                    <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                      sequence.status === 'active'
                        ? 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-sm shadow-red-600/15'
                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}>
                      <Send className="h-4 w-4" />
                    </div>
                    <div className="grid min-w-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1.5fr)_auto_minmax(0,1.2fr)] lg:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">{sequence.name}</span>
                          <StatusBadge value={sequence.status} />
                        </div>
                        <div className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{sequence.slug}</div>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] tabular-nums text-zinc-500">
                        <span><span className="font-semibold text-zinc-800 dark:text-zinc-200">{live}</span> live</span>
                        <span><span className="font-semibold text-zinc-800 dark:text-zinc-200">{sequence.stats.emails.sent}</span> sent</span>
                        <span><span className="font-semibold text-zinc-800 dark:text-zinc-200">{sequence.stats.enrollments.replied || 0}</span> replies</span>
                        <span>{sequence.stats.reply_rate === null ? '—' : `${sequence.stats.reply_rate}%`} rate</span>
                        <span className="text-zinc-400">{sequence.stats.emails.bounced} bounced</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 lg:text-right">
                        Updated {formatRelative(sequence.updated_at)}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
