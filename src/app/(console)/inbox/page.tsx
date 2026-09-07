'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CheckCheck, Inbox, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
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

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

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
    <div className="flex h-[calc(100dvh-3rem)] flex-col md:h-screen">
      <header className="flex flex-shrink-0 flex-col gap-3 border-b border-zinc-200/80 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Inbox</h1>
            {!inbox.isLoading ? (
              <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {showHandled ? count : unhandledInView}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Inbound replies from Resend — triage here or via the inbox tools.
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Inbox filter"
          className="inline-flex self-start rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-700 dark:bg-zinc-950"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!showHandled}
            onClick={() => setShowHandled(false)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              !showHandled
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Needs attention
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={showHandled}
            onClick={() => setShowHandled(true)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              showHandled
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            All replies
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:border-b-0 lg:border-r">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {inbox.isLoading ? (
              <div className="space-y-0">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="animate-pulse border-b border-zinc-100 px-4 py-3.5 dark:border-zinc-800/80">
                    <div className="flex gap-3">
                      <div className="h-9 w-9 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                      <div className="flex-1 space-y-2 pt-0.5">
                        <div className="h-3 w-1/2 rounded bg-zinc-100 dark:bg-zinc-800" />
                        <div className="h-3 w-3/4 rounded bg-zinc-100 dark:bg-zinc-800" />
                        <div className="h-2.5 w-full rounded bg-zinc-50 dark:bg-zinc-800/60" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {!inbox.isLoading && rows.length === 0 ? (
              <div className="flex h-full min-h-[240px] flex-col items-center justify-center px-6 py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <CheckCheck className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {showHandled ? 'No replies yet' : 'Inbox zero'}
                </p>
                <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {showHandled
                    ? 'Inbound emails will land here when leads reply.'
                    : 'Everything that needed a look has been handled.'}
                </p>
              </div>
            ) : null}

            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {rows.map((email) => {
                const active = selected?.id === email.id;
                const name = displayName(email);
                const handled = Boolean(email.handled_at);
                return (
                  <li key={email.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(email.id)}
                      aria-current={active ? 'true' : undefined}
                      className={`group relative w-full px-4 py-3.5 text-left transition-colors ${
                        active
                          ? 'bg-red-50/70 dark:bg-red-950/25'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      {active ? (
                        <span className="absolute inset-y-0 left-0 w-0.5 bg-red-500" aria-hidden />
                      ) : null}
                      <div className="flex gap-3">
                        <div
                          className={`relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                            handled
                              ? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                              : 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-sm shadow-red-600/20'
                          }`}
                        >
                          {initials(name)}
                          {!handled ? (
                            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-400 dark:border-zinc-900" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span
                              className={`truncate text-[13px] ${
                                handled
                                  ? 'font-medium text-zinc-600 dark:text-zinc-300'
                                  : 'font-semibold text-zinc-900 dark:text-zinc-100'
                              }`}
                            >
                              {name}
                            </span>
                            <span className="flex-shrink-0 text-[10px] tabular-nums text-zinc-400">
                              {formatRelative(email.received_at)}
                            </span>
                          </div>
                          <div
                            className={`mt-0.5 truncate text-xs ${
                              handled
                                ? 'text-zinc-500 dark:text-zinc-400'
                                : 'font-medium text-zinc-700 dark:text-zinc-200'
                            }`}
                          >
                            {email.subject || '(no subject)'}
                          </div>
                          <div className="mt-0.5 truncate text-[11px] leading-snug text-zinc-400 dark:text-zinc-500">
                            {(email.text_body || '').replace(/\s+/g, ' ').slice(0, 100) || 'No preview'}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {email.lead?.company_name ? (
                              <span className="truncate text-[10px] text-zinc-400 dark:text-zinc-500">
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
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col bg-zinc-50/80 dark:bg-zinc-950">
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center animate-fade-in">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-400 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500">
                <Inbox className="h-7 w-7" />
              </div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Select a reply</p>
              <p className="mt-1 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
                Pick a conversation from the list to read the thread and respond.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-shrink-0 flex-col gap-3 border-b border-zinc-200/80 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between md:px-5">
                <div className="min-w-0">
                  {selected.lead ? (
                    <Link
                      href={`/leads/${selected.lead.id}`}
                      className="group inline-flex max-w-full flex-wrap items-center gap-2"
                    >
                      <span className="truncate text-sm font-semibold text-zinc-900 group-hover:underline dark:text-zinc-100">
                        {selected.lead.full_name || selected.lead.email}
                      </span>
                      {selected.lead.company_name ? (
                        <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          · {selected.lead.company_name}
                        </span>
                      ) : null}
                      <StatusBadge value={selected.lead.stage} />
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Unknown sender
                      </span>
                      <span className="truncate text-xs text-zinc-500">{selected.from_address}</span>
                    </div>
                  )}
                  <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {selected.subject || '(no subject)'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={selected.handled_at ? 'ghost' : 'outline'}
                  onClick={() => markHandled.mutate(selected)}
                  isLoading={markHandled.isPending}
                  className="self-start sm:self-auto"
                >
                  {selected.handled_at ? 'Mark unhandled' : 'Mark handled'}
                </Button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5">
                {selected.lead && thread.isLoading ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading thread…
                  </div>
                ) : (
                  <div className="animate-fade-in">
                    <ThreadView emails={selected.lead ? thread.data?.data || [selected] : [selected]} />
                  </div>
                )}
              </div>

              {selected.lead ? (
                <div className="flex-shrink-0 border-t border-zinc-200/80 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 md:p-4">
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
        </section>
      </div>
    </div>
  );
}
