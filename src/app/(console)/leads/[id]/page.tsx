'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, PageHeader, Section } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';
import { ThreadView } from '@/components/email/thread-view';
import { ComposeReply } from '@/components/email/compose-reply';
import { api, apiJson, formatRelative } from '@/lib/api/client';
import { LEAD_STAGES, type Email, type Lead, type Sequence, type SequenceEnrollment } from '@/types';

type LeadDetail = Lead & { live_enrollment: SequenceEnrollment | null };

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<string | null>(null);
  const [sequenceId, setSequenceId] = useState('');

  const lead = useQuery({ queryKey: ['lead', id], queryFn: () => api<{ data: LeadDetail }>(`/leads/${id}`) });
  const thread = useQuery({ queryKey: ['lead-thread', id], queryFn: () => api<{ data: Email[] }>(`/leads/${id}/emails`) });
  const sequences = useQuery({ queryKey: ['sequences', 'all'], queryFn: () => api<{ data: Sequence[] }>('/sequences?limit=200') });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['lead', id] });
    queryClient.invalidateQueries({ queryKey: ['lead-thread', id] });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  };

  const update = useMutation({
    mutationFn: (patch: Partial<Lead>) => apiJson<{ data: Lead }>(`/leads/${id}`, 'PATCH', patch),
    onSuccess: () => { toast.success('Lead updated'); refresh(); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Update failed'),
  });
  const verify = useMutation({
    mutationFn: () => apiJson<{ data: { result: { status: string } } }>(`/leads/${id}/verify-email`, 'POST'),
    onSuccess: (result) => { toast.success(`Hunter: ${result.data.result.status}`); refresh(); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Verification failed'),
  });
  const enroll = useMutation({
    mutationFn: () => apiJson<{ data: { enrolled: unknown[]; skipped: { reason: string }[] } }>(`/leads/${id}/enroll`, 'POST', { sequence_id: sequenceId }),
    onSuccess: (result) => {
      if (result.data.enrolled.length) toast.success('Enrolled');
      else toast.error(result.data.skipped[0]?.reason || 'Not enrolled');
      refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Enroll failed'),
  });
  const exitEnrollment = useMutation({
    mutationFn: (enrollment: SequenceEnrollment) => apiJson(`/sequences/${enrollment.sequence_id}/enrollments/${enrollment.id}`, 'PATCH', { action: 'exit', reason: 'Exited from console' }),
    onSuccess: () => { toast.success('Removed from sequence'); refresh(); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed'),
  });

  if (lead.isLoading) return <p className="text-sm text-zinc-500">Loading…</p>;
  if (lead.error || !lead.data) return <p className="text-sm text-red-600">{(lead.error as Error)?.message || 'Lead not found'}</p>;

  const record = lead.data.data;
  const emails = thread.data?.data || [];
  const lastInbound = [...emails].reverse().find((email) => email.direction === 'inbound') || null;
  const lastAny = emails.length ? emails[emails.length - 1] : null;
  const liveSequence = record.live_enrollment ? sequences.data?.data.find((sequence) => sequence.id === record.live_enrollment?.sequence_id) : null;

  return (
    <div>
      <Link href="/leads" className="mb-3 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
        <ArrowLeft className="h-3 w-3" /> Leads
      </Link>
      <PageHeader
        title={record.full_name || record.email}
        description={<>{[record.title, record.company_name].filter(Boolean).join(' · ') || record.email} <StatusBadge value={record.stage} className="ml-2" /></>}
        actions={
          <select
            value={record.stage}
            onChange={(event) => update.mutate({ stage: event.target.value as Lead['stage'] })}
            className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            {LEAD_STAGES.map((value) => <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>)}
          </select>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Section title={`Conversation (${emails.length})`}>
            <ThreadView emails={emails} emptyText="No emails exchanged yet." />
          </Section>
          {record.do_not_contact || record.unsubscribed_at ? (
            <p className="text-sm text-red-600">This lead unsubscribed / is marked do-not-contact. Sending is blocked.</p>
          ) : (
            <ComposeReply leadId={record.id} replyTo={lastInbound || lastAny} />
          )}
        </div>

        <aside className="space-y-4">
          <Section title="Sequence">
            {record.live_enrollment ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <Link href={`/sequences/${record.live_enrollment.sequence_id}`} className="font-medium text-zinc-900 hover:underline dark:text-zinc-100">
                    {liveSequence?.name || 'Sequence'}
                  </Link>
                  <StatusBadge value={record.live_enrollment.status} />
                </div>
                <p className="text-xs text-zinc-500">
                  {record.live_enrollment.steps_sent} step{record.live_enrollment.steps_sent === 1 ? '' : 's'} sent · next {formatRelative(record.live_enrollment.next_step_due_at)}
                </p>
                <Button size="sm" variant="outline" onClick={() => exitEnrollment.mutate(record.live_enrollment!)} isLoading={exitEnrollment.isPending}>Remove from sequence</Button>
              </div>
            ) : (
              <div className="space-y-2">
                <select value={sequenceId} onChange={(event) => setSequenceId(event.target.value)} className="h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <option value="">Choose a sequence…</option>
                  {sequences.data?.data.filter((sequence) => sequence.status !== 'archived').map((sequence) => (
                    <option key={sequence.id} value={sequence.id}>{sequence.name} ({sequence.status})</option>
                  ))}
                </select>
                <Button size="sm" className="w-full" disabled={!sequenceId} isLoading={enroll.isPending} onClick={() => enroll.mutate()}>Enroll</Button>
              </div>
            )}
          </Section>

          <Section title="Contact" actions={<Button size="sm" variant="ghost" onClick={() => verify.mutate()} isLoading={verify.isPending}>Verify email</Button>}>
            <dl className="space-y-3">
              <Field label="Email"><span className="flex items-center gap-2">{record.email} <StatusBadge value={record.email_status} /></span></Field>
              <Field label="Title">{record.title}</Field>
              <Field label="LinkedIn">{record.linkedin_url ? <a href={record.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">Profile <ExternalLink className="h-3 w-3" /></a> : null}</Field>
              <Field label="Phone">{record.phone}</Field>
              <Field label="Source">{record.source}</Field>
              <Field label="Tags">{record.tags.length ? record.tags.join(', ') : null}</Field>
            </dl>
          </Section>

          <Section title="Company">
            <dl className="space-y-3">
              <Field label="Name">{record.company_name}</Field>
              <Field label="Domain">{record.company_domain}</Field>
              <Field label="Industry">{record.company_industry}</Field>
              <Field label="Size">{record.company_size}</Field>
              <Field label="Location">{record.company_location}</Field>
              <Field label="Description">{record.company_description}</Field>
            </dl>
          </Section>

          <Section title="Notes" actions={notes !== null && notes !== (record.notes || '') ? <Button size="sm" variant="ghost" onClick={() => update.mutate({ notes })} isLoading={update.isPending}>Save</Button> : null}>
            <Textarea value={notes ?? record.notes ?? ''} onChange={(event) => setNotes(event.target.value)} rows={5} placeholder="Notes…" />
          </Section>

          {Object.keys(record.research || {}).length ? (
            <Section title="Research">
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs text-zinc-700 dark:text-zinc-300">{JSON.stringify(record.research, null, 2)}</pre>
            </Section>
          ) : null}

          <Section title="Timeline">
            <dl className="space-y-3">
              <Field label="Created">{formatRelative(record.created_at)}</Field>
              <Field label="Last outbound">{formatRelative(record.last_outbound_at)}</Field>
              <Field label="Last inbound">{formatRelative(record.last_inbound_at)}</Field>
              <Field label="Replied">{formatRelative(record.replied_at)}</Field>
              {record.bounced_at ? <Field label="Bounced">{formatRelative(record.bounced_at)}</Field> : null}
              {record.unsubscribed_at ? <Field label="Unsubscribed">{formatRelative(record.unsubscribed_at)}</Field> : null}
            </dl>
          </Section>
        </aside>
      </div>
    </div>
  );
}
