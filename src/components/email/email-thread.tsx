'use client';

import { formatDistanceToNow, format } from 'date-fns';
import type { LeadEmail } from '@/types/leads';
import { Mail, Reply, Clock } from 'lucide-react';

interface EmailThreadProps {
  emails: LeadEmail[];
}

const typeLabels: Record<string, string> = {
  initial: 'Initial Email',
  follow_up_1: 'Follow-up #1 (Day 4)',
  follow_up_2: 'Follow-up #2 (Day 9)',
  follow_up_3: 'Follow-up #3 (Day 14)',
  reply_response: 'Reply Response',
  meeting_request: 'Meeting Request',
  lead_magnet: 'Lead Magnet',
  break_up: 'Break-up Email',
};

export default function EmailThread({ emails }: EmailThreadProps) {
  if (!emails.length) {
    return (
      <div className="text-center py-8">
        <Mail className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No emails yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {emails.map((email) => (
        <div
          key={email.id}
          className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {typeLabels[email.email_type] || email.email_type}
              </span>
              {email.cta_type && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400">
                  {email.cta_type === 'mckenna' ? 'McKenna CTA' : 'Hormozi CTA'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
              {email.sent_at ? (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Sent {formatDistanceToNow(new Date(email.sent_at), { addSuffix: true })}
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">Draft</span>
              )}
            </div>
          </div>

          <div className="px-4 py-3 space-y-2">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {email.subject}
            </p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {email.body}
            </p>
          </div>

          {email.reply_content && (
            <div className="border-t border-zinc-200 dark:border-zinc-700 px-4 py-3 bg-green-50/50 dark:bg-green-950/20">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Reply className="h-3 w-3 text-green-600 dark:text-green-400" />
                <span className="text-[11px] font-medium text-green-700 dark:text-green-300">
                  Reply {email.replied_at && `on ${format(new Date(email.replied_at), 'MMM d, yyyy')}`}
                </span>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                {email.reply_content}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
