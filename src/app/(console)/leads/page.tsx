'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Search, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { PageBody, PageFrame, PageHeader } from '@/components/console/page-frame';
import { EmptyState, FilterChips, InitialsAvatar, ListHeader, ListRow } from '@/components/console/surface';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { api, apiJson, formatRelative, type Paginated } from '@/lib/api/client';
import { parseLeadQualification } from '@/lib/leads/qualification';
import { LEAD_STAGES, type Lead } from '@/types';

const PAGE = 50;
const STAGE_FILTERS = [
  { value: '', label: 'All stages' },
  ...LEAD_STAGES.map((value) => ({ value, label: value.replace(/_/g, ' ') })),
];
const CHANNEL_FILTERS = [
  { value: '', label: 'All' },
  { value: 'web_inbound', label: 'Web' },
  { value: 'cold_email', label: 'Cold' },
];

function activityLabel(lead: Lead) {
  if (lead.last_inbound_at) return `Replied ${formatRelative(lead.last_inbound_at)}`;
  if (lead.last_contacted_at) return `Contacted ${formatRelative(lead.last_contacted_at)}`;
  return `Added ${formatRelative(lead.created_at)}`;
}

function channelLabel(lead: Lead) {
  const source = (lead.source || '').toLowerCase();
  const tags = lead.tags || [];
  if (
    tags.includes('web_inbound') ||
    source === 'landing' ||
    source === 'web_inbound' ||
    source.startsWith('landing:') ||
    source.startsWith('pigeonlabs_')
  ) {
    return 'Web inbound';
  }
  return 'Cold email';
}

function sourceLabel(lead: Lead) {
  if (!lead.source) return channelLabel(lead);
  if (lead.source.startsWith('landing:')) return lead.source.replace('landing:', 'landing / ');
  if (lead.source.startsWith('pigeonlabs_')) return lead.source.replace(/_/g, ' ');
  return lead.source;
}

export default function LeadsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [stage, setStage] = useState('');
  const [channel, setChannel] = useState('');
  const [offset, setOffset] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const params = useMemo(() => {
    const next = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
    if (q.trim()) next.set('q', q.trim());
    if (stage) next.set('stage', stage);
    if (channel) next.set('channel', channel);
    return next;
  }, [q, stage, channel, offset]);

  const leads = useQuery({
    queryKey: ['leads', params.toString()],
    queryFn: () => api<Paginated<Lead>>(`/leads?${params}`),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiJson<{ data: { deleted: string } }>(`/leads/${id}`, 'DELETE'),
    onSuccess: () => {
      toast.success('Lead deleted');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Delete failed'),
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
        <div className="flex items-center gap-3 overflow-x-auto">
          <FilterChips
            options={CHANNEL_FILTERS}
            value={channel}
            onChange={(value) => { setChannel(value); setOffset(0); }}
          />
          <span className="h-5 w-px shrink-0 bg-border" aria-hidden />
          <FilterChips
            options={STAGE_FILTERS}
            value={stage}
            onChange={(value) => { setStage(value); setOffset(0); }}
          />
        </div>
      </PageHeader>

      <PageBody className="bg-card">
        <ListHeader className="grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_7rem_7.5rem_6.5rem_8rem_4.5rem] gap-3">
          <span>Contact</span>
          <span>Company</span>
          <span>Channel</span>
          <span>Stage</span>
          <span>Email</span>
          <span className="text-right">Activity</span>
          <span className="text-right">Actions</span>
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
            description={q || stage || channel ? 'Clear search or filters to see more.' : 'Create leads through the API, MCP, or landing webhook.'}
          />
        ) : null}

        {!leads.isLoading && rows.length > 0 ? (
          <ul>
            {rows.map((lead) => {
              const name = lead.full_name || lead.email;
              const secondary = lead.full_name
                ? [lead.email, lead.title].filter(Boolean).join(' · ')
                : lead.title || '';
              const qualification = parseLeadQualification(lead);
              const expanded = expandedId === lead.id;
              return (
                <li key={lead.id} className="border-b border-border">
                  <ListRow
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    className="grid grid-cols-1 items-center gap-2 border-b-0 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_7rem_7.5rem_6.5rem_8rem_4.5rem] md:gap-3"
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
                      <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{lead.company_domain || '—'}</div>
                    </div>
                    <div className="min-w-0 pl-12 md:pl-0">
                      <div className="truncate text-[12px] font-medium text-foreground">{channelLabel(lead)}</div>
                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{sourceLabel(lead)}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pl-12 md:pl-0">
                      <StatusBadge value={lead.stage} />
                      <span className="md:hidden"><StatusBadge value={lead.email_status} /></span>
                    </div>
                    <div className="hidden md:block"><StatusBadge value={lead.email_status} /></div>
                    <div className="hidden text-right text-[12px] tabular-nums text-muted-foreground md:block">{activityLabel(lead)}</div>
                    <div className="flex items-center justify-end gap-1 pl-12 md:pl-0">
                      {qualification ? (
                        <button
                          type="button"
                          aria-label={expanded ? 'Collapse qualification' : 'Expand qualification'}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={(event) => {
                            event.stopPropagation();
                            setExpandedId(expanded ? null : lead.id);
                          }}
                        >
                          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      ) : (
                        <span className="inline-flex h-8 w-8" />
                      )}
                      <button
                        type="button"
                        aria-label={`Delete ${name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
                          remove.mutate(lead.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </ListRow>
                  {expanded && qualification ? (
                    <div className="bg-muted/40 px-5 py-3 text-sm">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {qualification.score != null ? (
                          <span className="rounded-md bg-background px-2 py-1 text-xs font-semibold tabular-nums">
                            {qualification.score}/100
                            {qualification.scoreLabel ? ` · ${qualification.scoreLabel}` : ''}
                          </span>
                        ) : null}
                        {qualification.qualified === true ? (
                          <span className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white">Qualified</span>
                        ) : null}
                        {qualification.qualified === false ? (
                          <span className="rounded-md bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground">
                            {qualification.outcome || 'Not qualified'}
                          </span>
                        ) : null}
                      </div>
                      {qualification.summaryLine ? (
                        <p className="mb-2 text-[13px] text-foreground">{qualification.summaryLine}</p>
                      ) : null}
                      {qualification.answers.length ? (
                        <dl className="grid gap-2 sm:grid-cols-2">
                          {qualification.answers.map((answer) => (
                            <div key={`${lead.id}-${answer.id}-${answer.value}`}>
                              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {answer.id.replace(/_/g, ' ')}
                              </dt>
                              <dd className="mt-0.5 text-[13px] text-foreground">{answer.value}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <p className="text-xs text-muted-foreground">Open the lead for full qualification detail.</p>
                      )}
                    </div>
                  ) : null}
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
