'use client';

import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Paperclip } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatRelative } from '@/lib/api/client';
import type { Email } from '@/types';

export function ThreadView({ emails, emptyText = 'No emails yet.' }: { emails: Email[]; emptyText?: string }) {
  if (emails.length === 0) {
    return <p className="py-8 text-center text-sm text-zinc-400">{emptyText}</p>;
  }
  return (
    <ol className="space-y-3">
      {emails.map((email, index) => (
        <EmailCard
          key={email.id}
          email={email}
          defaultOpen={index === emails.length - 1 || email.direction === 'inbound'}
        />
      ))}
    </ol>
  );
}

export function EmailCard({ email, defaultOpen }: { email: Email; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  const inbound = email.direction === 'inbound';
  const when = email.received_at || email.sent_at || email.created_at;

  return (
    <li
      className={`overflow-hidden rounded-xl border shadow-sm shadow-zinc-950/[0.02] ${
        inbound
          ? 'border-violet-200/80 bg-violet-50/50 dark:border-violet-900/40 dark:bg-violet-950/20'
          : 'border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.02]"
      >
        <span
          className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
            inbound
              ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300'
              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
          }`}
        >
          {inbound ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {email.subject || '(no subject)'}
            </span>
            <StatusBadge value={email.status} />
            {email.source === 'sequence' ? (
              <span className="text-[10px] uppercase tracking-wider text-zinc-400">sequence</span>
            ) : null}
            {email.attachments?.length ? <Paperclip className="h-3 w-3 text-zinc-400" /> : null}
          </span>
          <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
            {inbound ? `from ${email.from_address}` : `to ${email.to_addresses.join(', ')}`} · {formatRelative(when)}
            {email.opened_at ? ` · opened ${formatRelative(email.opened_at)}` : ''}
          </span>
        </span>
      </button>
      {open ? (
        <div
          className={`border-t px-4 py-3.5 ${
            inbound
              ? 'border-violet-100 dark:border-violet-900/30'
              : 'border-zinc-100 dark:border-zinc-800'
          }`}
        >
          <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-zinc-800 dark:text-zinc-200">
            {email.text_body || '(empty)'}
          </pre>
          {email.bounce_reason ? (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{email.bounce_reason}</p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
