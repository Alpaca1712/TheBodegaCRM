'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock, Paperclip, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader, Section, Stat } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyRow, TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
import { api, apiJson, formatRelative, type Paginated } from '@/lib/api/client';
import type { Sequence, SequenceEnrollment, SequenceStep } from '@/types';
import type { SequenceStats } from '@/lib/sequences/service';
import type { RunSummary } from '@/lib/sequences/runner';

type Detail = Sequence & { steps: SequenceStep[]; stats: SequenceStats };
type EnrollmentRow = SequenceEnrollment & { lead: { id: string; email: string; full_name: string | null; company_name: string | null; stage: string } | null };

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
    onSuccess: (result) => { toast.success(`Processed ${result.data.processed}: ${result.data.sent} sent, ${result.data.deferred} deferred`); refresh(); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Run failed'),
  });
  const enrollmentAction = useMutation({
    mutationFn: ({ enrollmentId, action }: { enrollmentId: string; action: string }) => apiJson(`/sequences/${id}/enrollments/${enrollmentId}`, 'PATCH', { action }),
    onSuccess: () => refresh(),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed'),
  });

  if (sequence.isLoading) return <p className="text-sm text-zinc-500">Loading…</p>;
  if (sequence.error || !sequence.data) return <p className="text-sm text-red-600">{(sequence.error as Error)?.message || 'Not found'}</p>;

  const record = sequence.data.data;
  const stats = record.stats;
  const live = (stats.enrollments.active || 0) + (stats.enrollments.paused || 0);

  return (
    <div>
      <Link href="/sequences" className="mb-3 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
        <ArrowLeft className="h-3 w-3" /> Sequences
      </Link>
      <PageHeader
        title={<span className="flex items-center gap-2">{record.name} <StatusBadge value={record.status} /></span>}
        description={record.description || `${record.steps.length} step${record.steps.length === 1 ? '' : 's'} · from ${record.from_email || 'default sender'} · ${record.send_window.timezone} ${record.send_window.start_hour}:00–${record.send_window.end_hour}:00`}
        actions={
          <>
            {record.status === 'active' ? (
              <Button size="sm" variant="outline" onClick={() => setStatus.mutate('paused')} isLoading={setStatus.isPending}>Pause</Button>
            ) : record.status !== 'archived' ? (
              <Button size="sm" onClick={() => setStatus.mutate('active')} isLoading={setStatus.isPending}>Activate</Button>
            ) : null}
            <Button size="sm" variant="outline" onClick={() => run.mutate()} isLoading={run.isPending} disabled={record.status !== 'active'}>Run due steps</Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Live" value={live} hint={`${stats.enrollments.completed || 0} completed`} />
        <Stat label="Sent" value={stats.emails.sent} hint={`${stats.emails.delivered} delivered`} />
        <Stat label="Opened" value={stats.emails.opened} />
        <Stat label="Replied" value={stats.enrollments.replied || 0} hint={stats.reply_rate === null ? undefined : `${stats.reply_rate}% of enrolled`} />
        <Stat label="Bounced" value={stats.emails.bounced} hint={`${stats.enrollments.unsubscribed || 0} unsubscribed`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Section title="Steps">
          {record.steps.length === 0 ? <p className="text-sm text-zinc-400">No steps. Add them via the API.</p> : null}
          <ol className="space-y-3">
            {record.steps.map((step) => (
              <li key={step.id} className={`rounded-lg border p-3 ${step.active ? 'border-zinc-200 dark:border-zinc-800' : 'border-dashed border-zinc-200 opacity-60 dark:border-zinc-800'}`}>
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">{step.position}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {describeDelay(step.delay_minutes)}{step.position > 1 ? ' after previous' : ' after enrollment'}</span>
                  {step.thread_with_previous && step.position > 1 ? <span>· threaded reply</span> : null}
                  {step.lead_magnet_id ? <span className="inline-flex items-center gap-1"><Paperclip className="h-3 w-3" /> attachment</span> : null}
                  {step.condition_prompt ? <span className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-300"><Sparkles className="h-3 w-3" /> AI condition</span> : null}
                  {!step.active ? <span>· inactive</span> : null}
                </div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{step.subject || <span className="italic text-zinc-400">Re: previous subject</span>}</p>
                <pre className="mt-1 whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">{step.body}</pre>
                {step.condition_prompt ? <p className="mt-2 rounded bg-violet-50 px-2 py-1 text-xs text-violet-800 dark:bg-violet-950/40 dark:text-violet-200">Only send if: {step.condition_prompt}{step.condition_model ? ` (${step.condition_model})` : ''}</p> : null}
              </li>
            ))}
          </ol>
        </Section>

        <Section
          title={`Enrollments (${enrollments.data?.total ?? 0})`}
          actions={
            <select value={enrollmentStatus} onChange={(event) => setEnrollmentStatus(event.target.value)} className="h-7 rounded-md border border-zinc-300 bg-white px-2 text-xs dark:border-zinc-700 dark:bg-zinc-800">
              <option value="">All</option>
              {['active', 'paused', 'completed', 'replied', 'bounced', 'unsubscribed', 'exited'].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          }
        >
          <Table>
            <THead>
              <tr>
                <TH>Lead</TH>
                <TH>Status</TH>
                <TH>Progress</TH>
                <TH>Next</TH>
                <TH></TH>
              </tr>
            </THead>
            <TBody>
              {enrollments.isLoading ? <EmptyRow colSpan={5}>Loading…</EmptyRow> : null}
              {enrollments.data && enrollments.data.data.length === 0 ? <EmptyRow colSpan={5}>Nobody enrolled yet.</EmptyRow> : null}
              {enrollments.data?.data.map((enrollment) => (
                <TR key={enrollment.id}>
                  <TD>
                    {enrollment.lead ? (
                      <Link href={`/leads/${enrollment.lead.id}`} className="hover:underline">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{enrollment.lead.full_name || enrollment.lead.email}</div>
                        <div className="text-xs text-zinc-500">{enrollment.lead.company_name || enrollment.lead.email}</div>
                      </Link>
                    ) : <span className="text-zinc-400">deleted lead</span>}
                  </TD>
                  <TD><StatusBadge value={enrollment.status} />{enrollment.exit_reason ? <div className="mt-0.5 max-w-[160px] truncate text-[11px] text-zinc-400" title={enrollment.exit_reason}>{enrollment.exit_reason}</div> : null}</TD>
                  <TD className="tabular-nums text-xs">{enrollment.steps_sent}/{record.steps.filter((step) => step.active).length}</TD>
                  <TD className="text-xs text-zinc-500">{enrollment.status === 'active' ? formatRelative(enrollment.next_step_due_at) : '—'}</TD>
                  <TD className="text-right">
                    {enrollment.status === 'active' ? <button className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => enrollmentAction.mutate({ enrollmentId: enrollment.id, action: 'pause' })}>Pause</button> : null}
                    {enrollment.status === 'paused' ? <button className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => enrollmentAction.mutate({ enrollmentId: enrollment.id, action: 'resume' })}>Resume</button> : null}
                    {enrollment.status === 'active' || enrollment.status === 'paused' ? <button className="ml-3 text-xs text-red-600 hover:text-red-800" onClick={() => enrollmentAction.mutate({ enrollmentId: enrollment.id, action: 'exit' })}>Exit</button> : null}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Section>
      </div>
    </div>
  );
}
