import type { Lead, LeadEmail } from '@/types/leads';

export interface FollowUpItem {
  lead: Lead;
  lastEmail: LeadEmail | null;
  daysSinceLastContact: number;
  suggestedAction: string;
  suggestedType: FollowUpType;
  suggestedChannel: 'email' | 'linkedin' | 'twitter';
  urgency: FollowUpUrgency;
  sequenceDay: string;
  outboundCount: number;
  inboundCount: number;
}

export type FollowUpType =
  | 'initial_outreach'
  | 'run_research'
  | 'prep_meeting'
  | 'review_draft'
  | 'follow_up_1'
  | 'follow_up_2'
  | 'follow_up_3'
  | 'break_up'
  | 'reply_needed'
  | 'post_meeting';

export type FollowUpUrgency = 'overdue' | 'due_today' | 'upcoming';
export type FilterType = 'all' | 'overdue' | 'due_today' | 'upcoming' | 'urgent' | 'new_leads' | 'cold_sequence';

export const FOLLOW_UP_STAGES = ['researched', 'email_drafted', 'email_sent', 'replied', 'follow_up', 'no_response', 'meeting_held', 'meeting_booked'] as const;

export const ACTION_LABELS: Record<FollowUpType, { label: string; short: string; description: string }> = {
  run_research: { label: 'Run AI Research', short: 'Research', description: 'Perform deep research to find SMYKM hooks and personal details.' },
  prep_meeting: { label: 'Prep for Meeting', short: 'Prep', description: 'Generate a battle card and prep research for the upcoming call.' },
  initial_outreach: { label: 'Initial SMYKM Outreach', short: 'Initial', description: 'Start the conversation with deep research and a McKenna/Hormozi CTA.' },
  review_draft: { label: 'Review Drafted Email', short: 'Review', description: 'An email is drafted and ready for human review before sending.' },
  follow_up_1: { label: 'Bump (Day 4)', short: 'Bump', description: 'Short 2-3 sentence bump with a new SMYKM hook. No reference to the original.' },
  follow_up_2: { label: 'Lead Magnet (Day 9)', short: 'Value Drop', description: 'Hormozi approach: deliver value, offer a free breakdown or resource.' },
  follow_up_3: { label: 'Channel Switch (Day 14)', short: 'Channel Switch', description: 'Move to LinkedIn or Twitter DM. Short, casual, acknowledge the emails.' },
  break_up: { label: 'Break-up (Day 21+)', short: 'Break-up', description: 'Last email. Give them an easy out. Leave the door open.' },
  reply_needed: { label: 'Reply to Response', short: 'Reply', description: 'They replied! Use ACA framework: Acknowledge, Compliment, Ask.' },
  post_meeting: { label: 'Post-Meeting Follow-up', short: 'Post-Meeting', description: 'Send follow-up within 24 hours with next steps.' },
};

const URGENT_FOLLOW_UP_TYPES: FollowUpType[] = ['reply_needed', 'post_meeting', 'prep_meeting'];
const NEW_LEAD_TYPES: FollowUpType[] = ['initial_outreach', 'run_research', 'review_draft'];
const MS_PER_DAY = 86_400_000;

function daysSince(date: string, now = Date.now()) {
  return Math.floor((now - new Date(date).getTime()) / MS_PER_DAY);
}

function classifyUrgency(days: number, dueDays: number, overdueDays: number): FollowUpUrgency {
  if (days >= overdueDays) return 'overdue';
  if (days >= dueDays) return 'due_today';
  return 'upcoming';
}

function isUrgentType(type: FollowUpType) {
  return URGENT_FOLLOW_UP_TYPES.includes(type);
}

function isNewLeadType(type: FollowUpType) {
  return NEW_LEAD_TYPES.includes(type);
}

