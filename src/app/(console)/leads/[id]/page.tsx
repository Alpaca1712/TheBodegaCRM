'use client';

import { use, useState } from 'react';
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
import { PageFrame, PageHeader, PageSplit, PaneHeader } from '@/components/console/page-frame';
import {
  EmptyState,
  InitialsAvatar,
  MetaRow,
  Surface,
  SurfaceBody,
  SurfaceHeader,
} from '@/components/console/surface';
import { Button } from '@/components/ui/button';
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

  if (lead.isLoading) {
    return (
      <PageFrame>
        <div className="flex items-center gap-2 px-5 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading lead…
        </div>
      </PageFrame>
    );
  }
  if (lead.error || !lead.data) {
    return (
      <PageFrame>
        <p className="px-5 py-10 text-sm text-destructive">{(lead.error as Error)?.message || 'Lead not found'}</p>
      </PageFrame>
    );
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

  const stageSelect = (
    <>
      <label className="sr-only" htmlFor="lead-stage">Stage</label>
      <select
        id="lead-stage"
        value={record.stage}
        onChange={(event) => update.mutate({ stage: event.target.value as Lead['stage'] })}
        className="h-9 rounded-lg border border-border bg-muted px-3 text-sm font-medium text-foreground"
      >
        {LEAD_STAGES.map((value) => (
          <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>
        ))}
      </select>
    </>
  );

  return (
    <PageFrame>
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <InitialsAvatar name={displayName} size="lg" tone="brand" />
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="truncate">{displayName}</span>
              <StatusBadge value={record.stage} />
            </div>
          </div>
        }
        description={
          <div className="space-y-1">
            <Link
              href="/leads"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Leads
            </Link>
            <p className="truncate">{subtitle || record.email}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span>Created {formatRelative(record.created_at)}</span>
              {record.last_contacted_at ? <span>· Last contact {formatRelative(record.last_contacted_at)}</span> : null}
              {record.last_inbound_at ? <span>· Replied {formatRelative(record.last_inbound_at)}</span> : null}
            </div>
          </div>
        }
        actions={stageSelect}
      >
        {blocked ? (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>Sending is blocked — this lead unsubscribed or is marked do-not-contact.</span>
          </div>
        ) : null}
      </PageHeader>

      <PageSplit
        reverse
        sidebarWidth="360px"
        sidebar={
          <div className="space-y-4">
            <Surface>
              <SurfaceHeader title="Sequence" />
              <SurfaceBody className="space-y-3.5">
                {record.live_enrollment ? (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/sequences/${record.live_enrollment.sequence_id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {liveSequence?.name || 'Sequence'}
                      </Link>
                      <StatusBadge value={record.live_enrollment.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
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
                  </>
                ) : (
                  <>
                    <select
                      value={sequenceId}
                      onChange={(event) => setSequenceId(event.target.value)}
                      className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm"
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
                  </>
                )}
              </SurfaceBody>
            </Surface>

            <Surface>
              <SurfaceHeader
                title="Contact"
                actions={
                  <Button size="sm" variant="ghost" onClick={() => verify.mutate()} isLoading={verify.isPending}>
                    {!verify.isPending ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : null}
                    Verify
                  </Button>
                }
              />
              <SurfaceBody className="space-y-3.5">
                <MetaRow icon={Mail} label="Email">
                  <span className="flex flex-wrap items-center gap-2">
                    <a href={`mailto:${record.email}`} className="hover:underline">{record.email}</a>
                    <StatusBadge value={record.email_status} />
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
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
                          className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </MetaRow>
                ) : null}
              </SurfaceBody>
            </Surface>

            {companyBits.length ? (
              <Surface>
                <SurfaceHeader title="Company" />
                <SurfaceBody className="space-y-3.5">
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
                </SurfaceBody>
              </Surface>
            ) : null}

            <Surface>
              <SurfaceHeader
                title="Notes"
                actions={
                  notesDirty ? (
                    <Button size="sm" variant="ghost" onClick={() => update.mutate({ notes })} isLoading={update.isPending}>
                      Save
                    </Button>
                  ) : null
                }
              />
              <SurfaceBody>
                <Textarea
                  value={notes ?? record.notes ?? ''}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  placeholder="Add context for the next outreach…"
                  className="min-h-[96px] resize-none border-border bg-muted"
                />
              </SurfaceBody>
            </Surface>

            {Object.keys(record.research || {}).length ? (
              <Surface>
                <SurfaceHeader title="Research" />
                <SurfaceBody>
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-xs leading-relaxed text-foreground">
                    {JSON.stringify(record.research, null, 2)}
                  </pre>
                </SurfaceBody>
              </Surface>
            ) : null}

            <Surface>
              <SurfaceHeader title="Activity" />
              <SurfaceBody>
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
                        <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
                        <dd className="mt-0.5 text-foreground">{formatRelative(value)}</dd>
                      </div>
                    );
                  })}
                </dl>
              </SurfaceBody>
            </Surface>
          </div>
        }
      >
        <PaneHeader title="Conversation" count={emails.length} />

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {thread.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading thread…
            </div>
          ) : emails.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No emails yet"
              description="Enroll in a sequence or send a one-off email below to start the thread."
              className="min-h-[280px] py-16"
            />
          ) : (
            <div className="animate-fade-in">
              <ThreadView emails={emails} />
            </div>
          )}
        </div>

        {!blocked ? (
          <div className="flex-shrink-0 border-t border-border bg-card p-3 md:p-4">
            <ComposeReply
              embedded
              leadId={record.id}
              replyTo={lastInbound || lastAny}
            />
          </div>
        ) : null}
      </PageSplit>
    </PageFrame>
  );
}
