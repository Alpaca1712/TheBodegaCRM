import type { Lead } from '@/types/leads';
import { LEAD_TYPE_LABELS, STAGE_LABELS } from '@/types/leads';

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between"><span className="text-xs text-zinc-500">{label}</span><span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 capitalize">{value}</span></div>;
}

export function DetailsCard({ lead }: { lead: Lead }) {
  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4 space-y-2.5">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Details</h3>
      <InfoRow label="Type" value={LEAD_TYPE_LABELS[lead.type]} />
      {lead.product_name && <InfoRow label="Product" value={lead.product_name} />}
      {lead.fund_name && <InfoRow label="Fund" value={lead.fund_name} />}
      <InfoRow label="Priority" value={lead.priority} />
      {lead.source && <InfoRow label="Source" value={lead.source} />}
      <InfoRow label="Stage" value={STAGE_LABELS[lead.stage]} />
    </div>
  );
}
