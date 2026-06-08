import type { Lead, LeadType, PipelineStage } from '@/types/leads'

export type SalesActionPriority = 'critical' | 'high' | 'medium' | 'low'
export type SalesActionCategory =
  | 'reply'
  | 'follow_up'
  | 'meeting'
  | 'meeting_recap'
  | 'prospecting'
  | 'research'
  | 'meeting_prep'
  | 'review'
  | 'investor_memo'

export type SalesActionTargetTab = 'overview' | 'emails' | 'conversation' | 'company' | 'memory'

export interface SalesAction {
  id: string
  leadId: string
  leadName: string
  leadType: LeadType
  leadStage: PipelineStage
  companyName: string
  priority: SalesActionPriority
  category: SalesActionCategory
  title: string
  reason: string
  recommendedAction: string
  ctaLabel: string
  ctaHref: string
  score: number
  targetTab?: SalesActionTargetTab
  supportingSignals?: string[]
}

export type ActionLead = Pick<
  Lead,
  | 'id'
  | 'contact_name'
  | 'company_name'
  | 'stage'
  | 'type'
  | 'icp_score'
  | 'last_contacted_at'
  | 'last_inbound_at'
  | 'last_outbound_at'
  | 'updated_at'
  | 'conversation_next_step'
  | 'conversation_signals'
  | 'smykm_hooks'
  | 'company_description'
  | 'battle_card'
  | 'investor_memo'
  | 'total_emails_out'
>

type ActionEmail = {
  lead_id: string
  direction?: string | null
  created_at: string
  sent_at?: string | null
  replied_at?: string | null
}

export interface SalesActionPlanInput {
  leads: ActionLead[]
  outboundEmails: ActionEmail[]
  inboundEmails: ActionEmail[]
  now?: Date
}

const DAY_MS = 24 * 60 * 60 * 1000
const ACTION_LIMIT = 5

