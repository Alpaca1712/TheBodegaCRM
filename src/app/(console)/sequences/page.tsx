'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Send } from 'lucide-react';
import { PageBody, PageFrame, PageHeader } from '@/components/console/page-frame';
import { EmptyState, ListHeader, ListRow } from '@/components/console/surface';
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
    <PageFrame>
      <PageHeader
        title="Sequences"
        count={sequences.isLoading ? null : total}
        description="Create and edit via MCP or the API. Activate, pause, and monitor here."
      />
      <PageBody className="bg-card">
        <ListHeader className="grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_7rem] gap-3">
          <span>Sequence</span>
          <span>Performance</span>
          <span className="text-right">Updated</span>
        </ListHeader>

        {sequences.isLoading ? (
          <div>
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex animate-pulse items-center gap-3 border-b border-border px-5 py-3.5">
                <div className="h-9 w-9 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-40 rounded bg-muted" />
                  <div className="h-2.5 w-28 rounded bg-muted/70" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!sequences.isLoading && rows.length === 0 ? (
          <EmptyState
            icon={Send}
            title="No sequences yet"
            description={<>Ask Claude to create one through MCP, or POST to <code className="rounded bg-muted px-1">/api/v1/sequences</code>.</>}
          />
        ) : null}

        {rows.length > 0 ? (
          <ul>
            {rows.map((sequence) => {
              const live = (sequence.stats.enrollments.active || 0) + (sequence.stats.enrollments.paused || 0);
              return (
                <li key={sequence.id}>
                  <ListRow
                    onClick={() => router.push(`/sequences/${sequence.id}`)}
                    className="grid grid-cols-1 items-center gap-2 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_7rem] md:gap-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                        sequence.status === 'active'
                          ? 'bg-gradient-to-br from-red-500 to-red-700 text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <Send className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-[13px] font-semibold text-foreground">{sequence.name}</span>
                          <StatusBadge value={sequence.status} />
                        </div>
                        <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{sequence.slug}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 pl-12 text-[12px] tabular-nums text-muted-foreground md:pl-0">
                      <span><span className="font-semibold text-foreground">{live}</span> live</span>
                      <span><span className="font-semibold text-foreground">{sequence.stats.emails.sent}</span> sent</span>
                      <span><span className="font-semibold text-foreground">{sequence.stats.enrollments.replied || 0}</span> replies</span>
                      <span>{sequence.stats.reply_rate === null ? '—' : `${sequence.stats.reply_rate}%`} rate</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pl-12 text-[12px] text-muted-foreground md:justify-end md:pl-0">
                      <span>{formatRelative(sequence.updated_at)}</span>
                      <ChevronRight className="hidden h-4 w-4 text-muted-foreground/40 md:block" />
                    </div>
                  </ListRow>
                </li>
              );
            })}
          </ul>
        ) : null}
      </PageBody>
    </PageFrame>
  );
}
