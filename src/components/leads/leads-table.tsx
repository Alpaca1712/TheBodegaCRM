'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { FilterX, UserPlus, ArrowRight } from 'lucide-react';
import type { Lead } from '@/types/leads';
import { STAGE_LABELS, LEAD_TYPE_LABELS, LEAD_TYPE_COLORS, STAGE_DESCRIPTIONS } from '@/types/leads';
import { CopyButton } from '@/components/ui/copy-button';

interface LeadsTableProps {
  leads: Lead[];
  isFiltered?: boolean;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleOne?: (id: string) => void;
  onToggleAll?: (checked: boolean) => void;
  onClearFilters?: () => void;
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

export default function LeadsTable({
  leads,
  isFiltered = false,
  selectable = false,
  selectedIds,
  onToggleOne,
  onToggleAll,
  onClearFilters,
}: LeadsTableProps) {

  if (!leads.length) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
        {isFiltered ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-400 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
              <FilterX className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No matching leads</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Try broadening the search, changing stages, or clearing filters to get back to the full pipeline.
              </p>
            </div>
            {onClearFilters && (
              <button
                onClick={onClearFilters}
                className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-red-600/20 transition-colors hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 ring-1 ring-red-100 dark:bg-red-950/30 dark:ring-red-900/40">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Start your outreach pipeline</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Add a lead or import a CSV to start tracking conversations, follow-ups, and close-ready accounts.
              </p>
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <Link
                href="/leads/new?type=customer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-red-600/20 transition-colors hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              >
                Add first lead
              </Link>
              <Link
                href="/leads/import"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Import CSV
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  const allSelected = selectable && selectedIds ? leads.length > 0 && leads.every((l) => selectedIds.has(l.id)) : false;
  const someSelected = selectable && selectedIds ? leads.some((l) => selectedIds.has(l.id)) : false;

  return (
    <>
      <div className="space-y-3 md:hidden" aria-label="Lead cards">
        {leads.map((lead) => {
          const checked = selectable && selectedIds ? selectedIds.has(lead.id) : false;
          return (
            <article
              key={lead.id}
              className={`group rounded-2xl border bg-white p-4 shadow-sm transition-colors dark:bg-zinc-900/60 ${
                checked
                  ? 'border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/10'
                  : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <div className="flex items-start gap-3">
                {selectable && (
                  <input
                    type="checkbox"
                    aria-label={`Select ${lead.contact_name}`}
                    checked={checked}
                    onChange={() => onToggleOne?.(lead.id)}
                    className="mt-1 h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-500/30 dark:border-zinc-700"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/leads/${lead.id}`} className="text-sm font-semibold text-zinc-900 transition-colors hover:text-red-600 dark:text-zinc-100 dark:hover:text-red-400">
                        {lead.contact_name}
                      </Link>
                      <p className="truncate text-sm text-zinc-600 dark:text-zinc-300">{lead.company_name}</p>
                      {lead.contact_email && (
                        <div className="mt-0.5 flex items-center text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="truncate">{lead.contact_email}</span>
                          <CopyButton
                            value={lead.contact_email}
                            label="Email"
                            className="ml-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
                          />
                        </div>
                      )}
                    </div>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-medium ${LEAD_TYPE_COLORS[lead.type].bg} ${LEAD_TYPE_COLORS[lead.type].text}`}>
                      {LEAD_TYPE_LABELS[lead.type]}
                    </span>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Stage</dt>
                      <dd className="mt-1">
                        <span
                          title={STAGE_DESCRIPTIONS[lead.stage]}
                          className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium cursor-help ${stageColors[lead.stage] || ''}`}
                        >
                          {STAGE_LABELS[lead.stage]}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Priority</dt>
                      <dd className="mt-1 flex items-center gap-1.5 text-zinc-600 capitalize dark:text-zinc-400">
                        <span
                          role="img"
                          tabIndex={0}
                          aria-label={`${lead.priority} priority`}
                          title={`${lead.priority.charAt(0).toUpperCase() + lead.priority.slice(1)} priority`}
                          className={`h-2 w-2 rounded-full cursor-help focus:ring-2 focus:ring-offset-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 outline-none ${priorityDots[lead.priority]}`}
                        />
                        {lead.priority}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">ICP</dt>
                      <dd className="mt-1 text-zinc-600 dark:text-zinc-400">{lead.icp_score != null ? `${lead.icp_score}/100` : 'Not scored'}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Updated</dt>
                      <dd className="mt-1 text-zinc-600 dark:text-zinc-400">
                        {formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true })}
                      </dd>
                    </div>
                  </dl>

                  <Link
                    href={`/leads/${lead.id}`}
                    className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  >
                    Open lead <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
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
                        <CopyButton
                          value={lead.contact_email}
                          label="Email"
                          className="ml-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
                        />
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
                    <div
                      role="img"
                      tabIndex={0}
                      aria-label={`${lead.priority} priority`}
                      title={`${lead.priority.charAt(0).toUpperCase() + lead.priority.slice(1)} priority`}
                      className={`h-2 w-2 rounded-full cursor-help focus:ring-2 focus:ring-offset-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 outline-none ${priorityDots[lead.priority]}`}
                    />
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
  </>
  );
}
