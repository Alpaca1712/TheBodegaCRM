'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Mail } from 'lucide-react';
import { PageBody, PageFrame, PageHeader } from '@/components/console/page-frame';
import { EmptyState, FilterChips, ListHeader, ListRow } from '@/components/console/surface';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { api, formatRelative, type Paginated } from '@/lib/api/client';
import type { Email } from '@/types';

type Row = Email & { lead: { id: string; email: string; full_name: string | null; company_name: string | null } | null };
const PAGE = 50;
const STATUSES = ['queued', 'sent', 'delivered', 'delivery_delayed', 'bounced', 'complained', 'failed', 'suppressed', 'received'];
const DIRECTION_FILTERS = [
  { value: '', label: 'Both' },
  { value: 'outbound', label: 'Outbound' },
  { value: 'inbound', label: 'Inbound' },
];

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
    <PageFrame>
      <PageHeader
        title="Emails"
        count={emails.isLoading ? null : total}
        description="Delivery log for everything sent and received through Resend."
        actions={
          <select
            value={status}
            onChange={(event) => { setStatus(event.target.value); setOffset(0); }}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          >
            <option value="">All statuses</option>
            {STATUSES.map((value) => <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>)}
          </select>
        }
      >
        <FilterChips
          options={DIRECTION_FILTERS}
          value={direction}
          onChange={(value) => { setDirection(value); setOffset(0); }}
        />
      </PageHeader>

      <PageBody className="bg-card">
        <ListHeader className="grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_auto] gap-3">
          <span>Lead</span>
          <span>Subject</span>
          <span className="text-right">Status</span>
        </ListHeader>

        {emails.isLoading ? (
          <div>
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex animate-pulse items-center gap-3 border-b border-border px-5 py-3.5">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-muted" />
                  <div className="h-2.5 w-1/2 rounded bg-muted/70" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!emails.isLoading && rows.length === 0 ? (
          <EmptyState icon={Mail} title="Nothing yet" description="Sent and received mail will show up here as Resend events arrive." />
        ) : null}

        {rows.length > 0 ? (
          <ul>
            {rows.map((email) => {
              const inbound = email.direction === 'inbound';
              const when = email.sent_at || email.received_at || email.created_at;
              return (
                <li key={email.id}>
                  <ListRow className="grid grid-cols-1 items-center gap-2 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_auto] md:gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                        inbound ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300' : 'bg-muted text-muted-foreground'
                      }`}>
                        {inbound ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                      </div>
                      <div className="min-w-0">
                        {email.lead ? (
                          <Link href={`/leads/${email.lead.id}`} className="group block">
                            <div className="truncate text-[13px] font-semibold text-foreground group-hover:underline">
                              {email.lead.full_name || email.lead.email}
                            </div>
                            <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
                              {email.lead.company_name || email.lead.email}
                            </div>
                          </Link>
                        ) : (
                          <div className="truncate text-[12px] text-muted-foreground">
                            {inbound ? email.from_address : email.to_addresses.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 pl-11 md:pl-0">
                      <div className="truncate text-[13px] font-medium text-foreground">{email.subject || '(no subject)'}</div>
                      <div className="mt-0.5 flex flex-wrap gap-x-2 text-[12px] text-muted-foreground">
                        <span>{formatRelative(when)}</span>
                        <span>· {email.source}</span>
                        {email.opened_at ? <span>· opened {formatRelative(email.opened_at)}</span> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pl-11 md:justify-end md:pl-0">
                      <StatusBadge value={email.status} />
                      {email.bounce_reason ? (
                        <span className="max-w-[180px] truncate text-[11px] text-destructive" title={email.bounce_reason}>
                          {email.bounce_reason}
                        </span>
                      ) : null}
                    </div>
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
