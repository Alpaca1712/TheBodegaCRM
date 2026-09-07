'use client';

import { use, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock, Loader2, Paperclip, Play, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
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

function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200/90 bg-white px-4 py-3 shadow-sm shadow-zinc-950/[0.02] dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-zinc-400">{hint}</p> : null}
    </div>
  );
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
      <div className="flex items-center gap-2 py-16 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading sequence…
      </div>
    );
  }
  if (sequence.error || !sequence.data) {
    return <p className="py-10 text-sm text-red-600">{(sequence.error as Error)?.message || 'Not found'}</p>;
  }

  const record = sequence.data.data;
  const stats = record.stats;
  const live = (stats.enrollments.active || 0) + (stats.enrollments.paused || 0);
  const enrollmentRows = enrollments.data?.data ?? [];

  return (
    <div className="-m-4 flex min-h-[calc(100dvh-3.5rem)] flex-col md:-m-6 lg:-m-8">
      <header className="flex-shrink-0 border-b border-zinc-200/80 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900 md:px-6">
        <Link
          href="/sequences"
          className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Sequences
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{record.name}</h1>
              <StatusBadge value={record.status} />
            </div>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {record.description ||
                `${record.steps.length} step${record.steps.length === 1 ? '' : 's'} · from ${record.from_email || 'default sender'} · ${record.send_window.timezone} ${record.send_window.start_hour}:00–${record.send_window.end_hour}:00`}
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap gap-2">
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
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard label="Live" value={live} hint={`${stats.enrollments.completed || 0} completed`} />
          <StatCard label="Sent" value={stats.emails.sent} hint={`${stats.emails.delivered} delivered`} />
          <StatCard label="Opened" value={stats.emails.opened} />
          <StatCard label="Replied" value={stats.enrollments.replied || 0} hint={stats.reply_rate === null ? undefined : `${stats.reply_rate}% of enrolled`} />
          <StatCard label="Bounced" value={stats.emails.bounced} hint={`${stats.enrollments.unsubscribed || 0} unsubscribed`} />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-2">
        <section className="flex min-h-0 flex-col border-b border-zinc-200/80 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-950 lg:border-b-0 lg:border-r">
          <div className="flex flex-shrink-0 items-center justify-between border-b border-zinc-200/80 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900 md:px-5">
            <h2 className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">
              Steps
              <span className="ml-2 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {record.steps.length}
              </span>
            </h2>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5">
            {record.steps.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-400">No steps. Add them via the API.</p>
            ) : (
              <ol className="space-y-3">
                {record.steps.map((step) => (
                  <li
                    key={step.id}
                    className={`overflow-hidden rounded-xl border bg-white shadow-sm shadow-zinc-950/[0.02] dark:bg-zinc-900 ${
                      step.active
                        ? 'border-zinc-200/90 dark:border-zinc-800'
                        : 'border-dashed border-zinc-200 opacity-60 dark:border-zinc-800'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-4 py-2.5 text-[11px] text-zinc-500 dark:border-zinc-800">
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
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {step.subject || <span className="italic text-zinc-400">Re: previous subject</span>}
                      </p>
                      <pre className="mt-1.5 whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
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
        </section>

        <section className="flex min-h-0 flex-col bg-white dark:bg-zinc-900">
          <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-zinc-200/80 px-4 py-2.5 dark:border-zinc-800 md:px-5">
            <h2 className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">
              Enrollments
              <span className="ml-2 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {enrollments.data?.total ?? 0}
              </span>
            </h2>
            <select
              value={enrollmentStatus}
              onChange={(event) => setEnrollmentStatus(event.target.value)}
              className="h-7 rounded-md border border-zinc-200 bg-zinc-50 px-2 text-xs dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="">All</option>
              {['active', 'paused', 'completed', 'replied', 'bounced', 'unsubscribed', 'exited'].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {enrollments.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading enrollments…
              </div>
            ) : null}
            {!enrollments.isLoading && enrollmentRows.length === 0 ? (
              <p className="px-6 py-16 text-center text-sm text-zinc-400">Nobody enrolled yet.</p>
            ) : null}
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {enrollmentRows.map((enrollment) => (
                <li key={enrollment.id} className="px-4 py-3 md:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {enrollment.lead ? (
                        <Link href={`/leads/${enrollment.lead.id}`} className="group block">
                          <div className="truncate text-[13px] font-semibold text-zinc-900 group-hover:underline dark:text-zinc-100">
                            {enrollment.lead.full_name || enrollment.lead.email}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-zinc-500">
                            {enrollment.lead.company_name || enrollment.lead.email}
                          </div>
                        </Link>
                      ) : (
                        <span className="text-xs text-zinc-400">deleted lead</span>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <StatusBadge value={enrollment.status} />
                        <span className="text-[11px] tabular-nums text-zinc-400">
                          {enrollment.steps_sent}/{record.steps.filter((step) => step.active).length} steps
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          {enrollment.status === 'active' ? `next ${formatRelative(enrollment.next_step_due_at)}` : null}
                        </span>
                      </div>
                      {enrollment.exit_reason ? (
                        <p className="mt-1 max-w-[280px] truncate text-[11px] text-zinc-400" title={enrollment.exit_reason}>
                          {enrollment.exit_reason}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-shrink-0 gap-2">
                      {enrollment.status === 'active' ? (
                        <button
                          className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                          onClick={() => enrollmentAction.mutate({ enrollmentId: enrollment.id, action: 'pause' })}
                        >
                          Pause
                        </button>
                      ) : null}
                      {enrollment.status === 'paused' ? (
                        <button
                          className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                          onClick={() => enrollmentAction.mutate({ enrollmentId: enrollment.id, action: 'resume' })}
                        >
                          Resume
                        </button>
                      ) : null}
                      {enrollment.status === 'active' || enrollment.status === 'paused' ? (
                        <button
                          className="text-xs font-medium text-red-600 hover:text-red-800"
                          onClick={() => enrollmentAction.mutate({ enrollmentId: enrollment.id, action: 'exit' })}
                        >
                          Exit
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
