import { STAGE_NEXT_ACTIONS, type Lead, type LeadEmail, type LeadInteraction } from '@/types/leads';

export type NextBestActionUrgency = 'critical' | 'high' | 'medium' | 'low' | 'none';
export type NextBestActionTargetTab = 'overview' | 'emails' | 'conversation' | 'company' | 'memory';

export interface NextBestActionPlan {
  urgency: NextBestActionUrgency;
  primaryAction: string;
  reason: string;
  targetTab: NextBestActionTargetTab;
  dueLabel: string;
  supportingSignals: string[];
}

interface BuildNextBestActionInput {
  lead: Lead;
  emails: LeadEmail[];
  interactions: LeadInteraction[];
  now?: Date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CLOSED_STAGES = new Set<Lead['stage']>(['closed_won', 'closed_lost']);

function daysSince(date: string | null | undefined, now: Date) {
  if (!date) return null;
  const timestamp = new Date(date).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.floor((now.getTime() - timestamp) / MS_PER_DAY));
}

function hoursSince(date: string | null | undefined, now: Date) {
  if (!date) return null;
  const timestamp = new Date(date).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.floor((now.getTime() - timestamp) / (60 * 60 * 1000)));
}

function mostRecentInteraction(interactions: LeadInteraction[]) {
  return interactions.reduce<LeadInteraction | null>((latest, interaction) => {
    if (!latest) return interaction;
    return new Date(interaction.occurred_at).getTime() > new Date(latest.occurred_at).getTime() ? interaction : latest;
  }, null);
}

function countDirection(emails: LeadEmail[], direction: LeadEmail['direction']) {
  return emails.filter((email) => email.direction === direction).length;
}

function compactSignals(signals: Array<string | null | undefined>) {
  return signals.filter((signal): signal is string => Boolean(signal)).slice(0, 4);
}