export function getLeadBestAction({
  lead,
  latestInboundAt,
  latestOutboundAt,
  outboundCount,
  now = new Date(),
}: {
  lead: ActionLead
  latestInboundAt: Date | null
  latestOutboundAt: Date | null
  outboundCount: number
  now?: Date
}): SalesAction | null {
  const icp = lead.icp_score ?? 0
  const daysSinceInbound = daysSince(latestInboundAt, now)
  const daysSinceOutbound = daysSince(latestOutboundAt, now)
  const actions: SalesAction[] = []

  // 1. Reply Needed
  if (lead.stage === 'replied') {
    actions.push({
      id: `${lead.id}:reply`,
      leadId: lead.id,
      leadName: lead.contact_name,
      leadType: lead.type,
      leadStage: lead.stage,
      companyName: lead.company_name,
      priority: 'critical',
      category: 'reply',
      title: `Reply to ${lead.contact_name}`,
      reason: latestInboundAt
        ? `${lead.company_name} replied ${formatDaysAgo(daysSinceInbound)}.`
        : `${lead.company_name} is waiting on your response.`,
      recommendedAction: lead.conversation_next_step || 'Send a thoughtful ACA reply and lock the next step.',
      ctaLabel: 'Open thread',
      ctaHref: `/leads/${lead.id}?tab=emails`,
      targetTab: 'emails',
      score: 1200 + icp + recencyBoost(daysSinceInbound),
      supportingSignals: compactSignals([
        latestInboundAt ? `Inbound reply ${formatDaysAgo(daysSinceInbound)}` : 'Inbound reply detected',
        icp >= 80 ? 'High ICP target' : null,
      ]),
    })
  }

  // 2. Review Draft
  if (lead.stage === 'email_drafted') {
    actions.push({
      id: `${lead.id}:review`,
      leadId: lead.id,
      leadName: lead.contact_name,
      leadType: lead.type,
      leadStage: lead.stage,
      companyName: lead.company_name,
      priority: 'critical',
      category: 'review',
      title: `Review draft for ${lead.contact_name}`,
      reason: 'A personalized draft is ready for review.',
      recommendedAction: 'Review the AI draft, refine the SMYKM hook, and send to advance the pipeline.',
      ctaLabel: 'Review',
      ctaHref: `/leads/${lead.id}?tab=emails`,
      targetTab: 'emails',
      score: 1100 + icp,
      supportingSignals: compactSignals([
        'Draft ready for review',
        lead.smykm_hooks && lead.smykm_hooks.length > 0 ? `${lead.smykm_hooks.length} hooks available` : null,
      ]),
    })
  }

  // 3. Meeting Prep
  if (lead.stage === 'meeting_booked') {
    const hasBattleCard = !!lead.battle_card

    if (!hasBattleCard) {
      actions.push({
        id: `${lead.id}:meeting-prep`,
        leadId: lead.id,
        leadName: lead.contact_name,
        leadType: lead.type,
        leadStage: lead.stage,
        companyName: lead.company_name,
        priority: 'critical',
        category: 'meeting_prep',
        title: `Prep meeting with ${lead.contact_name}`,
        reason: `Need battle card for ${lead.company_name} meeting.`,
        recommendedAction: 'Generate a battle card to identify attack surface, pitch angles, and objections.',
        ctaLabel: 'Run Prep',
        ctaHref: `/leads/${lead.id}`,
        targetTab: 'overview',
        score: 950 + icp + recencyBoost(daysSinceInbound ?? daysSinceOutbound),
        supportingSignals: compactSignals(['Meeting booked', 'Battle card missing']),
      })
    } else {
      actions.push({
        id: `${lead.id}:meeting`,
        leadId: lead.id,
        leadName: lead.contact_name,
        leadType: lead.type,
        leadStage: lead.stage,
        companyName: lead.company_name,
        priority: 'high',
        category: 'meeting',
        title: `Review prep for ${lead.contact_name}`,
        reason: `${lead.company_name} meeting is booked.`,
        recommendedAction: 'Review battle card, SMYKM hooks, and objection handlers before the call.',
        ctaLabel: 'Prep deal',
        ctaHref: `/leads/${lead.id}`,
        targetTab: 'overview',
        score: 780 + icp + recencyBoost(daysSinceInbound ?? daysSinceOutbound),
        supportingSignals: compactSignals(['Meeting booked', 'Battle card ready']),
      })
    }
  }

  // 4. Meeting Recap / Investor Memo
  if (lead.stage === 'meeting_held') {
    actions.push({
      id: `${lead.id}:meeting-recap`,
      leadId: lead.id,
      leadName: lead.contact_name,
      leadType: lead.type,
      leadStage: lead.stage,
      companyName: lead.company_name,
      priority: 'high',
      category: 'meeting_recap',
      title: `Send recap to ${lead.contact_name}`,
      reason: `Meeting completed with ${lead.company_name}.`,
      recommendedAction: 'Send a recap with agreed pains, next milestone, owner, and deadline.',
      ctaLabel: 'Send recap',
      ctaHref: `/leads/${lead.id}?tab=emails`,
      targetTab: 'emails',
      score: 920 + icp + recencyBoost(daysSinceInbound ?? daysSinceOutbound),
      supportingSignals: compactSignals(['Meeting held', 'Recap pending']),
    })

    if (lead.type === 'investor' && !lead.investor_memo) {
      actions.push({
        id: `${lead.id}:investor-memo`,
        leadId: lead.id,
        leadName: lead.contact_name,
        leadType: lead.type,
        leadStage: lead.stage,
        companyName: lead.company_name,
        priority: 'high',
        category: 'investor_memo',
        title: `Draft memo for ${lead.contact_name}`,
        reason: `${lead.company_name} meeting is complete and needs a tailored investor memo.`,
        recommendedAction: 'Generate the investor memo while the conversation context is fresh.',
        ctaLabel: 'Generate memo',
        ctaHref: `/leads/${lead.id}`,
        targetTab: 'overview',
        score: 880 + icp + recencyBoost(daysSinceInbound ?? daysSinceOutbound),
        supportingSignals: compactSignals(['Investor meeting held', 'Memo missing']),
      })
    }
  }

  // 5. Investor Memo (General)
  if (lead.type === 'investor' && !lead.investor_memo && ['researched', 'email_sent', 'follow_up', 'no_response', 'meeting_booked'].includes(lead.stage)) {
    const isBooked = lead.stage === 'meeting_booked'
    actions.push({
      id: `${lead.id}:investor-memo-gen`,
      leadId: lead.id,
      leadName: lead.contact_name,
      leadType: lead.type,
      leadStage: lead.stage,
      companyName: lead.company_name,
      priority: isBooked || icp >= 80 ? 'high' : 'medium',
      category: 'investor_memo',
      title: `Generate memo for ${lead.contact_name}`,
      reason: isBooked
        ? `${lead.company_name} meeting is booked but lacks a personalized memo.`
        : `${lead.contact_name} is an investor lead missing a personalized memo.`,
      recommendedAction: isBooked
        ? 'Create an Amazon-style one-page memo to share with the investor.'
        : 'Create an Amazon-style one-pager to drop in the next follow-up.',
      ctaLabel: 'Generate memo',
      ctaHref: `/leads/${lead.id}`,
      targetTab: 'overview',
      score: (isBooked ? 880 : 840) + icp,
      supportingSignals: compactSignals(['Investor lead', 'Memo missing', isBooked ? 'Meeting booked' : null]),
    })
  }

  // 6. Follow-up
  const needsFollowUp = ['email_sent', 'follow_up', 'no_response'].includes(lead.stage)
    && (daysSinceOutbound === null || daysSinceOutbound >= 3)

  if (needsFollowUp) {
    const followUp = followUpPlay(outboundCount)
    actions.push({
      id: `${lead.id}:follow-up`,
      leadId: lead.id,
      leadName: lead.contact_name,
      leadType: lead.type,
      leadStage: lead.stage,
      companyName: lead.company_name,
      priority: daysSinceOutbound === null || daysSinceOutbound >= 5 || icp >= 80 ? 'high' : 'medium',
      category: 'follow_up',
      title: `${followUp.label} with ${lead.contact_name}`,
      reason: daysSinceOutbound === null
        ? `${lead.company_name} has no recorded recent outbound touch.`
        : `Last outbound was ${formatDaysAgo(daysSinceOutbound)}.`,
      recommendedAction: followUp.recommendedAction,
      ctaLabel: followUp.label,
      ctaHref: `/leads/${lead.id}?tab=emails`,
      targetTab: 'emails',
      score: 820 + icp + Math.min(daysSinceOutbound ?? 6, 10) * 12,
      supportingSignals: compactSignals([
        outboundCount > 0 ? `${outboundCount} touchpoints sent` : 'No touches yet',
        daysSinceOutbound != null ? `${formatDaysAgo(daysSinceOutbound)} since last email` : null,
      ]),
    })
  }

  // 7. Research & Prospecting
  if (lead.stage === 'researched') {
    const hasResearch = !!lead.company_description && !!lead.smykm_hooks && lead.smykm_hooks.length > 0
    const hasPositiveSignal = lead.conversation_signals?.some((signal) => {
      if (!['positive', 'action_needed', 'upsell_opportunity'].includes(signal.type)) return false
      const detectedAt = new Date(signal.detected_at)
      return Number.isFinite(detectedAt.getTime()) && now.getTime() - detectedAt.getTime() <= 7 * DAY_MS
    })

    if (!hasResearch) {
      actions.push({
        id: `${lead.id}:research`,
        leadId: lead.id,
        leadName: lead.contact_name,
        leadType: lead.type,
        leadStage: lead.stage,
        companyName: lead.company_name,
        priority: icp >= 80 ? 'high' : 'medium',
        category: 'research',
        title: `Research ${lead.contact_name}`,
        reason: `${lead.company_name} needs deep SMYKM hooks or company context.`,
        recommendedAction: 'Run AI research to find personal details and attack surface notes.',
        ctaLabel: 'Run Research',
        ctaHref: `/leads/${lead.id}`,
        targetTab: 'overview',
        score: 850 + icp,
        supportingSignals: compactSignals(['Research incomplete', icp >= 80 ? 'High priority target' : null]),
      })
    } else if (icp >= 75) {
      actions.push({
        id: `${lead.id}:prospecting`,
        leadId: lead.id,
        leadName: lead.contact_name,
        leadType: lead.type,
        leadStage: lead.stage,
        companyName: lead.company_name,
        priority: hasPositiveSignal || icp >= 90 ? 'high' : 'medium',
        category: 'prospecting',
        title: `Draft outreach to ${lead.contact_name}`,
        reason: `${lead.company_name} is a strong ICP fit (${icp}/100) and has not entered outreach.`,
        recommendedAction: 'Create a personalized SMYKM opener using the strongest research hook.',
        ctaLabel: 'Draft email',
        ctaHref: `/leads/${lead.id}?tab=emails`,
        targetTab: 'emails',
        score: 650 + icp + (hasPositiveSignal ? 100 : 0),
        supportingSignals: compactSignals([
          `Strong ICP fit (${icp})`,
          hasPositiveSignal ? 'Recent positive signal' : null,
          'Ready for outreach',
        ]),
      })
    }
  }

  if (actions.length === 0) return null

  // Sort by score and return the best one
  return actions.sort((a, b) => b.score - a.score)[0]
}

