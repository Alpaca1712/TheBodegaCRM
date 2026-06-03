import type { Lead } from '@/types/leads';
import { STAGE_LABELS, STAGE_NEXT_ACTIONS } from '@/types/leads';
import { getDealScore } from './deal-score';

export type LeadFocusReason =
  | 'needs_reply'
  | 'meeting_follow_up'
  | 'follow_up_due'
  | 'high_icp_ready'
  | 'stale_open';

export interface LeadFocusItem {
  lead: Lead;
  reason: LeadFocusReason;
  label: string;
  description: string;
  urgency: 'critical' | 'high' | 'medium';
  score: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_STAGES = new Set<Lead['stage']>([
  'researched',
  'email_drafted',
  'email_sent',
  'replied',
  'meeting_booked',
  'meeting_held',
  'follow_up',
]);

function ageInDays(dateValue: string | null | undefined, now: Date) {
  if (!dateValue) return Number.POSITIVE_INFINITY;
  const time = new Date(dateValue).getTime();
  if (Number.isNaN(time)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((now.getTime() - time) / DAY_MS));
}

function isInboundNewerThanOutbound(lead: Lead) {
  if (!lead.last_inbound_at) return false;
  if (!lead.last_outbound_at) return true;
  return new Date(lead.last_inbound_at).getTime() > new Date(lead.last_outbound_at).getTime();
}

function priorityBoost(lead: Lead) {
  if (lead.priority === 'high') return 12;
  if (lead.priority === 'medium') return 6;
  return 0;
}

function icpBoost(lead: Lead) {
  return Math.min(20, Math.max(0, Math.floor((lead.icp_score ?? 0) / 5)));
}

function dealScoreBoost(lead: Lead, now: Date) {
  return Math.floor(getDealScore(lead, now).score / 5);
}

function buildFocusItem(lead: Lead, reason: LeadFocusReason, now: Date): LeadFocusItem {
  const boost = priorityBoost(lead) + icpBoost(lead) + dealScoreBoost(lead, now);

  switch (reason) {
    case 'needs_reply':
      return {
        lead,
        reason,
        label: 'Reply needed',
        description: lead.conversation_next_step || 'They engaged recently — respond while the conversation is warm.',
        urgency: 'critical',
        score: 120 + boost,
      };
    case 'meeting_follow_up': {
      const days = ageInDays(lead.last_contacted_at || lead.updated_at, now);
      return {
        lead,
        reason,
        label: 'Post-meeting follow-up',
        description: days === 0 ? 'Send the recap and next step today.' : `Meeting follow-up is ${days} day${days === 1 ? '' : 's'} old — send the recap now.`,
        urgency: 'high',
        score: 95 + boost + Math.min(days, 7),
      };
    }
    case 'follow_up_due': {
      const days = ageInDays(lead.last_outbound_at || lead.last_contacted_at || lead.updated_at, now);
      return {
        lead,
        reason,
        label: 'Follow-up due',
        description: `Last touch was ${days} day${days === 1 ? '' : 's'} ago. ${STAGE_NEXT_ACTIONS[lead.stage]}`,
        urgency: 'high',
        score: 85 + boost + Math.min(days, 10),
      };
    }
    case 'high_icp_ready':
      return {
        lead,
        reason,
        label: 'High-ICP ready to work',
        description: `${lead.icp_score}/100 ICP fit in ${STAGE_LABELS[lead.stage]}. Prioritize the next outbound step.`,
        urgency: 'medium',
        score: 70 + boost,
      };
    case 'stale_open': {
      const days = ageInDays(lead.updated_at, now);
      return {
        lead,
        reason,
        label: 'Stale open deal',
        description: `No visible movement for ${days} day${days === 1 ? '' : 's'}. Decide the next step or close the loop.`,
        urgency: 'medium',
        score: 55 + boost + Math.min(days, 14),
      };
    }
  }
}

export function getLeadFocusItems(leads: Lead[], now = new Date(), limit = 3): LeadFocusItem[] {
  return leads
    .filter((lead) => ACTIVE_STAGES.has(lead.stage))
    .map((lead) => {
      const hasActionSignal = lead.conversation_signals?.some((signal) => signal.type === 'action_needed') ?? false;
      const daysSinceOutbound = ageInDays(lead.last_outbound_at || lead.last_contacted_at || lead.updated_at, now);
      const daysSinceMeeting = ageInDays(lead.last_contacted_at || lead.updated_at, now);
      const daysSinceUpdate = ageInDays(lead.updated_at, now);

      if (hasActionSignal || lead.stage === 'replied' || isInboundNewerThanOutbound(lead)) {
        return buildFocusItem(lead, 'needs_reply', now);
      }

      if (lead.stage === 'meeting_held' && daysSinceMeeting >= 1) {
        return buildFocusItem(lead, 'meeting_follow_up', now);
      }

      if ((lead.stage === 'email_sent' || lead.stage === 'follow_up') && daysSinceOutbound >= 3) {
        return buildFocusItem(lead, 'follow_up_due', now);
      }

      if ((lead.stage === 'researched' || lead.stage === 'email_drafted') && (lead.icp_score ?? 0) >= 70) {
        return buildFocusItem(lead, 'high_icp_ready', now);
      }

      if (daysSinceUpdate >= 14) {
        return buildFocusItem(lead, 'stale_open', now);
      }

      return null;
    })
    .filter((item): item is LeadFocusItem => item !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
