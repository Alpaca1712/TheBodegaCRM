import { type Lead, type LeadEmail, type LeadInteraction, type LeadType } from '@/types/leads';
import { getLeadBestAction, type SalesActionCategory, type SalesActionPriority } from '../dashboard/sales-actions';

export type NextBestActionUrgency = 'critical' | 'high' | 'medium' | 'low' | 'none';
export type NextBestActionTargetTab = 'overview' | 'emails' | 'conversation' | 'company' | 'memory';

export interface NextBestActionPlan {
  urgency: NextBestActionUrgency;
  primaryAction: string;
  reason: string;
  targetTab: NextBestActionTargetTab;
  dueLabel: string;
  supportingSignals: string[];
  category?: SalesActionCategory;
  leadType: LeadType;
  priority?: SalesActionPriority;
}

interface BuildNextBestActionInput {
  lead: Lead;
  emails: LeadEmail[];
  interactions: LeadInteraction[];
  now?: Date;
}

const CLOSED_STAGES = new Set<Lead['stage']>(['closed_won', 'closed_lost']);

function countDirection(emails: LeadEmail[], direction: LeadEmail['direction']) {
  return emails.filter((email) => email.direction === direction).length;
}

function compactSignals(signals: Array<string | null | undefined>) {
  return signals.filter((signal): signal is string => Boolean(signal)).slice(0, 4);
}

export function buildNextBestAction({
  lead,
  emails,
  now = new Date(),
}: BuildNextBestActionInput): NextBestActionPlan {
  const outboundEmails = emails.filter(e => e.direction === 'outbound');
  const inboundEmails = emails.filter(e => e.direction === 'inbound');
  const bestAction = getLeadBestAction(lead, outboundEmails, inboundEmails, now);
  const inboundCount = lead.total_emails_in || inboundEmails.length;
  const outboundCount = lead.total_emails_out || countDirection(emails, 'outbound');

  if (CLOSED_STAGES.has(lead.stage)) {
    return {
      urgency: 'none',
      primaryAction: 'No active sales action',
      reason: lead.stage === 'closed_won' ? 'Deal is already closed won.' : 'Deal is closed lost.',
      targetTab: 'overview',
      dueLabel: 'Done',
      supportingSignals: compactSignals([
        `${outboundCount} outbound email${outboundCount === 1 ? '' : 's'}`,
        inboundCount > 0 ? `${inboundCount} inbound email${inboundCount === 1 ? '' : 's'}` : null,
      ]),
      leadType: lead.type,
    };
  }

  if (bestAction) {
    const targetTab: NextBestActionTargetTab = bestAction.ctaHref.includes('tab=emails')
      ? 'emails'
      : bestAction.category === 'meeting' || bestAction.category === 'meeting_prep'
      ? 'conversation'
      : 'overview';

    return {
      urgency: bestAction.priority as NextBestActionUrgency,
      primaryAction: (bestAction.category === 'reply' && lead.conversation_next_step) || bestAction.title,
      reason: bestAction.reason,
      targetTab,
      dueLabel: bestAction.priority === 'critical' ? 'Due today' : 'Next action',
      supportingSignals: compactSignals([
        lead.icp_score != null ? `ICP ${lead.icp_score}` : null,
        lead.conversation_next_step ? 'Next step suggested' : null,
        outboundCount > 0 ? `${outboundCount} sent` : 'First touch',
      ]),
      category: bestAction.category,
      leadType: lead.type,
      priority: bestAction.priority,
    };
  }

  return {
    urgency: 'medium',
    primaryAction: 'Advance pipeline',
    reason: 'Keep the conversation moving forward.',
    targetTab: 'overview',
    dueLabel: 'Next action',
    supportingSignals: compactSignals([
      `${outboundCount} outbound`,
      inboundCount > 0 ? `${inboundCount} inbound` : null,
    ]),
    leadType: lead.type,
  };
}
