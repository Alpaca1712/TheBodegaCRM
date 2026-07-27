import { AlertTriangle, ExternalLink } from 'lucide-react';
import type { Lead } from '@/types/leads';
import { findResearchIdentityConflicts } from '@/lib/ai/research-identity';

function ResearchField({ label, value }: { label: string; value: string | null }) {
  if (!value) return <div><p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{label}</p><p className="text-sm text-zinc-400 italic">Not filled in yet</p></div>;
  return <div><p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{label}</p><p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{value}</p></div>;
}

export function ResearchSection({ lead }: { lead: Lead }) {
  const identityConflicts = findResearchIdentityConflicts(
    lead.contact_name,
    lead.research_sources,
  );

  return (
    <div className="space-y-4">
      {identityConflicts.length > 0 && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="text-xs font-semibold">Identity conflict quarantined</p>
            <p className="mt-0.5 text-xs leading-5">
              {identityConflicts.map(conflict =>
                `${conflict.sourceTitle} appears to refer to ${conflict.conflictingName}, not ${conflict.expectedName}.`,
              ).join(' ')} Facts from these sources are excluded from hooks and email drafts.
            </p>
          </div>
        </div>
      )}
      <ResearchField label="Company Description" value={lead.company_description} />
      {lead.type === 'customer' && <ResearchField label="Attack Surface Notes" value={lead.attack_surface_notes} />}
      {lead.type === 'investor' && <ResearchField label="Investment Thesis Notes" value={lead.investment_thesis_notes} />}
      {lead.type === 'partnership' && <ResearchField label="Partnership Opportunity Notes" value={lead.investment_thesis_notes} />}
      <ResearchField label="Personal Details" value={lead.personal_details} />
      {lead.smykm_hooks?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">SMYKM Hooks</p>
          <div className="flex flex-wrap gap-2">
            {lead.smykm_hooks.map((hook, i) => (
              <span key={i} className="px-2.5 py-1 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-md text-xs">{hook}</span>
            ))}
          </div>
        </div>
      )}
      {lead.research_sources?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Research Sources</p>
          <div className="space-y-2">
            {lead.research_sources.map((source, i) => (
              <a key={i} href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-red-300 dark:hover:border-red-700 transition-colors group">
                <ExternalLink className="h-3.5 w-3.5 mt-0.5 text-zinc-400 group-hover:text-red-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">{source.title}</p>
                  <p className="text-[11px] text-zinc-500 line-clamp-1">{source.detail}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
