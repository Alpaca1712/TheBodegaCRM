import type { Lead, LeadType, PipelineStage } from '@/types/leads'

export type SalesActionPriority = 'critical' | 'high' | 'medium' | 'low'
export type SalesActionCategory =
  | 'reply'
  | 'follow_up'
  | 'meeting'
  | 'prospecting'
  | 'research'
  | 'meeting_prep'
  | 'review'
  | 'investor_memo'

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

export function buildSalesActionPlan({
  leads,
  outboundEmails,
  inboundEmails,
  now = new Date(),
}: SalesActionPlanInput): SalesAction[] {
  const outboundByLead = latestEmailByLead(outboundEmails)
  const inboundByLead = latestEmailByLead(inboundEmails)
  const outboundCountByLead = emailCountByLead(outboundEmails)

  const allActions: SalesAction[] = []

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
      now
    })

    if (bestAction) {
      allActions.push(bestAction)
    }
  }

  return allActions
    .sort((a, b) => b.score - a.score || a.companyName.localeCompare(b.companyName))
    .slice(0, ACTION_LIMIT)
}

export interface GetLeadBestActionInput {
  lead: ActionLead
  latestInboundAt: Date | null
  latestOutboundAt: Date | null
  outboundCount: number
  now?: Date
}

export function getLeadBestAction({
  lead,
  latestInboundAt,
  latestOutboundAt,
  outboundCount,
  now = new Date()
}: GetLeadBestActionInput): SalesAction | null {
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
      score: 1_200 + icp + recencyBoost(daysSinceInbound),
      supportingSignals: compactSignals([
        daysSinceInbound != null ? `Inbound reply ${daysSinceInbound} days ago` : 'Inbound reply detected',
        icp >= 80 ? 'High ICP target' : null
      ])
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
      score: 1_100 + icp,
      supportingSignals: compactSignals([
        'AI draft waiting',
        lead.smykm_hooks && lead.smykm_hooks.length > 0 ? `${lead.smykm_hooks.length} SMYKM hooks` : null
      ])
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
        score: 950 + icp + recencyBoost(daysSinceInbound ?? daysSinceOutbound),
        supportingSignals: ['Meeting booked', 'Missing battle card']
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
        score: 780 + icp + recencyBoost(daysSinceInbound ?? daysSinceOutbound),
        supportingSignals: ['Meeting booked', 'Battle card ready']
      })
    }
  }

  // 4. Post-Meeting / Recap
  if (lead.stage === 'meeting_held') {
    actions.push({
      id: `${lead.id}:meeting-recap`,
      leadId: lead.id,
      leadName: lead.contact_name,
      leadType: lead.type,
      leadStage: lead.stage,
      companyName: lead.company_name,
      priority: 'high',
      category: 'meeting',
      title: `Send recap to ${lead.contact_name}`,
      reason: `Meeting completed with ${lead.company_name}.`,
      recommendedAction: 'Send a recap with agreed pains, next milestone, owner, and deadline.',
      ctaLabel: 'Send recap',
      ctaHref: `/leads/${lead.id}?tab=emails`,
      score: 920 + icp + recencyBoost(daysSinceInbound ?? daysSinceOutbound),
      supportingSignals: ['Meeting held', 'Recap pending']
    })
  }

  // 5. Investor Memo (Special Investor action)
  if (lead.type === 'investor' && !lead.investor_memo) {
    const isHighPriority = ['meeting_booked', 'meeting_held'].includes(lead.stage)
    actions.push({
      id: `${lead.id}:investor-memo`,
      leadId: lead.id,
      leadName: lead.contact_name,
      leadType: lead.type,
      leadStage: lead.stage,
      companyName: lead.company_name,
      priority: isHighPriority ? 'high' : 'medium',
      category: 'investor_memo',
      title: `${lead.stage === 'meeting_held' ? 'Draft' : 'Generate'} memo for ${lead.contact_name}`,
      reason: `${lead.company_name} is an investor lead missing a personalized memo.`,
      recommendedAction: 'Create an Amazon-style one-page memo to share with the investor.',
      ctaLabel: 'Generate memo',
      ctaHref: `/leads/${lead.id}`,
      score: (isHighPriority ? 880 : 840) + icp,
      supportingSignals: ['Investor lead', 'Missing memo']
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
      score: 820 + icp + Math.min(daysSinceOutbound ?? 6, 10) * 12,
      supportingSignals: compactSignals([
        `${outboundCount} outbound touches`,
        daysSinceOutbound != null ? `${daysSinceOutbound} days since last contact` : null
      ])
    })
  }

  // 7. Research
  if (lead.stage === 'researched') {
    const hasResearch = !!lead.company_description && !!lead.smykm_hooks && lead.smykm_hooks.length > 0

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
        score: 850 + icp,
        supportingSignals: ['Inbound lead', 'Missing research']
      })
    } else if (icp >= 75) {
      const hasPositiveSignal = lead.conversation_signals?.some((signal) => {
        if (!['positive', 'action_needed', 'upsell_opportunity'].includes(signal.type)) return false
        const detectedAt = new Date(signal.detected_at)
        return Number.isFinite(detectedAt.getTime()) && now.getTime() - detectedAt.getTime() <= 7 * DAY_MS
      })

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
        score: 650 + icp + (hasPositiveSignal ? 100 : 0),
        supportingSignals: compactSignals([
          `ICP Score: ${icp}`,
          hasPositiveSignal ? 'Recent positive signal' : null,
          `${lead.smykm_hooks.length} research hooks ready`
        ])
      })
    }
  }

  if (actions.length === 0) return null

  // Return the highest scoring action for this lead
  return actions.sort((a, b) => b.score - a.score)[0]
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

export function mostRecentDate(values: Array<string | null | undefined>) {
  const timestamps = values
    .map((value) => value ? new Date(value).getTime() : Number.NaN)
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
