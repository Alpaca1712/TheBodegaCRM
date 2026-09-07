'use client';

import { use, useState, type ComponentType, type ReactNode } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  Mail,
  Phone,
  Send,
  ShieldAlert,
  Tag,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';
import { ThreadView } from '@/components/email/thread-view';
import { ComposeReply } from '@/components/email/compose-reply';
import { api, apiJson, formatRelative } from '@/lib/api/client';
import { LEAD_STAGES, type Email, type Lead, type Sequence, type SequenceEnrollment } from '@/types';

type LeadDetail = Lead & { live_enrollment: SequenceEnrollment | null };

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function MetaRow({
  icon: Icon,
  label,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  children: ReactNode;
}) {
  if (children == null || children === '' || children === false) return null;
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{label}</p>
        <div className="mt-0.5 break-words text-sm text-zinc-800 dark:text-zinc-200">{children}</div>
      </div>
    </div>
  );
}

function SideCard({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm shadow-zinc-950/[0.02] dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
        <h2 className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">{title}</h2>
        {actions}
      </header>
      <div className="space-y-3.5 p-4">{children}</div>
    </section>
  );
}

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

  if (lead.isLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading lead…
      </div>
    );
  }
  if (lead.error || !lead.data) {
    return <p className="py-10 text-sm text-red-600">{(lead.error as Error)?.message || 'Lead not found'}</p>;
  }

  const record = lead.data.data;
  const emails = thread.data?.data || [];
  const lastInbound = [...emails].reverse().find((email) => email.direction === 'inbound') || null;
  const lastAny = emails.length ? emails[emails.length - 1] : null;
  const liveSequence = record.live_enrollment
    ? sequences.data?.data.find((sequence) => sequence.id === record.live_enrollment?.sequence_id)
    : null;
  const displayName = record.full_name || record.email;
  const subtitle = [record.title, record.company_name].filter(Boolean).join(' · ');
  const blocked = Boolean(record.do_not_contact || record.unsubscribed_at);
  const notesDirty = notes !== null && notes !== (record.notes || '');
  const companyBits = [
    record.company_name,
    record.company_domain,
    record.company_industry,
    record.company_size,
    record.company_location,
    record.company_description,
  ].filter(Boolean);

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col md:min-h-screen">
      <header className="flex-shrink-0 border-b border-zinc-200/80 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900 md:px-6">
        <Link
          href="/leads"
          className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Leads
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-sm font-bold text-white shadow-sm shadow-red-600/25">
              {initials(displayName)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {displayName}
                </h1>
                <StatusBadge value={record.stage} />
              </div>
              <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
                {subtitle || record.email}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-400">
                <span>Created {formatRelative(record.created_at)}</span>
                {record.last_contacted_at ? <span>· Last contact {formatRelative(record.last_contacted_at)}</span> : null}
                {record.last_inbound_at ? <span>· Replied {formatRelative(record.last_inbound_at)}</span> : null}
              </div>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2 self-start">
            <label className="sr-only" htmlFor="lead-stage">Stage</label>
            <select
              id="lead-stage"
              value={record.stage}
              onChange={(event) => update.mutate({ stage: event.target.value as Lead['stage'] })}
              className="h-9 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
            >
              {LEAD_STAGES.map((value) => (
                <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        {blocked ? (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>Sending is blocked — this lead unsubscribed or is marked do-not-contact.</span>
          </div>
        ) : null}
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex min-h-0 flex-col border-b border-zinc-200/80 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-950 lg:border-b-0 lg:border-r">
          <div className="flex flex-shrink-0 items-center justify-between border-b border-zinc-200/80 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900 md:px-5">
            <h2 className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">
              Conversation
              <span className="ml-2 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {emails.length}
              </span>
            </h2>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5">
            {thread.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading thread…
              </div>
            ) : emails.length === 0 ? (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-6 text-center animate-fade-in">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-400 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <Mail className="h-7 w-7" />
                </div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No emails yet</p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Enroll in a sequence or send a one-off email below to start the thread.
                </p>
              </div>
            ) : (
              <div className="animate-fade-in">
                <ThreadView emails={emails} />
              </div>
            )}
          </div>

          {!blocked ? (
            <div className="flex-shrink-0 border-t border-zinc-200/80 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 md:p-4">
              <ComposeReply
                embedded
                leadId={record.id}
                replyTo={lastInbound || lastAny}
              />
            </div>
          ) : null}
        </section>

        <aside className="space-y-4 overflow-y-auto bg-zinc-50/50 p-4 dark:bg-zinc-950 md:p-5">
          <SideCard title="Sequence">
            {record.live_enrollment ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/sequences/${record.live_enrollment.sequence_id}`}
                    className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                  >
                    {liveSequence?.name || 'Sequence'}
                  </Link>
                  <StatusBadge value={record.live_enrollment.status} />
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {record.live_enrollment.steps_sent} step{record.live_enrollment.steps_sent === 1 ? '' : 's'} sent
                  · next {formatRelative(record.live_enrollment.next_step_due_at)}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exitEnrollment.mutate(record.live_enrollment!)}
                  isLoading={exitEnrollment.isPending}
                >
                  Remove from sequence
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <select
                  value={sequenceId}
                  onChange={(event) => setSequenceId(event.target.value)}
                  className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                >
                  <option value="">Choose a sequence…</option>
                  {sequences.data?.data.filter((sequence) => sequence.status !== 'archived').map((sequence) => (
                    <option key={sequence.id} value={sequence.id}>
                      {sequence.name} ({sequence.status})
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  className="w-full"
                  disabled={!sequenceId}
                  isLoading={enroll.isPending}
                  onClick={() => enroll.mutate()}
                >
                  {!enroll.isPending ? <Send className="mr-1.5 h-3.5 w-3.5" /> : null}
                  Enroll
                </Button>
              </div>
            )}
          </SideCard>

          <SideCard
            title="Contact"
            actions={
              <Button size="sm" variant="ghost" onClick={() => verify.mutate()} isLoading={verify.isPending}>
                {!verify.isPending ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : null}
                Verify
              </Button>
            }
          >
            <MetaRow icon={Mail} label="Email">
              <span className="flex flex-wrap items-center gap-2">
                <a href={`mailto:${record.email}`} className="hover:underline">{record.email}</a>
                <StatusBadge value={record.email_status} />
                <button
                  type="button"
                  className="rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  aria-label="Copy email"
                  onClick={async () => {
                    await navigator.clipboard.writeText(record.email);
                    toast.success('Email copied');
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </span>
            </MetaRow>
            <MetaRow icon={UserRound} label="Title">{record.title}</MetaRow>
            <MetaRow icon={Link2} label="LinkedIn">
              {record.linkedin_url ? (
                <a
                  href={record.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-red-600 hover:underline dark:text-red-400"
                >
                  Profile <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
            </MetaRow>
            <MetaRow icon={Phone} label="Phone">{record.phone}</MetaRow>
            <MetaRow icon={Tag} label="Source">{record.source}</MetaRow>
            {record.tags.length ? (
              <MetaRow icon={Tag} label="Tags">
                <div className="flex flex-wrap gap-1.5">
                  {record.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </MetaRow>
            ) : null}
          </SideCard>

          {companyBits.length ? (
            <SideCard title="Company">
              <MetaRow icon={Building2} label="Name">{record.company_name}</MetaRow>
              <MetaRow icon={Link2} label="Domain">
                {record.company_domain ? (
                  <a
                    href={`https://${record.company_domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {record.company_domain}
                  </a>
                ) : null}
              </MetaRow>
              <MetaRow icon={Building2} label="Industry">{record.company_industry}</MetaRow>
              <MetaRow icon={Building2} label="Size">{record.company_size}</MetaRow>
              <MetaRow icon={Building2} label="Location">{record.company_location}</MetaRow>
              <MetaRow icon={Building2} label="Description">{record.company_description}</MetaRow>
            </SideCard>
          ) : null}

          <SideCard
            title="Notes"
            actions={
              notesDirty ? (
                <Button size="sm" variant="ghost" onClick={() => update.mutate({ notes })} isLoading={update.isPending}>
                  Save
                </Button>
              ) : null
            }
          >
            <Textarea
              value={notes ?? record.notes ?? ''}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Add context for the next outreach…"
              className="min-h-[96px] resize-none border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </SideCard>

          {Object.keys(record.research || {}).length ? (
            <SideCard title="Research">
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                {JSON.stringify(record.research, null, 2)}
              </pre>
            </SideCard>
          ) : null}

          <SideCard title="Activity">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Created', record.created_at],
                ['Last outbound', record.last_outbound_at],
                ['Last inbound', record.last_inbound_at],
                ['Replied', record.replied_at],
                record.bounced_at ? ['Bounced', record.bounced_at] as const : null,
                record.unsubscribed_at ? ['Unsubscribed', record.unsubscribed_at] as const : null,
              ].filter(Boolean).map((row) => {
                const [label, value] = row as [string, string | null];
                return (
                  <div key={label}>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{label}</dt>
                    <dd className="mt-0.5 text-zinc-700 dark:text-zinc-300">{formatRelative(value)}</dd>
                  </div>
                );
              })}
            </dl>
          </SideCard>
        </aside>
      </div>
    </div>
  );
}
