'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, Target, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { api, formatRelative, type Paginated } from '@/lib/api/client';
import { LEAD_STAGES, type Lead } from '@/types';

const PAGE = 50;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export default function LeadsPage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [stage, setStage] = useState('');
  const [offset, setOffset] = useState(0);

  const params = useMemo(() => {
    const next = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
    if (q.trim()) next.set('q', q.trim());
    if (stage) next.set('stage', stage);
    return next;
  }, [q, stage, offset]);

  const leads = useQuery({
    queryKey: ['leads', params.toString()],
    queryFn: () => api<Paginated<Lead>>(`/leads?${params}`),
  });

  const total = leads.data?.total ?? 0;
  const rows = leads.data?.data ?? [];

  return (
    <div className="-m-4 flex min-h-[calc(100dvh-3.5rem)] flex-col md:-m-6 lg:-m-8">
      <header className="flex-shrink-0 border-b border-zinc-200/80 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900 md:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Leads</h1>
              {!leads.isLoading ? (
                <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {total}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Review and triage. Create / enrich via API or MCP.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={q}
              onChange={(event) => { setQ(event.target.value); setOffset(0); }}
              placeholder="Search email, name, company…"
              className="h-9 border-zinc-200 bg-zinc-50 pl-9 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
          <select
            value={stage}
            onChange={(event) => { setStage(event.target.value); setOffset(0); }}
            className="h-9 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
          >
            <option value="">All stages</option>
            {LEAD_STAGES.map((value) => (
              <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto bg-zinc-50/60 dark:bg-zinc-950">
        {leads.isLoading ? (
          <div className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800/80 dark:bg-zinc-900">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex animate-pulse items-center gap-3 px-4 py-3.5 md:px-6">
                <div className="h-9 w-9 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-zinc-100 dark:bg-zinc-800" />
                  <div className="h-2.5 w-1/2 rounded bg-zinc-50 dark:bg-zinc-800/70" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {leads.error ? (
          <p className="px-6 py-12 text-center text-sm text-red-600">{(leads.error as Error).message}</p>
        ) : null}

        {!leads.isLoading && !leads.error && rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-400 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <Users className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No leads match</p>
            <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
              {q || stage
                ? 'Try clearing search or stage filters.'
                : 'Create leads through the API, MCP, or landing webhook.'}
            </p>
          </div>
        ) : null}

        {!leads.isLoading && rows.length > 0 ? (
          <ul className="divide-y divide-zinc-100 border-b border-zinc-200/80 bg-white dark:divide-zinc-800/80 dark:border-zinc-800 dark:bg-zinc-900">
            {rows.map((lead) => {
              const name = lead.full_name || lead.email;
              const secondary = lead.full_name ? lead.email : lead.title || '';
              return (
                <li key={lead.id}>
                  <button
                    type="button"
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40 md:px-6"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 text-[11px] font-semibold text-white shadow-sm shadow-red-600/15">
                      {initials(name)}
                    </div>
                    <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-center">
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">{name}</div>
                        <div className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {[secondary, lead.title && lead.full_name ? lead.title : null].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] text-zinc-800 dark:text-zinc-200">
                          {lead.company_name || '—'}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-zinc-400">
                          {lead.company_domain || lead.source || ''}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <StatusBadge value={lead.stage} />
                        <StatusBadge value={lead.email_status} />
                        <span className="hidden text-[11px] tabular-nums text-zinc-400 lg:inline">
                          {lead.last_inbound_at
                            ? `replied ${formatRelative(lead.last_inbound_at)}`
                            : lead.last_contacted_at
                              ? `contacted ${formatRelative(lead.last_contacted_at)}`
                              : `added ${formatRelative(lead.created_at)}`}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        {total > PAGE ? (
          <div className="flex items-center justify-between px-4 py-3 text-xs text-zinc-500 md:px-6">
            <span className="inline-flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              {offset + 1}–{Math.min(offset + PAGE, total)} of {total}
            </span>
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
