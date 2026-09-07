'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyRow, TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { api, formatRelative, type Paginated } from '@/lib/api/client';
import { LEAD_STAGES, type Lead } from '@/types';

const PAGE = 50;

export default function LeadsPage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [stage, setStage] = useState('');
  const [offset, setOffset] = useState(0);

  const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
  if (q.trim()) params.set('q', q.trim());
  if (stage) params.set('stage', stage);

  const leads = useQuery({
    queryKey: ['leads', params.toString()],
    queryFn: () => api<Paginated<Lead>>(`/leads?${params}`),
  });

  const total = leads.data?.total ?? 0;

  return (
    <div>
      <PageHeader
        title="Leads"
        description={`${total} lead${total === 1 ? '' : 's'}. Create and enrich leads through the API or MCP; this view is for reviewing.`}
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input value={q} onChange={(event) => { setQ(event.target.value); setOffset(0); }} placeholder="Search email, name, company…" className="h-9 pl-9" />
        </div>
        <select
          value={stage}
          onChange={(event) => { setStage(event.target.value); setOffset(0); }}
          className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        >
          <option value="">All stages</option>
          {LEAD_STAGES.map((value) => <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <Table>
        <THead>
          <tr>
            <TH>Contact</TH>
            <TH>Company</TH>
            <TH>Stage</TH>
            <TH>Email status</TH>
            <TH>Last contact</TH>
            <TH>Last reply</TH>
          </tr>
        </THead>
        <TBody>
          {leads.isLoading ? <EmptyRow colSpan={6}>Loading…</EmptyRow> : null}
          {leads.error ? <EmptyRow colSpan={6}>{(leads.error as Error).message}</EmptyRow> : null}
          {leads.data && leads.data.data.length === 0 ? <EmptyRow colSpan={6}>No leads match.</EmptyRow> : null}
          {leads.data?.data.map((lead) => (
            <TR key={lead.id} onClick={() => router.push(`/leads/${lead.id}`)}>
              <TD>
                <div className="font-medium text-zinc-900 dark:text-zinc-100">{lead.full_name || lead.email}</div>
                <div className="text-xs text-zinc-500">{lead.full_name ? lead.email : lead.title || ''}</div>
              </TD>
              <TD>
                <div>{lead.company_name || '—'}</div>
                <div className="text-xs text-zinc-500">{lead.title && lead.full_name ? lead.title : lead.company_domain || ''}</div>
              </TD>
              <TD><StatusBadge value={lead.stage} /></TD>
              <TD><StatusBadge value={lead.email_status} /></TD>
              <TD className="text-xs text-zinc-500">{formatRelative(lead.last_contacted_at)}</TD>
              <TD className="text-xs text-zinc-500">{formatRelative(lead.last_inbound_at)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>

      {total > PAGE ? (
        <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
          <span>{offset + 1}–{Math.min(offset + PAGE, total)} of {total}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Previous</Button>
            <Button size="sm" variant="outline" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>Next</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
