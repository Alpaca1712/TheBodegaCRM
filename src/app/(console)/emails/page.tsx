'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Mail } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { api, formatRelative, type Paginated } from '@/lib/api/client';
import type { Email } from '@/types';

type Row = Email & { lead: { id: string; email: string; full_name: string | null; company_name: string | null } | null };
const PAGE = 50;
const STATUSES = ['queued', 'sent', 'delivered', 'delivery_delayed', 'bounced', 'complained', 'failed', 'suppressed', 'received'];

export default function EmailsPage() {
  const [direction, setDirection] = useState('');
  const [status, setStatus] = useState('');
  const [offset, setOffset] = useState(0);

  const params = useMemo(() => {
    const next = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
    if (direction) next.set('direction', direction);
    if (status) next.set('status', status);
    return next;
  }, [direction, status, offset]);

  const emails = useQuery({ queryKey: ['emails', params.toString()], queryFn: () => api<Paginated<Row>>(`/emails?${params}`) });
  const total = emails.data?.total ?? 0;
  const rows = emails.data?.data ?? [];

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col md:min-h-screen">
      <header className="flex-shrink-0 border-b border-zinc-200/80 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900 md:px-6">
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Emails</h1>
          {!emails.isLoading ? (
            <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {total}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Delivery log for everything sent and received through Resend.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <div
            role="tablist"
            aria-label="Direction"
            className="inline-flex self-start rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-700 dark:bg-zinc-950"
          >
            {[
              ['', 'Both'],
              ['outbound', 'Outbound'],
              ['inbound', 'Inbound'],
            ].map(([value, label]) => (
              <button
                key={value || 'both'}
                type="button"
                role="tab"
                aria-selected={direction === value}
                onClick={() => { setDirection(value); setOffset(0); }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  direction === value
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <select
            value={status}
            onChange={(event) => { setStatus(event.target.value); setOffset(0); }}
            className="h-9 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
          >
            <option value="">All statuses</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto bg-zinc-50/60 dark:bg-zinc-950">
        {emails.isLoading ? (
          <div className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800/80 dark:bg-zinc-900">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex animate-pulse items-center gap-3 px-4 py-3.5 md:px-6">
                <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-zinc-100 dark:bg-zinc-800" />
                  <div className="h-2.5 w-1/2 rounded bg-zinc-50 dark:bg-zinc-800/70" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!emails.isLoading && rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-400 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <Mail className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nothing yet</p>
            <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
              Sent and received mail will show up here as Resend events arrive.
            </p>
          </div>
        ) : null}

        {rows.length > 0 ? (
          <ul className="divide-y divide-zinc-100 border-b border-zinc-200/80 bg-white dark:divide-zinc-800/80 dark:border-zinc-800 dark:bg-zinc-900">
            {rows.map((email) => {
              const inbound = email.direction === 'inbound';
              const when = email.sent_at || email.received_at || email.created_at;
              return (
                <li key={email.id} className="px-4 py-3.5 md:px-6">
                  <div className="flex gap-3">
                    <div
                      className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                        inbound
                          ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}
                    >
                      {inbound ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                    </div>
                    <div className="grid min-w-0 flex-1 gap-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_auto] lg:items-center">
                      <div className="min-w-0">
                        {email.lead ? (
                          <Link href={`/leads/${email.lead.id}`} className="group block">
                            <div className="truncate text-[13px] font-semibold text-zinc-900 group-hover:underline dark:text-zinc-100">
                              {email.lead.full_name || email.lead.email}
                            </div>
                            <div className="mt-0.5 truncate text-xs text-zinc-500">
                              {email.lead.company_name || email.lead.email}
                            </div>
                          </Link>
                        ) : (
                          <div className="truncate text-xs text-zinc-500">
                            {inbound ? email.from_address : email.to_addresses.join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium text-zinc-800 dark:text-zinc-200">
                          {email.subject || '(no subject)'}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                          <span>{formatRelative(when)}</span>
                          <span>· {email.source}</span>
                          {email.opened_at ? <span>· opened {formatRelative(email.opened_at)}</span> : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <StatusBadge value={email.status} />
                        {email.bounce_reason ? (
                          <span className="max-w-[200px] truncate text-[11px] text-red-600" title={email.bounce_reason}>
                            {email.bounce_reason}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {total > PAGE ? (
          <div className="flex items-center justify-between px-4 py-3 text-xs text-zinc-500 md:px-6">
            <span>{offset + 1}–{Math.min(offset + PAGE, total)} of {total}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
                Previous
              </Button>
              <Button size="sm" variant="outline" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
