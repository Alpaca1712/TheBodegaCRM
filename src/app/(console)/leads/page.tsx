'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Search, Users } from 'lucide-react';
import { PageBody, PageFrame, PageHeader } from '@/components/console/page-frame';
import { EmptyState, FilterChips, InitialsAvatar, ListHeader, ListRow } from '@/components/console/surface';
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
    <PageFrame>
      <PageHeader
        title="Leads"
        count={leads.isLoading ? null : total}
        description="Review and triage. Create / enrich via API or MCP."
        actions={
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(event) => { setQ(event.target.value); setOffset(0); }}
              placeholder="Search leads…"
              className="h-9 border-border bg-background pl-9"
            />
          </div>
        }
      >
        <FilterChips
          options={STAGE_FILTERS}
          value={stage}
          onChange={(value) => { setStage(value); setOffset(0); }}
        />
      </PageHeader>

      <PageBody className="bg-card">
        <ListHeader className="grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_7.5rem_6.5rem_8.5rem_1.25rem] gap-3">
          <span>Contact</span>
          <span>Company</span>
          <span>Stage</span>
          <span>Email</span>
          <span className="text-right">Activity</span>
          <span />
        </ListHeader>

        {leads.isLoading ? (
          <div>
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex animate-pulse items-center gap-3 border-b border-border px-5 py-3.5">
                <div className="h-9 w-9 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-40 rounded bg-muted" />
                  <div className="h-2.5 w-56 rounded bg-muted/70" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {leads.error ? (
          <p className="px-6 py-16 text-center text-sm text-destructive">{(leads.error as Error).message}</p>
        ) : null}

        {!leads.isLoading && !leads.error && rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No leads match"
            description={q || stage ? 'Clear search or stage filters to see more.' : 'Create leads through the API, MCP, or landing webhook.'}
          />
        ) : null}

        {!leads.isLoading && rows.length > 0 ? (
          <ul>
            {rows.map((lead) => {
              const name = lead.full_name || lead.email;
              const secondary = lead.full_name
                ? [lead.email, lead.title].filter(Boolean).join(' · ')
                : lead.title || '';
              return (
                <li key={lead.id}>
                  <ListRow
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    className="grid grid-cols-1 items-center gap-2 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_7.5rem_6.5rem_8.5rem_1.25rem] md:gap-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <InitialsAvatar name={name} />
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold text-foreground">{name}</div>
                        <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{secondary}</div>
                      </div>
                    </div>
                    <div className="min-w-0 pl-12 md:pl-0">
                      <div className="truncate text-[13px] font-medium text-foreground">{lead.company_name || '—'}</div>
                      <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{lead.company_domain || lead.source || '—'}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pl-12 md:pl-0">
                      <StatusBadge value={lead.stage} />
                      <span className="md:hidden"><StatusBadge value={lead.email_status} /></span>
                    </div>
                    <div className="hidden md:block"><StatusBadge value={lead.email_status} /></div>
                    <div className="hidden text-right text-[12px] tabular-nums text-muted-foreground md:block">{activityLabel(lead)}</div>
                    <ChevronRight className="ml-auto hidden h-4 w-4 text-muted-foreground/40 md:block" />
                  </ListRow>
                </li>
              );
            })}
          </ul>
        ) : null}

        {total > PAGE ? (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
            <span>{offset + 1}–{Math.min(offset + PAGE, total)} of {total}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Previous</Button>
              <Button size="sm" variant="outline" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>Next</Button>
            </div>
          </div>
        ) : null}
      </PageBody>
    </PageFrame>
  );
}