export function buildSalesActionPlan({
  leads,
  outboundEmails,
  inboundEmails,
  now = new Date(),
}: SalesActionPlanInput): SalesAction[] {
  const outboundByLead = latestEmailByLead(outboundEmails)
  const inboundByLead = latestEmailByLead(inboundEmails)
  const outboundCountByLead = emailCountByLead(outboundEmails)
  const actions: SalesAction[] = []

  for (const lead of leads) {
    const latestInboundAt = mostRecentDate([lead.last_inbound_at, inboundByLead.get(lead.id)?.created_at])
    const latestOutboundAt = mostRecentDate([
      lead.last_outbound_at,
      lead.last_contacted_at,
      outboundByLead.get(lead.id)?.sent_at,
      outboundByLead.get(lead.id)?.created_at,
    ])
    const outboundCount = lead.total_emails_out ?? outboundCountByLead.get(lead.id) ?? 0

    const bestAction = getLeadBestAction({
      lead,
      latestInboundAt,
      latestOutboundAt,
      outboundCount,
      now,
    })

    if (bestAction) {
      actions.push(bestAction)
    }
  }

  return actions
    .sort((a, b) => b.score - a.score || a.companyName.localeCompare(b.companyName))
    .slice(0, ACTION_LIMIT)
}

function latestEmailByLead(emails: ActionEmail[]) {
  const map = new Map<string, ActionEmail>()
  for (const email of emails) {
    const current = map.get(email.lead_id)
    if (!current || new Date(email.created_at).getTime() > new Date(current.created_at).getTime()) {
      map.set(email.lead_id, email)
    }
  }
  return map
}