export function computeFollowUp(lead: Lead, allEmails: LeadEmail[], now = Date.now()): FollowUpItem | null {
  const lastEmail = allEmails.length > 0 ? allEmails[0] : null;
  const outboundEmails = allEmails.filter(e => e.direction === 'outbound');
  const lastOutbound = outboundEmails[0];
  const lastOutboundDate = lastOutbound?.sent_at || lastOutbound?.created_at;
  const inboundEmails = allEmails.filter(e => e.direction === 'inbound');
  const lastInbound = inboundEmails[0];
  const outboundCount = outboundEmails.length;
  const inboundCount = inboundEmails.length;

  if (lead.stage === 'researched') {
    const hasResearch = (lead.smykm_hooks && lead.smykm_hooks.length > 0) || lead.company_description;
    const daysSinceCreated = daysSince(lead.created_at, now);

    if (!hasResearch) {
      return {
        lead, lastEmail, daysSinceLastContact: daysSinceCreated,
        suggestedAction: ACTION_LABELS.run_research.description,
        suggestedType: 'run_research', suggestedChannel: 'email',
        urgency: classifyUrgency(daysSinceCreated, 1, 2),
        sequenceDay: 'New Lead', outboundCount, inboundCount,
      };
    }

    if (outboundCount > 0) return null;
    return {
      lead, lastEmail, daysSinceLastContact: daysSinceCreated,
      suggestedAction: ACTION_LABELS.initial_outreach.description,
      suggestedType: 'initial_outreach', suggestedChannel: 'email',
      urgency: classifyUrgency(daysSinceCreated, 1, 3),
      sequenceDay: 'Day 0 (Initial)', outboundCount, inboundCount,
    };
  }

  if (lead.stage === 'email_drafted') {
    const daysSinceUpdated = daysSince(lead.updated_at, now);
    return {
      lead, lastEmail, daysSinceLastContact: daysSinceUpdated,
      suggestedAction: ACTION_LABELS.review_draft.description,
      suggestedType: 'review_draft', suggestedChannel: 'email',
      urgency: classifyUrgency(daysSinceUpdated, 1, 2),
      sequenceDay: 'Draft Ready', outboundCount, inboundCount,
    };
  }

  if (lead.stage === 'replied') {
    const replyDate = lastInbound?.replied_at || lastInbound?.created_at || lead.last_inbound_at;
    if (!replyDate) return null;
    const daysSinceReply = daysSince(replyDate, now);
    if (lastOutboundDate && new Date(lastOutboundDate) > new Date(replyDate)) return null;
    return {
      lead, lastEmail, daysSinceLastContact: daysSinceReply,
      suggestedAction: 'They replied. Respond using ACA framework.',
      suggestedType: 'reply_needed', suggestedChannel: 'email',
      urgency: classifyUrgency(daysSinceReply, 1, 3),
      sequenceDay: `${daysSinceReply}d since reply`, outboundCount, inboundCount,
    };
  }

  if (lead.stage === 'meeting_held') {
    const meetingDate = lead.last_contacted_at || lead.updated_at;
    if (!meetingDate) return null;
    const daysSinceMeeting = daysSince(meetingDate, now);
    if (lastOutboundDate && new Date(lastOutboundDate) > new Date(meetingDate)) return null;
    return {
      lead, lastEmail, daysSinceLastContact: daysSinceMeeting,
      suggestedAction: 'Send post-meeting follow-up with next steps',
      suggestedType: 'post_meeting', suggestedChannel: 'email',
      urgency: classifyUrgency(daysSinceMeeting, 1, 3),
      sequenceDay: `${daysSinceMeeting}d since meeting`, outboundCount, inboundCount,
    };
  }

  if (lead.stage === 'meeting_booked') {
    if (lead.battle_card) return null;
    const daysSinceBooked = daysSince(lead.updated_at, now);
    return {
      lead, lastEmail, daysSinceLastContact: daysSinceBooked,
      suggestedAction: ACTION_LABELS.prep_meeting.description,
      suggestedType: 'prep_meeting', suggestedChannel: 'email',
      urgency: classifyUrgency(daysSinceBooked, 1, 2),
      sequenceDay: 'Meeting Booked', outboundCount, inboundCount,
    };
  }

  if (!lastOutboundDate) return null;
  const daysSinceLastOutbound = daysSince(lastOutboundDate, now);

  const sequence = [
    { type: 'follow_up_1' as const, channel: 'email' as const, afterOutboundCount: 1, waitDays: 3, label: 'Day 4', overdueDays: 7 },
    { type: 'follow_up_2' as const, channel: 'email' as const, afterOutboundCount: 2, waitDays: 5, label: 'Day 9', overdueDays: 9 },
    { type: 'follow_up_3' as const, channel: 'linkedin' as const, afterOutboundCount: 3, waitDays: 5, label: 'Day 14', overdueDays: 9 },
    { type: 'break_up' as const, channel: 'email' as const, afterOutboundCount: 4, waitDays: 7, label: 'Day 21+', overdueDays: 14 },
  ];

  const nextStep = sequence.find(step => outboundCount <= step.afterOutboundCount);
  if (!nextStep) return null;

  const isDue = daysSinceLastOutbound >= nextStep.waitDays;
  if (!isDue && daysSinceLastOutbound < nextStep.waitDays - 1) return null;

  return {
    lead, lastEmail, daysSinceLastContact: daysSinceLastOutbound,
    suggestedAction: ACTION_LABELS[nextStep.type].description,
    suggestedType: nextStep.type,
    suggestedChannel: nextStep.channel,
    urgency: classifyUrgency(daysSinceLastOutbound, nextStep.waitDays, nextStep.overdueDays),
    sequenceDay: nextStep.label,
    outboundCount,
    inboundCount,
  };
}

