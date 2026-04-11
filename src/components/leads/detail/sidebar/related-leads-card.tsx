import Link from 'next/link';
import { Users } from 'lucide-react';
import { STAGE_LABELS, type PipelineStage } from '@/types/leads';
import type { RelatedLead } from '@/types/leads-detail';

export function RelatedLeadsCard({ leads, domain }: { leads: RelatedLead[]; domain: string }) {
  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Users className="h-3.5 w-3.5 text-zinc-400" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Same Company ({domain})</h3>
      </div>
      {leads.map(rl => {
        const initials = rl.contact_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        return (
          <Link key={rl.id} href={`/leads/${rl.id}`} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            {rl.contact_photo_url ? (
              <img src={rl.contact_photo_url} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className="h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-500 shrink-0">{initials}</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{rl.contact_name}</p>
              <p className="text-[10px] text-zinc-400 truncate">{rl.contact_title || rl.contact_email}</p>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shrink-0">{STAGE_LABELS[rl.stage as PipelineStage] || rl.stage}</span>
          </Link>
        );
      })}
    </div>
  );
}