function emailCountByLead(emails: ActionEmail[]) {
  const map = new Map<string, number>()
  for (const email of emails) {
    map.set(email.lead_id, (map.get(email.lead_id) ?? 0) + 1)
  }
  return map
}

function followUpPlay(outboundCount: number) {
  if (outboundCount === 1) {
    return {
      label: 'Bump',
      recommendedAction: 'Send a short 2-3 sentence bump with a new SMYKM hook.',
    }
  }

  if (outboundCount === 2) {
    return {
      label: 'Value Drop',
      recommendedAction: 'Use the Hormozi approach: deliver value with a free resource, teardown, or breakdown.',
    }
  }

  if (outboundCount >= 3) {
    return {
      label: 'Channel Switch',
      recommendedAction: 'Move to LinkedIn or Twitter DM with a short, casual opener.',
    }
  }

  return {
    label: 'Follow up',
    recommendedAction: 'Send the next concise, value-led follow-up and add a clear low-friction CTA.',
  }
}

export function mostRecentDate(values: Array<string | null | undefined | Date>) {
  const timestamps = values
    .map((value) => {
      if (!value) return Number.NaN
      if (value instanceof Date) return value.getTime()
      return new Date(value).getTime()
    })
    .filter(Number.isFinite)

  if (timestamps.length === 0) return null
  return new Date(Math.max(...timestamps))
}

function daysSince(date: Date | null, now: Date) {
  if (!date) return null
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS))
}

function recencyBoost(days: number | null) {
  if (days === null) return 0
  return Math.max(0, 50 - days * 10)
}

function formatDaysAgo(days: number | null) {
  if (days === null) return 'recently'
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

function compactSignals(signals: Array<string | null | undefined>) {
  return signals.filter((signal): signal is string => Boolean(signal)).slice(0, 3)
}
