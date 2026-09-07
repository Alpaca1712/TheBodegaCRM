'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock, Loader2, Paperclip, Play, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { PageFrame, PageHeader, PageSplit, PaneHeader } from '@/components/console/page-frame';
import { EmptyState, ListRow, StatCard } from '@/components/console/surface';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { api, apiJson, formatRelative, type Paginated } from '@/lib/api/client';
import type { Sequence, SequenceEnrollment, SequenceStep } from '@/types';
import type { SequenceStats } from '@/lib/sequences/service';
import type { RunSummary } from '@/lib/sequences/runner';

type Detail = Sequence & { steps: SequenceStep[]; stats: SequenceStats };
type EnrollmentRow = SequenceEnrollment & {
  lead: { id: string; email: string; full_name: string | null; company_name: string | null; stage: string } | null;
};

function describeDelay(minutes: number) {
  if (minutes === 0) return 'immediately';
  if (minutes % 1440 === 0) return `${minutes / 1440} day${minutes / 1440 === 1 ? '' : 's'}`;
  if (minutes % 60 === 0) return `${minutes / 60} hour${minutes / 60 === 1 ? '' : 's'}`;
  return `${minutes} min`;
}

export default function SequenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [enrollmentStatus, setEnrollmentStatus] = useState('');

  const sequence = useQuery({ queryKey: ['sequence', id], queryFn: () => api<{ data: Detail }>(`/sequences/${id}`) });
  const enrollments = useQuery({
    queryKey: ['enrollments', id, enrollmentStatus],
    queryFn: () => api<Paginated<EnrollmentRow>>(`/sequences/${id}/enrollments?limit=200${enrollmentStatus ? `&status=${enrollmentStatus}` : ''}`),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['sequence', id] });
    queryClient.invalidateQueries({ queryKey: ['enrollments', id] });
    queryClient.invalidateQueries({ queryKey: ['sequences'] });
  };

  const setStatus = useMutation({
    mutationFn: (status: Sequence['status']) => apiJson<{ data: Detail }>(`/sequences/${id}`, 'PATCH', { status }),
    onSuccess: () => { toast.success('Sequence updated'); refresh(); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Update failed'),
  });
  const run = useMutation({
    mutationFn: () => apiJson<{ data: RunSummary }>(`/sequences/${id}/run`, 'POST'),
    onSuccess: (result) => {
      toast.success(`Processed ${result.data.processed}: ${result.data.sent} sent, ${result.data.deferred} deferred`);
      refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Run failed'),
  });
  const enrollmentAction = useMutation({
    mutationFn: ({ enrollmentId, action }: { enrollmentId: string; action: string }) =>
      apiJson(`/sequences/${id}/enrollments/${enrollmentId}`, 'PATCH', { action }),
    onSuccess: () => refresh(),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed'),
  });

  if (sequence.isLoading) {
    return (
      <PageFrame>
        <div className="flex items-center gap-2 px-5 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading sequence…
        </div>
      </PageFrame>
    );
  }
  if (sequence.error || !sequence.data) {
    return (
      <PageFrame>
        <p className="px-5 py-10 text-sm text-destructive">{(sequence.error as Error)?.message || 'Not found'}</p>
      </PageFrame>
    );
  }

  const record = sequence.data.data;
  const stats = record.stats;
  const live = (stats.enrollments.active || 0) + (stats.enrollments.paused || 0);
  const enrollmentRows = enrollments.data?.data ?? [];

  const headerActions = (
    <>
      {record.status === 'active' ? (
        <Button size="sm" variant="outline" onClick={() => setStatus.mutate('paused')} isLoading={setStatus.isPending}>
          Pause
        </Button>
      ) : record.status !== 'archived' ? (
        <Button size="sm" onClick={() => setStatus.mutate('active')} isLoading={setStatus.isPending}>
          Activate
        </Button>
      ) : null}
      <Button
        size="sm"
        variant="outline"
        onClick={() => run.mutate()}
        isLoading={run.isPending}
        disabled={record.status !== 'active'}
      >
        {!run.isPending ? <Play className="mr-1.5 h-3.5 w-3.5" /> : null}
        Run due steps
      </Button>
    </>
  );

  const enrollmentFilter = (
    <select
      value={enrollmentStatus}
      onChange={(event) => setEnrollmentStatus(event.target.value)}
      className="h-7 rounded-md border border-border bg-muted px-2 text-xs"
    >
      <option value="">All</option>
      {['active', 'paused', 'completed', 'replied', 'bounced', 'unsubscribed', 'exited'].map((status) => (
        <option key={status} value={status}>{status}</option>
      ))}
    </select>
  );

  return (
    <PageFrame>
      <PageHeader
        title={
          <div className="flex flex-wrap items-center gap-2">
            <span>{record.name}</span>
            <StatusBadge value={record.status} />
          </div>
        }
        description={
          <div className="space-y-1">
            <Link
              href="/sequences"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Sequences
            </Link>
            <p>
              {record.description ||
                `${record.steps.length} step${record.steps.length === 1 ? '' : 's'} · from ${record.from_email || 'default sender'} · ${record.send_window.timezone} ${record.send_window.start_hour}:00–${record.send_window.end_hour}:00`}
            </p>
          </div>
        }
        actions={headerActions}
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard label="Live" value={live} hint={`${stats.enrollments.completed || 0} completed`} />
          <StatCard label="Sent" value={stats.emails.sent} hint={`${stats.emails.delivered} delivered`} />
          <StatCard label="Opened" value={stats.emails.opened} />
          <StatCard label="Replied" value={stats.enrollments.replied || 0} hint={stats.reply_rate === null ? undefined : `${stats.reply_rate}% of enrolled`} />
          <StatCard label="Bounced" value={stats.emails.bounced} hint={`${stats.enrollments.unsubscribed || 0} unsubscribed`} />
        </div>
      </PageHeader>

      <PageSplit sidebarWidth="minmax(0,1fr)" sidebar={
        <>
          <PaneHeader title="Steps" count={record.steps.length} />
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {record.steps.length === 0 ? (
              <EmptyState
                title="No steps"
                description="Add them via the API."
                className="py-10"
              />
            ) : (
              <ol className="space-y-3">
                {record.steps.map((step) => (
                  <li
                    key={step.id}
                    className={`overflow-hidden rounded-xl border bg-card shadow-sm shadow-zinc-950/[0.02] ${
                      step.active
                        ? 'border-border'
                        : 'border-dashed border-border opacity-60'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5 text-[11px] text-muted-foreground">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 text-[10px] font-semibold text-white">
                        {step.position}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {describeDelay(step.delay_minutes)}
                        {step.position > 1 ? ' after previous' : ' after enrollment'}
                      </span>
                      {step.thread_with_previous && step.position > 1 ? <span>· threaded reply</span> : null}
                      {step.lead_magnet_id ? (
                        <span className="inline-flex items-center gap-1"><Paperclip className="h-3 w-3" /> attachment</span>
                      ) : null}
                      {step.condition_prompt ? (
                        <span className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-300">
                          <Sparkles className="h-3 w-3" /> AI condition
                        </span>
                      ) : null}
                      {!step.active ? <span>· inactive</span> : null}
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">
                        {step.subject || <span className="italic text-muted-foreground">Re: previous subject</span>}
                      </p>
                      <pre className="mt-1.5 whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-foreground">
                        {step.body}
                      </pre>
                      {step.condition_prompt ? (
                        <p className="mt-2 rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs text-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
                          Only send if: {step.condition_prompt}
                          {step.condition_model ? ` (${step.condition_model})` : ''}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </>
      }>
        <PaneHeader
          title="Enrollments"
          count={enrollments.data?.total ?? 0}
          actions={enrollmentFilter}
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {enrollments.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading enrollments…
            </div>
          ) : null}
          {!enrollments.isLoading && enrollmentRows.length === 0 ? (
            <EmptyState
              title="Nobody enrolled yet"
              className="py-16"
            />
          ) : null}
          <ul>
            {enrollmentRows.map((enrollment) => (
              <li key={enrollment.id}>
                <ListRow>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {enrollment.lead ? (
                        <Link href={`/leads/${enrollment.lead.id}`} className="group block">
                          <div className="truncate text-[13px] font-semibold text-foreground group-hover:underline">
                            {enrollment.lead.full_name || enrollment.lead.email}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {enrollment.lead.company_name || enrollment.lead.email}
                          </div>
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">deleted lead</span>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <StatusBadge value={enrollment.status} />
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {enrollment.steps_sent}/{record.steps.filter((step) => step.active).length} steps
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {enrollment.status === 'active' ? `next ${formatRelative(enrollment.next_step_due_at)}` : null}
                        </span>
                      </div>
                      {enrollment.exit_reason ? (
                        <p className="mt-1 max-w-[280px] truncate text-[11px] text-muted-foreground" title={enrollment.exit_reason}>
                          {enrollment.exit_reason}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-shrink-0 gap-2">
                      {enrollment.status === 'active' ? (
                        <button
                          type="button"
                          className="text-xs font-medium text-muted-foreground hover:text-foreground"
                          onClick={() => enrollmentAction.mutate({ enrollmentId: enrollment.id, action: 'pause' })}
                        >
                          Pause
                        </button>
                      ) : null}
                      {enrollment.status === 'paused' ? (
                        <button
                          type="button"
                          className="text-xs font-medium text-muted-foreground hover:text-foreground"
                          onClick={() => enrollmentAction.mutate({ enrollmentId: enrollment.id, action: 'resume' })}
                        >
                          Resume
                        </button>
                      ) : null}
                      {enrollment.status === 'active' || enrollment.status === 'paused' ? (
                        <button
                          type="button"
                          className="text-xs font-medium text-red-600 hover:text-red-800"
                          onClick={() => enrollmentAction.mutate({ enrollmentId: enrollment.id, action: 'exit' })}
                        >
                          Exit
                        </button>
                      ) : null}
                    </div>
                  </div>
                </ListRow>
              </li>
            ))}
          </ul>
        </div>
      </PageSplit>
    </PageFrame>
  );
}
