'use client';

import Link from 'next/link';
import { Building2, Globe, Loader2, Network, Target, Users } from 'lucide-react';
import type { Lead, OrgChartMember, PipelineStage } from '@/types/leads';
import { STAGE_LABELS } from '@/types/leads';
import type { RelatedLead } from '@/types/leads-detail';
import { OrgChartTree } from './org-chart-tree';

export function CompanyTab({ lead, relatedLeads, onEnrich, isEnriching }: { lead: Lead; relatedLeads: RelatedLead[]; onEnrich: () => void; isEnriching: boolean }) {
  const orgChart = (lead.org_chart || []) as OrgChartMember[];
  const hasOrgChart = orgChart.length > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {lead.company_logo_url ? (
              <img src={lead.company_logo_url} alt="" className="h-10 w-10 rounded-lg object-contain bg-white p-1 border border-zinc-200 dark:border-zinc-700" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-zinc-400" />
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{lead.company_name}</h3>
              {lead.company_website && (
                <a href={lead.company_website.startsWith('http') ? lead.company_website : `https://${lead.company_website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1">
                  <Globe className="h-3 w-3" />{lead.company_website}
                </a>
              )}
            </div>
          </div>
          <button
            onClick={onEnrich}
            disabled={isEnriching}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {isEnriching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Network className="h-3.5 w-3.5" />}
            {hasOrgChart ? 'Refresh Team' : 'Discover Team'}
          </button>
        </div>
        {lead.company_description && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{lead.company_description}</p>
        )}
        {lead.icp_score != null && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-xs font-medium text-zinc-500">ICP Fit</span>
            </div>
            <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  lead.icp_score >= 70 ? 'bg-emerald-500' : lead.icp_score >= 50 ? 'bg-blue-500' : lead.icp_score >= 30 ? 'bg-amber-500' : 'bg-zinc-400'
                }`}
                style={{ width: `${lead.icp_score}%` }}
              />
            </div>
            <span className="text-xs font-bold tabular-nums text-zinc-700 dark:text-zinc-300">{lead.icp_score}/100</span>
          </div>
        )}
        {lead.icp_reasons && lead.icp_reasons.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {lead.icp_reasons.map((r, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">{r}</span>
            ))}
          </div>
        )}
      </div>

      {hasOrgChart && <OrgChartTree members={orgChart} companyName={lead.company_name} />}

      {relatedLeads.length > 0 && (
        <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">People in Your CRM</h3>
          </div>
          <div className="space-y-2">
            {relatedLeads.map(rl => {
              const initials = rl.contact_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <Link key={rl.id} href={`/leads/${rl.id}`} className="flex items-center gap-3 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:border-red-200 dark:hover:border-red-800 transition-colors">
                  {rl.contact_photo_url ? (
                    <img src={rl.contact_photo_url} alt="" className="h-9 w-9 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-500">{initials}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{rl.contact_name}</p>
                    <p className="text-[11px] text-zinc-500">{rl.contact_title || rl.contact_email}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    rl.stage === 'closed_won' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' :
                    rl.stage === 'replied' || rl.stage === 'meeting_booked' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' :
                    'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                  }`}>{STAGE_LABELS[rl.stage as PipelineStage] || rl.stage}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {!hasOrgChart && relatedLeads.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 p-8 text-center">
          <Network className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-500">No team data yet</p>
          <p className="text-xs text-zinc-400 mt-1">Click &quot;Discover Team&quot; to find team members and build an org chart.</p>
        </div>
      )}
    </div>
  );
}
