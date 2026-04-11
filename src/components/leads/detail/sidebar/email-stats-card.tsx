import type { Lead } from '@/types/leads';

export function EmailStatsCard({ lead }: { lead: Lead }) {
  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Email Activity</h3>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800">
          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{lead.total_emails_out}</p>
          <p className="text-[10px] text-zinc-500">Sent</p>
        </div>
        <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800">
          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{lead.total_emails_in}</p>
          <p className="text-[10px] text-zinc-500">Received</p>
        </div>
      </div>
    </div>
  );
}