export function buildNextBestAction({ lead, emails, interactions, now = new Date() }: BuildNextBestActionInput): NextBestActionPlan {
  const inboundCount = lead.total_emails_in || countDirection(emails, 'inbound');
  const outboundCount = lead.total_emails_out || countDirection(emails, 'outbound');
  const daysSinceInbound = daysSince(lead.last_inbound_at, now);
  const daysSinceOutbound = daysSince(lead.last_outbound_at || lead.last_contacted_at, now);
  const latestInteraction = mostRecentInteraction(interactions);
  const hoursSinceInteraction = hoursSince(latestInteraction?.occurred_at, now);

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
    };
  }

  if (lead.stage === 'replied' && inboundCount > 0) {
    return {
      urgency: 'critical',
      primaryAction: lead.conversation_next_step || 'Reply using ACA: acknowledge, clarify value, and ask for the next commitment',
      reason: daysSinceInbound != null
        ? `They replied ${daysSinceInbound} day${daysSinceInbound === 1 ? '' : 's'} ago; speed-to-lead matters.`
        : 'They replied and are waiting on the next move.',
      targetTab: 'emails',
      dueLabel: 'Reply today',
      supportingSignals: compactSignals([
        daysSinceInbound != null ? `Inbound reply ${daysSinceInbound} days ago` : 'Inbound reply detected',
        lead.conversation_summary ? 'Conversation summary available' : null,
        lead.icp_score != null ? `ICP ${lead.icp_score}` : null,
      ]),
    };
  }

  if (lead.stage === 'meeting_held') {
    const within24Hours = hoursSinceInteraction != null && hoursSinceInteraction <= 24;
    return {
      urgency: within24Hours ? 'critical' : 'high',
      primaryAction: 'Send post-meeting recap with decisions, value proof, and a concrete next step',
      reason: within24Hours
        ? 'Meeting happened within 24 hours; recap now while momentum is highest.'
        : 'Meeting has happened; a recap keeps the deal from stalling.',
      targetTab: 'emails',
      dueLabel: within24Hours ? 'Due now' : 'Overdue',
      supportingSignals: compactSignals([
        latestInteraction ? `Last ${latestInteraction.interaction_type.replace('_', ' ')} ${hoursSinceInteraction ?? '?'} hours ago` : 'Meeting stage active',
        lead.conversation_next_step ? `Next step: ${lead.conversation_next_step}` : null,
        lead.icp_score != null ? `ICP ${lead.icp_score}` : null,
      ]),
    };
  }

  if ((lead.stage === 'email_sent' || lead.stage === 'follow_up') && outboundCount > 0 && inboundCount === 0) {
    if (daysSinceOutbound != null && daysSinceOutbound >= 5) {
      return {
        urgency: 'high',
        primaryAction: 'Send follow-up with one sharp trigger, a softer CTA, and a fresh proof point',
        reason: `${daysSinceOutbound} days since the last outbound email with no reply.`,
        targetTab: 'emails',
        dueLabel: 'Due today',
        supportingSignals: compactSignals([
          `${outboundCount} outbound email${outboundCount === 1 ? '' : 's'}`,
          'No inbound reply yet',
          lead.smykm_hooks.length > 0 ? `${lead.smykm_hooks.length} SMYKM hook${lead.smykm_hooks.length === 1 ? '' : 's'} ready` : null,
        ]),
      };
    }

    return {
      urgency: 'medium',
      primaryAction: 'Prepare the next follow-up and wait for the send window',
      reason: daysSinceOutbound != null
        ? `${daysSinceOutbound} days since last outbound; avoid following up too early.`
        : 'Outbound email sent recently.',
      targetTab: 'emails',
      dueLabel: 'Upcoming',
      supportingSignals: compactSignals([`${outboundCount} outbound email${outboundCount === 1 ? '' : 's'}`, 'No inbound reply yet']),
    };
  }

  if (lead.stage === 'meeting_booked') {
    return {
      urgency: 'high',
      primaryAction: 'Prep call agenda with SMYKM research, likely objections, and desired close',
      reason: 'A booked meeting is the highest-leverage moment to shape the sale before the call.',
      targetTab: 'conversation',
      dueLabel: 'Before call',
      supportingSignals: compactSignals([
        lead.smykm_hooks.length > 0 ? `${lead.smykm_hooks.length} personalized hook${lead.smykm_hooks.length === 1 ? '' : 's'}` : null,
        lead.battle_card ? 'Battle card ready' : 'Battle card not generated yet',
      ]),
    };
  }

  if (lead.stage === 'email_drafted') {
    return {
      urgency: 'high',
      primaryAction: 'Review and send the drafted email',
      reason: 'The lead is researched and copy is drafted; shipping the first touch creates pipeline.',
      targetTab: 'emails',
      dueLabel: 'Send today',
      supportingSignals: compactSignals([
        lead.smykm_hooks.length > 0 ? `${lead.smykm_hooks.length} SMYKM hook${lead.smykm_hooks.length === 1 ? '' : 's'}` : null,
        lead.icp_score != null ? `ICP ${lead.icp_score}` : null,
      ]),
    };
  }

  if (lead.stage === 'researched' || outboundCount === 0) {
    return {
      urgency: lead.icp_score != null && lead.icp_score >= 70 ? 'high' : 'medium',
      primaryAction: 'Draft first-touch SMYKM email',
      reason: 'No outbound touch has been sent yet; first contact is the blocker to creating an opportunity.',
      targetTab: 'emails',
      dueLabel: 'Start sequence',
      supportingSignals: compactSignals([
        lead.icp_score != null ? `ICP ${lead.icp_score}` : null,
        lead.smykm_hooks.length > 0 ? `${lead.smykm_hooks.length} SMYKM hook${lead.smykm_hooks.length === 1 ? '' : 's'}` : 'Add personalization hook',
      ]),
    };
  }

  return {
    urgency: 'medium',
    primaryAction: lead.conversation_next_step || STAGE_NEXT_ACTIONS[lead.stage],
    reason: 'Use the current pipeline stage to keep the opportunity moving.',
    targetTab: 'overview',
    dueLabel: 'Next action',
    supportingSignals: compactSignals([
      `${outboundCount} outbound email${outboundCount === 1 ? '' : 's'}`,
      inboundCount > 0 ? `${inboundCount} inbound email${inboundCount === 1 ? '' : 's'}` : null,
      latestInteraction ? `Recent ${latestInteraction.interaction_type.replace('_', ' ')}` : null,
    ]),
  };
}
