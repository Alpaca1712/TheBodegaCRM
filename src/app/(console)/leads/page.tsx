'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { api, formatRelative, type Paginated } from '@/lib/api/client';
import { LEAD_STAGES, type Lead } from '@/types';

const PAGE = 50;

const STAGE_FILTERS = [
  { value: '', label: 'All' },
  ...LEAD_STAGES.map((value) => ({ value, label: value.replace(/_/g, ' ') })),
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function activityLabel(lead: Lead) {
  if (lead.last_inbound_at) return `Replied ${formatRelative(lead.last_inbound_at)}`;
  if (lead.last_contacted_at) return `Contacted ${formatRelative(lead.last_contacted_at)}`;
  return `Added ${formatRelative(lead.created_at)}`;
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
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col p-3 md:min-h-screen md:p-5 lg:p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Leads</h1>
              {!leads.isLoading ? (
                <span className="text-sm tabular-nums text-zinc-400">{total}</span>
              ) : null}
            </div>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setOffset(0);
              }}
              placeholder="Search leads…"
              className="h-9 border-zinc-200/80 bg-white pl-9 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        </div>

        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
          {STAGE_FILTERS.map((filter) => {
            const active = stage === filter.value;
            return (
              <button
                key={filter.value || 'all'}
                type="button"
                onClick={() => {
                  setStage(filter.value);
                  setOffset(0);
                }}
                className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'bg-white text-zinc-600 ring-1 ring-zinc-200/80 hover:bg-zinc-50 hover:text-zinc-900 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm shadow-zinc-950/[0.03] dark:border-zinc-800 dark:bg-zinc-900">
          <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_7.5rem_6.5rem_8.5rem_1.25rem] gap-3 border-b border-zinc-100 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:border-zinc-800 md:grid lg:px-5">
            <span>Contact</span>
            <span>Company</span>
            <span>Stage</span>
            <span>Email</span>
            <span className="text-right">Activity</span>
            <span />
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {leads.isLoading ? (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="flex animate-pulse items-center gap-3 px-4 py-3.5 lg:px-5">
                    <div className="h-9 w-9 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-40 rounded bg-zinc-100 dark:bg-zinc-800" />
                      <div className="h-2.5 w-56 rounded bg-zinc-50 dark:bg-zinc-800/70" />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {leads.error ? (
              <p className="px-6 py-16 text-center text-sm text-red-600">{(leads.error as Error).message}</p>
            ) : null}

            {!leads.isLoading && !leads.error && rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
                  <Users className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">No leads match</p>
                <p className="mt-1 max-w-sm text-sm text-zinc-500">
                  {q || stage
                    ? 'Clear search or stage filters to see more.'
                    : 'Create leads through the API, MCP, or landing webhook.'}
                </p>
              </div>
            ) : null}

            {!leads.isLoading && rows.length > 0 ? (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/90">
                {rows.map((lead) => {
                  const name = lead.full_name || lead.email;
                  const secondary = lead.full_name
                    ? [lead.email, lead.title].filter(Boolean).join(' · ')
                    : lead.title || '';
                  return (
                    <li key={lead.id}>
                      <button
                        type="button"
                        onClick={() => router.push(`/leads/${lead.id}`)}
                        className="group grid w-full grid-cols-1 items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-zinc-50/90 dark:hover:bg-zinc-800/40 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_7.5rem_6.5rem_8.5rem_1.25rem] md:gap-3 lg:px-5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                            {initials(name)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
                              {name}
                            </div>
                            <div className="mt-0.5 truncate text-[12px] text-zinc-500 dark:text-zinc-400">
                              {secondary}
                            </div>
                          </div>
                        </div>

                        <div className="min-w-0 pl-12 md:pl-0">
                          <div className="truncate text-[13px] font-medium text-zinc-800 dark:text-zinc-200">
                            {lead.company_name || '—'}
                          </div>
                          <div className="mt-0.5 truncate text-[12px] text-zinc-500">
                            {lead.company_domain || lead.source || '—'}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pl-12 md:pl-0">
                          <StatusBadge value={lead.stage} />
                          <span className="md:hidden"><StatusBadge value={lead.email_status} /></span>
                        </div>

                        <div className="hidden md:block">
                          <StatusBadge value={lead.email_status} />
                        </div>

                        <div className="hidden text-right text-[12px] tabular-nums text-zinc-500 md:block">
                          {activityLabel(lead)}
                        </div>

                        <ChevronRight className="ml-auto hidden h-4 w-4 text-zinc-300 transition-colors group-hover:text-zinc-500 md:block dark:text-zinc-600" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          {total > PAGE ? (
            <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800 lg:px-5">
              <span>
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
    </div>
  );
}
