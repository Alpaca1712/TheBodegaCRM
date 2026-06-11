import type { Lead } from '@/types/leads';

export type DealReadinessId =
  | 'contactable'
  | 'personalized-angle'
  | 'qualified-fit'
  | 'account-context'
  | 'outreach-motion'
  | 'engagement-intel';

export type DealReadinessImpact = 'critical' | 'high' | 'medium';

export interface DealReadinessItem {
  id: DealReadinessId;
  label: string;
  description: string;
  met: boolean;
  impact: DealReadinessImpact;
  fix: string;
}

export interface DealReadinessSummary {
  score: number;
  completed: number;
  total: number;
  verdict: 'ready' | 'almost' | 'blocked';
  headline: string;
  items: DealReadinessItem[];
  nextMissingItem: DealReadinessItem | null;
}

const IMPACT_WEIGHTS: Record<DealReadinessImpact, number> = {
  critical: 3,
  high: 2,
  medium: 1,
};

export function getDealReadiness(lead: Lead): DealReadinessSummary {
  const hasPersonalizedAngle =
    lead.smykm_hooks.length > 0 ||
    lead.research_sources.length > 0 ||
    Boolean(lead.company_description?.trim() || lead.personal_details?.trim());

  const hasQualifiedFit =
    (lead.icp_score ?? 0) >= 70 ||
    lead.icp_reasons.length > 0 ||
    Boolean(lead.battle_card);

  const hasOutreachMotion =
    ['email_drafted', 'email_sent', 'replied', 'meeting_booked', 'meeting_held', 'follow_up', 'closed_won'].includes(lead.stage) ||
    lead.total_emails_out > 0 ||
    Boolean(lead.conversation_next_step?.trim());

  const hasEngagementIntel =
    lead.total_emails_in > 0 ||
    lead.total_emails_out > 0 ||
    lead.conversation_signals.length > 0 ||
    Boolean(lead.conversation_summary?.trim());

  const items: DealReadinessItem[] = [
    {
      id: 'contactable',
      label: 'Contact route',
      description: 'A direct email or LinkedIn URL is available for outreach.',
      met: Boolean(lead.contact_email?.trim() || lead.contact_linkedin?.trim()),
      impact: 'critical',
      fix: 'Add an email address or LinkedIn profile before pitching.',
    },
    {
      id: 'personalized-angle',
      label: 'Personalized angle',
      description: 'Research, SMYKM hooks, or personal context can anchor the message.',
      met: hasPersonalizedAngle,
      impact: 'critical',
      fix: 'Add a SMYKM hook, source, or company notes to avoid a generic email.',
    },
    {
      id: 'qualified-fit',
      label: 'Qualified fit',
      description: 'ICP score, reasons, or a battle card explain why this account matters.',
      met: hasQualifiedFit,
      impact: 'high',
      fix: 'Run a battle card or add ICP reasons so the pitch is worth Daniel’s time.',
    },
    {
      id: 'account-context',
      label: 'Account context',
      description: 'Website, domain, product, fund, or org chart context is present.',
      met: Boolean(
        lead.company_website?.trim() ||
        lead.email_domain?.trim() ||
        lead.product_name?.trim() ||
        lead.fund_name?.trim() ||
        lead.org_chart.length > 0,
      ),
      impact: 'high',
      fix: 'Add website/product context or enrich the company tab for a sharper ask.',
    },
    {
      id: 'outreach-motion',
      label: 'Outreach motion',
      description: 'The lead has a drafted/sent email, next step, or active pipeline stage.',
      met: hasOutreachMotion,
      impact: 'high',
      fix: 'Draft the first email or define the next step to move the deal forward.',
    },
    {
      id: 'engagement-intel',
      label: 'Engagement intel',
      description: 'Conversation history or signals are available to time the next move.',
      met: hasEngagementIntel,
      impact: 'medium',
      fix: 'Sync Gmail or log an interaction so follow-ups use real context.',
    },
  ];

  const totalWeight = items.reduce((sum, item) => sum + IMPACT_WEIGHTS[item.impact], 0);
  const metWeight = items.reduce((sum, item) => sum + (item.met ? IMPACT_WEIGHTS[item.impact] : 0), 0);
  const score = Math.round((metWeight / totalWeight) * 100);
  const completed = items.filter((item) => item.met).length;
  const nextMissingItem =
    items
      .filter((item) => !item.met)
      .sort((a, b) => IMPACT_WEIGHTS[b.impact] - IMPACT_WEIGHTS[a.impact])[0] ?? null;

  const verdict: DealReadinessSummary['verdict'] = score >= 80 ? 'ready' : score >= 55 ? 'almost' : 'blocked';
  const headline =
    verdict === 'ready'
      ? 'Ready to pitch'
      : verdict === 'almost'
        ? 'Almost ready'
        : 'Needs prep before outreach';

  return {
    score,
    completed,
    total: items.length,
    verdict,
    headline,
    items,
    nextMissingItem,
  };
}
