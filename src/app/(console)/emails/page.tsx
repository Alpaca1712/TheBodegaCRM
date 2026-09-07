'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyRow, TBody, TD, TH, THead, TR, Table } from '@/components/ui/table';
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

  const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
  if (direction) params.set('direction', direction);
  if (status) params.set('status', status);

  const emails = useQuery({ queryKey: ['emails', params.toString()], queryFn: () => api<Paginated<Row>>(`/emails?${params}`) });
  const total = emails.data?.total ?? 0;

  return (
    <div>
      <PageHeader title="Emails" description="Delivery log for everything sent and received through Resend." />
      <div className="mb-4 flex gap-2">
        <select value={direction} onChange={(event) => { setDirection(event.target.value); setOffset(0); }} className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-800">
          <option value="">Both directions</option>
          <option value="outbound">Outbound</option>
          <option value="inbound">Inbound</option>
        </select>
        <select value={status} onChange={(event) => { setStatus(event.target.value); setOffset(0); }} className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-800">
          <option value="">All statuses</option>
          {STATUSES.map((value) => <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <Table>
        <THead>
          <tr>
            <TH>When</TH>
            <TH>Lead</TH>
            <TH>Subject</TH>
            <TH>Dir</TH>
            <TH>Status</TH>
            <TH>Source</TH>
            <TH>Opened</TH>
          </tr>
        </THead>
        <TBody>
          {emails.isLoading ? <EmptyRow colSpan={7}>Loading…</EmptyRow> : null}
          {emails.data && emails.data.data.length === 0 ? <EmptyRow colSpan={7}>Nothing yet.</EmptyRow> : null}
          {emails.data?.data.map((email) => (
            <TR key={email.id}>
              <TD className="whitespace-nowrap text-xs text-zinc-500">{formatRelative(email.sent_at || email.received_at || email.created_at)}</TD>
              <TD>
                {email.lead ? (
                  <Link href={`/leads/${email.lead.id}`} className="hover:underline">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{email.lead.full_name || email.lead.email}</div>
                    <div className="text-xs text-zinc-500">{email.lead.company_name || ''}</div>
                  </Link>
                ) : <span className="text-xs text-zinc-400">{email.direction === 'inbound' ? email.from_address : email.to_addresses.join(', ')}</span>}
              </TD>
              <TD className="max-w-[320px] truncate">{email.subject || '(no subject)'}</TD>
              <TD className="text-xs">{email.direction === 'inbound' ? '←' : '→'}</TD>
              <TD><StatusBadge value={email.status} />{email.bounce_reason ? <div className="mt-0.5 max-w-[200px] truncate text-[11px] text-red-600" title={email.bounce_reason}>{email.bounce_reason}</div> : null}</TD>
              <TD className="text-xs text-zinc-500">{email.source}</TD>
              <TD className="text-xs text-zinc-500">{email.opened_at ? formatRelative(email.opened_at) : '—'}</TD>
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
