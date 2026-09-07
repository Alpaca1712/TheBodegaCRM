'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader, Section } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { ThreadView } from '@/components/email/thread-view';
import { ComposeReply } from '@/components/email/compose-reply';
import { api, apiJson, formatRelative, type Paginated } from '@/lib/api/client';
import type { Email } from '@/types';

type InboxRow = Email & { lead: { id: string; email: string; full_name: string | null; company_name: string | null; stage: string } | null };

export default function InboxPage() {
  const queryClient = useQueryClient();
  const [showHandled, setShowHandled] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const inbox = useQuery({
    queryKey: ['inbox', showHandled],
    queryFn: () => api<Paginated<InboxRow>>(`/inbox?unhandled_only=${showHandled ? 'false' : 'true'}&limit=100`),
    refetchInterval: 60_000,
  });
  const selected = inbox.data?.data.find((email) => email.id === selectedId) || inbox.data?.data[0] || null;
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

  return (
    <div>
      <PageHeader
        title="Inbox"
        description="Replies received through Resend. Handle them here or from Claude with the inbox tools."
        actions={<label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400"><input type="checkbox" checked={showHandled} onChange={(event) => setShowHandled(event.target.checked)} /> Show handled</label>}
      />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="max-h-[75vh] overflow-y-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {inbox.isLoading ? <p className="p-4 text-sm text-zinc-400">Loading…</p> : null}
          {inbox.data && inbox.data.data.length === 0 ? <p className="p-8 text-center text-sm text-zinc-400">Inbox zero.</p> : null}
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {inbox.data?.data.map((email) => (
              <li key={email.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(email.id)}
                  className={`w-full px-4 py-3 text-left transition-colors ${selected?.id === email.id ? 'bg-red-50/60 dark:bg-red-950/20' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{email.lead?.full_name || email.from_address}</span>
                    <span className="flex-shrink-0 text-[11px] text-zinc-400">{formatRelative(email.received_at)}</span>
                  </div>
                  <div className="truncate text-xs text-zinc-600 dark:text-zinc-300">{email.subject || '(no subject)'}</div>
                  <div className="mt-0.5 truncate text-xs text-zinc-400">{(email.text_body || '').replace(/\s+/g, ' ').slice(0, 90)}</div>
                  {email.handled_at ? <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-600"><Check className="h-3 w-3" /> handled</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          {!selected ? <p className="text-sm text-zinc-400">Select a reply.</p> : (
            <>
              <Section
                title={selected.lead ? (
                  <Link href={`/leads/${selected.lead.id}`} className="hover:underline">
                    {selected.lead.full_name || selected.lead.email}{selected.lead.company_name ? ` · ${selected.lead.company_name}` : ''} <StatusBadge value={selected.lead.stage} className="ml-1" />
                  </Link>
                ) : `Unknown sender ${selected.from_address}`}
                actions={<Button size="sm" variant={selected.handled_at ? 'ghost' : 'outline'} onClick={() => markHandled.mutate(selected)} isLoading={markHandled.isPending}>{selected.handled_at ? 'Mark unhandled' : 'Mark handled'}</Button>}
              >
                {selected.lead ? <ThreadView emails={thread.data?.data || [selected]} /> : <ThreadView emails={[selected]} />}
              </Section>
              {selected.lead ? <ComposeReply leadId={selected.lead.id} replyTo={selected} onSent={() => queryClient.invalidateQueries({ queryKey: ['inbox'] })} /> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
