'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { Lead } from '@/types/leads';
import { STAGE_LABELS, LEAD_TYPE_LABELS, LEAD_TYPE_COLORS, STAGE_DESCRIPTIONS } from '@/types/leads';

interface LeadsTableProps {
  leads: Lead[];
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleOne?: (id: string) => void;
  onToggleAll?: (checked: boolean) => void;
}

const stageColors: Record<string, string> = {
  researched: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  email_drafted: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  email_sent: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  replied: 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300',
  meeting_booked: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
  meeting_held: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
  follow_up: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
  closed_won: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  closed_lost: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  no_response: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500',
};

const priorityDots: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-zinc-400',
};

function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      toast.success('Email copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy email');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-1.5 p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500/20"
      aria-label="Copy email"
      title="Copy email"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export default function LeadsTable({
  leads,
  selectable = false,
  selectedIds,
  onToggleOne,
  onToggleAll,
}: LeadsTableProps) {

  if (!leads.length) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No leads yet. Add your first lead to get started.</p>
      </div>
    );
  }

  const allSelected = selectable && selectedIds ? leads.length > 0 && leads.every((l) => selectedIds.has(l.id)) : false;
  const someSelected = selectable && selectedIds ? leads.some((l) => selectedIds.has(l.id)) : false;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            {selectable && (
              <th className="w-10 pb-3 pl-4">
                <input
                  type="checkbox"
                  aria-label="Select all leads"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = !allSelected && someSelected;
                  }}
                  onChange={(e) => onToggleAll?.(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-red-600 focus:ring-red-500/30 cursor-pointer"
                />
              </th>
            )}
            <th className={`text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 pb-3 ${selectable ? '' : 'pl-4'}`}>Contact</th>
            <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 pb-3">Company</th>
            <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 pb-3">Type</th>
            <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 pb-3">Stage</th>
            <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 pb-3">ICP</th>
            <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 pb-3">Priority</th>
            <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 pb-3">Updated</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const checked = selectable && selectedIds ? selectedIds.has(lead.id) : false;
            return (
              <tr
                key={lead.id}
                className={`group border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors ${checked ? 'bg-red-50/40 dark:bg-red-950/10' : ''}`}
              >
                {selectable && (
                  <td className="py-3 pl-4 w-10">
                    <input
                      type="checkbox"
                      aria-label={`Select ${lead.contact_name}`}
                      checked={checked}
                      onChange={() => onToggleOne?.(lead.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-red-600 focus:ring-red-500/30 cursor-pointer"
                    />
                  </td>
                )}
                <td className={`py-3 ${selectable ? '' : 'pl-4'}`}>
                  <div className="flex flex-col">
                    <Link href={`/leads/${lead.id}`} className="block w-fit">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                        {lead.contact_name}
                      </p>
                    </Link>
                    {lead.contact_email && (
                      <div className="flex items-center">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{lead.contact_email}</p>
                        <CopyEmailButton email={lead.contact_email} />
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3">
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">{lead.company_name}</p>
                  {lead.product_name && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{lead.product_name}</p>
                  )}
                  {lead.fund_name && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{lead.fund_name}</p>
                  )}
                </td>
                <td className="py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${LEAD_TYPE_COLORS[lead.type].bg} ${LEAD_TYPE_COLORS[lead.type].text}`}>
                    {LEAD_TYPE_LABELS[lead.type]}
                  </span>
                </td>
                <td className="py-3">
                  <span
                    title={STAGE_DESCRIPTIONS[lead.stage]}
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium cursor-help ${stageColors[lead.stage] || ''}`}
                  >
                    {STAGE_LABELS[lead.stage]}
                  </span>
                </td>
                <td className="py-3">
                  {lead.icp_score != null ? (
                    <span
                      title={lead.icp_reasons?.join('\n')}
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums cursor-help ${
                        lead.icp_score >= 70 ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' :
                        lead.icp_score >= 50 ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' :
                        lead.icp_score >= 30 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600' :
                        'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {lead.icp_score}
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-400">--</span>
                  )}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${priorityDots[lead.priority]}`} />
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 capitalize">{lead.priority}</span>
                  </div>
                </td>
                <td className="py-3">
                  <span
                    title={new Date(lead.updated_at).toLocaleString()}
                    className="text-xs text-zinc-500 dark:text-zinc-400 cursor-help"
                  >
                    {formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true })}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
