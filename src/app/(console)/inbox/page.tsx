'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CheckCheck, Inbox, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { PageBody, PageFrame, PageHeader, PageSplit, PaneHeader } from '@/components/console/page-frame';
import { EmptyState, FilterChips, InitialsAvatar, ListRow } from '@/components/console/surface';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { ThreadView } from '@/components/email/thread-view';
import { ComposeReply } from '@/components/email/compose-reply';
import { api, apiJson, formatRelative, type Paginated } from '@/lib/api/client';
import type { Email } from '@/types';

type InboxRow = Email & {
  lead: {
    id: string;
    email: string;
    full_name: string | null;
    company_name: string | null;
    stage: string;
  } | null;
};

const INBOX_FILTERS = [
  { value: 'false', label: 'Needs attention' },
  { value: 'true', label: 'All replies' },
];

function displayName(email: InboxRow) {
  return email.lead?.full_name || email.from_address;
}

export default function InboxPage() {
  const queryClient = useQueryClient();
  const [showHandled, setShowHandled] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const inbox = useQuery({
    queryKey: ['inbox', showHandled],
    queryFn: () => api<Paginated<InboxRow>>(`/inbox?unhandled_only=${showHandled ? 'false' : 'true'}&limit=100`),
    refetchInterval: 60_000,
  });

  const rows = useMemo(() => inbox.data?.data ?? [], [inbox.data?.data]);
  const selected = rows.find((email) => email.id === selectedId) || rows[0] || null;

  useEffect(() => {
    if (!selectedId && rows[0]) setSelectedId(rows[0].id);
    if (selectedId && rows.length > 0 && !rows.some((email) => email.id === selectedId)) {
      setSelectedId(rows[0]?.id ?? null);
    }
  }, [rows, selectedId]);

  const thread = useQuery({
    queryKey: ['lead-thread', selected?.lead?.id],
    queryFn: () => api<{ data: Email[] }>(`/leads/${selected!.lead!.id}/emails`),
    enabled: Boolean(selected?.lead?.id),
  });

  const markHandled = useMutation({
    mutationFn: (email: Email) => apiJson(`/emails/${email.id}`, 'PATCH', { handled: !email.handled_at }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed'),
  });

  const count = inbox.data?.total ?? rows.length;
  const unhandledInView = rows.filter((email) => !email.handled_at).length;

  return (
    <PageFrame>
      <PageHeader
        title="Inbox"
        count={inbox.isLoading ? null : showHandled ? count : unhandledInView}
        description="Inbound replies from Resend — triage here or via the inbox tools."
      >
        <FilterChips
          options={INBOX_FILTERS}
          value={String(showHandled)}
          onChange={(value) => setShowHandled(value === 'true')}
        />
      </PageHeader>

      <PageSplit sidebarWidth="380px" sidebar={
        <div className="min-h-0 flex-1 overflow-y-auto">
          {inbox.isLoading ? (
            <div>
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex animate-pulse gap-3 border-b border-border px-5 py-3.5">
                  <div className="h-9 w-9 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2 pt-0.5">
                    <div className="h-3 w-1/2 rounded bg-muted" />
                    <div className="h-3 w-3/4 rounded bg-muted" />
                    <div className="h-2.5 w-full rounded bg-muted/70" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {!inbox.isLoading && rows.length === 0 ? (
            <EmptyState
              icon={CheckCheck}
              title={showHandled ? 'No replies yet' : 'Inbox zero'}
              description={
                showHandled
                  ? 'Inbound emails will land here when leads reply.'
                  : 'Everything that needed a look has been handled.'
              }
              className="min-h-[240px] py-12"
            />
          ) : null}

          {!inbox.isLoading && rows.length > 0 ? (
            <ul>
              {rows.map((email) => {
                const active = selected?.id === email.id;
                const name = displayName(email);
                const handled = Boolean(email.handled_at);
                return (
                  <li key={email.id}>
                    <ListRow active={active} onClick={() => setSelectedId(email.id)}>
                      <div className="flex gap-3">
                        <div className="relative flex-shrink-0">
                          <InitialsAvatar
                            name={name}
                            tone={handled ? 'neutral' : 'brand'}
                            className={handled ? 'bg-muted text-muted-foreground dark:bg-muted' : undefined}
                          />
                          {!handled ? (
                            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-amber-400" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span
                              className={`truncate text-[13px] ${
                                handled
                                  ? 'font-medium text-muted-foreground'
                                  : 'font-semibold text-foreground'
                              }`}
                            >
                              {name}
                            </span>
                            <span className="flex-shrink-0 text-[10px] tabular-nums text-muted-foreground">
                              {formatRelative(email.received_at)}
                            </span>
                          </div>
                          <div
                            className={`mt-0.5 truncate text-xs ${
                              handled ? 'text-muted-foreground' : 'font-medium text-foreground'
                            }`}
                          >
                            {email.subject || '(no subject)'}
                          </div>
                          <div className="mt-0.5 truncate text-[11px] leading-snug text-muted-foreground">
                            {(email.text_body || '').replace(/\s+/g, ' ').slice(0, 100) || 'No preview'}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {email.lead?.company_name ? (
                              <span className="truncate text-[10px] text-muted-foreground">
                                {email.lead.company_name}
                              </span>
                            ) : null}
                            {handled ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                <Check className="h-3 w-3" /> handled
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </ListRow>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      }>
        {!selected ? (
          <EmptyState
            icon={Inbox}
            title="Select a reply"
            description="Pick a conversation from the list to read the thread and respond."
          />
        ) : (
          <>
            <PaneHeader
              title={
                <div className="min-w-0">
                  {selected.lead ? (
                    <Link
                      href={`/leads/${selected.lead.id}`}
                      className="group inline-flex max-w-full flex-wrap items-center gap-2"
                    >
                      <span className="truncate text-sm font-semibold text-foreground group-hover:underline">
                        {selected.lead.full_name || selected.lead.email}
                      </span>
                      {selected.lead.company_name ? (
                        <span className="truncate text-xs text-muted-foreground">
                          · {selected.lead.company_name}
                        </span>
                      ) : null}
                      <StatusBadge value={selected.lead.stage} />
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">Unknown sender</span>
                      <span className="truncate text-xs text-muted-foreground">{selected.from_address}</span>
                    </div>
                  )}
                  <p className="mt-1 truncate text-xs font-normal text-muted-foreground">
                    {selected.subject || '(no subject)'}
                  </p>
                </div>
              }
              actions={
                <Button
                  size="sm"
                  variant={selected.handled_at ? 'ghost' : 'outline'}
                  onClick={() => markHandled.mutate(selected)}
                  isLoading={markHandled.isPending}
                  className="self-start sm:self-auto"
                >
                  {selected.handled_at ? 'Mark unhandled' : 'Mark handled'}
                </Button>
              }
              className="items-start gap-3 sm:items-center"
            />

            <PageBody className="px-5 py-4">
              {selected.lead && thread.isLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading thread…
                </div>
              ) : (
                <div className="animate-fade-in">
                  <ThreadView emails={selected.lead ? thread.data?.data || [selected] : [selected]} />
                </div>
              )}
            </PageBody>

            {selected.lead ? (
              <div className="flex-shrink-0 border-t border-border bg-card p-3 md:p-4">
                <ComposeReply
                  embedded
                  leadId={selected.lead.id}
                  replyTo={selected}
                  onSent={() => queryClient.invalidateQueries({ queryKey: ['inbox'] })}
                />
              </div>
            ) : null}
          </>
        )}
      </PageSplit>
    </PageFrame>
  );
}