export function sortFollowUps(items: FollowUpItem[]) {
  const urgencyOrder = { overdue: 0, due_today: 1, upcoming: 2 };

  return [...items].sort((a, b) => {
    const icpA = a.lead.icp_score || 0;
    const icpB = b.lead.icp_score || 0;
    if (icpA >= 70 && icpB < 70) return -1;
    if (icpA < 70 && icpB >= 70) return 1;

    const isUrgentA = isUrgentType(a.suggestedType);
    const isUrgentB = isUrgentType(b.suggestedType);
    if (isUrgentA && !isUrgentB) return -1;
    if (!isUrgentA && isUrgentB) return 1;

    const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;

    if (icpA !== icpB) return icpB - icpA;

    const isNewA = isNewLeadType(a.suggestedType);
    const isNewB = isNewLeadType(b.suggestedType);
    if (isNewA && !isNewB && a.lead.priority === 'high') return -1;
    if (!isNewA && isNewB && b.lead.priority === 'high') return 1;

    return b.daysSinceLastContact - a.daysSinceLastContact;
  });
}

export function filterFollowUps(items: FollowUpItem[], filter: FilterType) {
  return items.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'overdue') return item.urgency === 'overdue';
    if (filter === 'due_today') return item.urgency === 'due_today';
    if (filter === 'upcoming') return item.urgency === 'upcoming';
    if (filter === 'urgent') return isUrgentType(item.suggestedType);
    if (filter === 'new_leads') return isNewLeadType(item.suggestedType);
    if (filter === 'cold_sequence') return !isUrgentType(item.suggestedType) && !isNewLeadType(item.suggestedType);
    return true;
  });
}

export function getFollowUpCounts(items: FollowUpItem[]) {
  return {
    overdue: items.filter(i => i.urgency === 'overdue').length,
    dueToday: items.filter(i => i.urgency === 'due_today').length,
    urgent: items.filter(i => isUrgentType(i.suggestedType)).length,
    newLeads: items.filter(i => isNewLeadType(i.suggestedType)).length,
    coldSequence: items.filter(i => !isUrgentType(i.suggestedType) && !isNewLeadType(i.suggestedType)).length,
  };
}
