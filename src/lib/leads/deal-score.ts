import type { Lead } from '@/types/leads';

export type DealScoreTier = 'hot' | 'warm' | 'nurture';

export interface DealScoreResult {
  score: number;
  tier: DealScoreTier;
  reasons: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function clamp(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function ageInDays(dateValue: string | null | undefined, now: Date) {
  if (!dateValue) return null;
  const time = new Date(dateValue).getTime();
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.floor((now.getTime() - time) / DAY_MS));
}

function hasWarmReply(lead: Lead) {
  const hasActionSignal = lead.conversation_signals?.some((signal) => signal.type === 'action_needed' || signal.type === 'positive') ?? false;
  const inboundTime = lead.last_inbound_at ? new Date(lead.last_inbound_at).getTime() : null;
  const outboundTime = lead.last_outbound_at ? new Date(lead.last_outbound_at).getTime() : null;
  return lead.stage === 'replied' || hasActionSignal || (inboundTime != null && (outboundTime == null || inboundTime > outboundTime));
}

function getTier(score: number): DealScoreTier {
  if (score >= 80) return 'hot';
  if (score >= 55) return 'warm';
  return 'nurture';
}

export function getDealScore(lead: Lead, now = new Date()): DealScoreResult {
  const reasons: string[] = [];
  let score = 20;

  const icp = lead.icp_score ?? 0;
  score += Math.min(35, Math.max(0, icp * 0.35));
  if (icp >= 80) reasons.push('Strong ICP fit');
  else if (icp >= 60) reasons.push('Good ICP fit');

  if (lead.priority === 'high') {
    score += 12;
    reasons.push('Marked high priority');
  } else if (lead.priority === 'medium') {
    score += 6;
  }

  if (hasWarmReply(lead)) {
    score += 25;
    reasons.push('Warm reply needs action');
  }

  if (lead.stage === 'meeting_booked' || lead.stage === 'meeting_held') {
    score += 18;
    reasons.push('Meeting momentum');
  } else if (lead.stage === 'email_sent' || lead.stage === 'follow_up') {
    score += 8;
    reasons.push('Active outbound sequence');
  } else if (lead.stage === 'email_drafted') {
    score += 6;
    reasons.push('Ready to send');
  }

  const researchSignals = [
    lead.smykm_hooks.length > 0,
    lead.research_sources.length > 0,
    Boolean(lead.company_website),
    Boolean(lead.contact_linkedin),
    Boolean(lead.contact_email),
    Boolean(lead.battle_card),
  ].filter(Boolean).length;
  score += Math.min(12, researchSignals * 2);
  if (researchSignals >= 4) reasons.push('Research-ready account');

  const staleDays = ageInDays(lead.last_outbound_at || lead.updated_at, now);
  if (staleDays != null && staleDays >= 21 && !hasWarmReply(lead)) {
    score -= 15;
    reasons.push(`Stale for ${staleDays} days`);
  }

  if (lead.stage === 'no_response') {
    score -= 22;
    reasons.push('No response after sequence');
  } else if (lead.stage === 'closed_lost') {
    score -= 40;
    reasons.push('Closed lost');
  } else if (lead.stage === 'closed_won') {
    score = 100;
    reasons.push('Closed won');
  }

  const finalScore = clamp(score);
  if (reasons.length === 0) reasons.push('Needs more research');

  return {
    score: finalScore,
    tier: getTier(finalScore),
    reasons,
  };
}

export function getDealScoreBadge(score: number): { label: string; className: string } {
  if (score >= 80) {
    return {
      label: 'Hot',
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    };
  }
  if (score >= 55) {
    return {
      label: 'Warm',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    };
  }
  return {
    label: 'Nurture',
    className: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  };
}
