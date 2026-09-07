'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyRow, TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
import { api, formatRelative, type Paginated } from '@/lib/api/client';
import type { Sequence } from '@/types';
import type { SequenceStats } from '@/lib/sequences/service';

type Row = Sequence & { stats: SequenceStats };

export default function SequencesPage() {
  const router = useRouter();
  const sequences = useQuery({ queryKey: ['sequences', 'list'], queryFn: () => api<Paginated<Row>>('/sequences?limit=200') });

  return (
    <div>
      <PageHeader title="Sequences" description="Create and edit sequences from Claude via MCP or the REST API. Activate, pause, and monitor here." />
      <Table>
        <THead>
          <tr>
            <TH>Sequence</TH>
            <TH>Status</TH>
            <TH className="text-right">Live</TH>
            <TH className="text-right">Sent</TH>
            <TH className="text-right">Replies</TH>
            <TH className="text-right">Reply rate</TH>
            <TH className="text-right">Bounced</TH>
            <TH>Updated</TH>
          </tr>
        </THead>
        <TBody>
          {sequences.isLoading ? <EmptyRow colSpan={8}>Loading…</EmptyRow> : null}
          {sequences.data && sequences.data.data.length === 0 ? <EmptyRow colSpan={8}>No sequences yet. Ask Claude to create one.</EmptyRow> : null}
          {sequences.data?.data.map((sequence) => {
            const live = (sequence.stats.enrollments.active || 0) + (sequence.stats.enrollments.paused || 0);
            return (
              <TR key={sequence.id} onClick={() => router.push(`/sequences/${sequence.id}`)}>
                <TD>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">{sequence.name}</div>
                  <div className="text-xs text-zinc-500">{sequence.slug}</div>
                </TD>
                <TD><StatusBadge value={sequence.status} /></TD>
                <TD className="text-right tabular-nums">{live}</TD>
                <TD className="text-right tabular-nums">{sequence.stats.emails.sent}</TD>
                <TD className="text-right tabular-nums">{sequence.stats.enrollments.replied || 0}</TD>
                <TD className="text-right tabular-nums">{sequence.stats.reply_rate === null ? '—' : `${sequence.stats.reply_rate}%`}</TD>
                <TD className="text-right tabular-nums">{sequence.stats.emails.bounced}</TD>
                <TD className="text-xs text-zinc-500">{formatRelative(sequence.updated_at)}</TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
