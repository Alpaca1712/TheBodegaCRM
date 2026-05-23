import type { Lead, LeadType } from '@/types/leads'

export type SalesActionPriority = 'critical' | 'high' | 'medium'
export type SalesActionCategory = 'reply' | 'follow_up' | 'meeting' | 'prospecting' | 'research' | 'review' | 'prep'

export interface SalesAction {
  id: string
  leadId: string
  leadName: string
  leadType: LeadType
  companyName: string
  priority: SalesActionPriority
  category: SalesActionCategory
  title: string
  reason: string
  recommendedAction: string
  ctaLabel: string
  ctaHref: string
  score: number
}

type ActionLead = Pick<
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
  const actions: SalesAction[] = []

  for (const lead of leads) {
    const icp = lead.icp_score ?? 0
    const latestInboundAt = mostRecentDate([lead.last_inbound_at, inboundByLead.get(lead.id)?.created_at])
    const latestOutboundAt = mostRecentDate([
      lead.last_outbound_at,
      lead.last_contacted_at,
      outboundByLead.get(lead.id)?.sent_at,
      outboundByLead.get(lead.id)?.created_at,
    ])
    const daysSinceInbound = daysSince(latestInboundAt, now)
    const daysSinceOutbound = daysSince(latestOutboundAt, now)

    const leadActions: SalesAction[] = []

    // 1. Reply (1000)
    if (lead.stage === 'replied') {
      leadActions.push({
        id: `${lead.id}:reply`,
        leadId: lead.id,
        leadName: lead.contact_name,
        leadType: lead.type,
        companyName: lead.company_name,
        priority: 'critical',
        category: 'reply',
        title: `Reply to ${lead.contact_name}`,
        reason: latestInboundAt
          ? `${lead.company_name} replied ${formatDaysAgo(daysSinceInbound)}.`
          : `${lead.company_name} is waiting on your response.`,
        recommendedAction: lead.conversation_next_step || 'Send a thoughtful ACA reply and lock the next step.',
        ctaLabel: 'Open thread',
        ctaHref: `/leads/${lead.id}`,
        score: 1_000 + icp + recencyBoost(daysSinceInbound),
      })
    }

    // 2. Review Draft (900)
    if (lead.stage === 'email_drafted') {
      leadActions.push({
        id: `${lead.id}:review`,
        leadId: lead.id,
        leadName: lead.contact_name,
        leadType: lead.type,
        companyName: lead.company_name,
        priority: 'high',
        category: 'review',
        title: `Review draft for ${lead.contact_name}`,
        reason: `An outreach draft is ready for your final approval.`,
        recommendedAction: 'Check the SMYKM hook and CTA before hitting send.',
        ctaLabel: 'Review',
        ctaHref: `/leads/${lead.id}`,
        score: 900 + icp,
      })
    }

    // 3. Meeting Prep (850)
    if (lead.stage === 'meeting_booked' && !lead.battle_card) {
      leadActions.push({
        id: `${lead.id}:prep`,
        leadId: lead.id,
        leadName: lead.contact_name,
        leadType: lead.type,
        companyName: lead.company_name,
        priority: 'high',
        category: 'prep',
        title: `Prep meeting with ${lead.contact_name}`,
        reason: `Meeting is booked but battle card and research are missing.`,
        recommendedAction: 'Run AI Prep to generate a battle card and discovery questions.',
        ctaLabel: 'Prep',
        ctaHref: `/leads/${lead.id}`,
        score: 850 + icp,
      })
    }

    // 4. Investor Memo (840)
    if (lead.type === 'investor' && !lead.investor_memo && icp >= 70) {
      leadActions.push({
        id: `${lead.id}:memo`,
        leadId: lead.id,
        leadName: lead.contact_name,
        leadType: lead.type,
        companyName: lead.company_name,
        priority: 'high',
        category: 'research',
        title: `Generate memo for ${lead.contact_name}`,
        reason: `${lead.company_name} is a high-fit investor needing a tailored memo.`,
        recommendedAction: 'Synthesize Rocoto facts with their thesis into a one-page memo.',
        ctaLabel: 'Generate Memo',
        ctaHref: `/leads/${lead.id}`,
        score: 840 + icp,
      })
    }

    // 5. Follow-up (820)
    const needsFollowUp = ['email_sent', 'follow_up', 'no_response'].includes(lead.stage)
      && (daysSinceOutbound === null || daysSinceOutbound >= 3)

    if (needsFollowUp) {
      const emailCount = lead.total_emails_out || 0
      let followUpTitle = 'Bump'
      let followUpRec = 'Send a concise, value-led bump.'

      if (emailCount === 1) {
        followUpTitle = 'Bump'
        followUpRec = 'Send a short 2-3 sentence bump with a new SMYKM hook.'
      } else if (emailCount === 2) {
        followUpTitle = 'Value Drop'
        followUpRec = 'Hormozi style: deliver a free resource or lead magnet.'
      } else if (emailCount >= 3) {
        followUpTitle = 'Channel Switch'
        followUpRec = 'Move to LinkedIn or Twitter to break the pattern.'
      }

      leadActions.push({
        id: `${lead.id}:follow-up`,
        leadId: lead.id,
        leadName: lead.contact_name,
        leadType: lead.type,
        companyName: lead.company_name,
        priority: daysSinceOutbound === null || daysSinceOutbound >= 5 || icp >= 80 ? 'high' : 'medium',
        category: 'follow_up',
        title: `${followUpTitle}: ${lead.contact_name}`,
        reason: daysSinceOutbound === null
          ? `${lead.company_name} has no recorded recent outbound touch.`
          : `Last outbound was ${formatDaysAgo(daysSinceOutbound)}.`,
        recommendedAction: followUpRec,
        ctaLabel: 'Follow up',
        ctaHref: `/leads/${lead.id}`,
        score: 820 + icp + Math.min(daysSinceOutbound ?? 6, 10) * 12,
      })
    }

    // 6. Meeting Recap (780)
    if (lead.stage === 'meeting_held') {
      leadActions.push({
        id: `${lead.id}:meeting`,
        leadId: lead.id,
        leadName: lead.contact_name,
        leadType: lead.type,
        companyName: lead.company_name,
        priority: 'high',
        category: 'meeting',
        title: `Send recap to ${lead.contact_name}`,
        reason: `${lead.company_name} meeting complete. Speed to recap is speed to deal.`,
        recommendedAction: 'Send a recap with agreed pains, next milestone, and deadline.',
        ctaLabel: 'Send Recap',
        ctaHref: `/leads/${lead.id}`,
        score: 780 + icp + recencyBoost(daysSinceInbound ?? daysSinceOutbound),
      })
    }

    // 7. Research (750)
    const needsResearch = lead.stage === 'researched' && (!lead.smykm_hooks || lead.smykm_hooks.length === 0 || !lead.company_description)
    if (needsResearch) {
      leadActions.push({
        id: `${lead.id}:research`,
        leadId: lead.id,
        leadName: lead.contact_name,
        leadType: lead.type,
        companyName: lead.company_name,
        priority: icp >= 80 ? 'high' : 'medium',
        category: 'research',
        title: `Research ${lead.contact_name}`,
        reason: `Lead is missing deep SMYKM hooks or company context.`,
        recommendedAction: 'Run AI Research to find personal details and technical vulnerabilities.',
        ctaLabel: 'Research',
        ctaHref: `/leads/${lead.id}`,
        score: 750 + icp,
      })
    }

    // 8. Prospecting (650)
    const hasPositiveSignal = lead.conversation_signals?.some((signal) => {
      if (!['positive', 'action_needed', 'upsell_opportunity'].includes(signal.type)) return false
      const detectedAt = new Date(signal.detected_at)
      return Number.isFinite(detectedAt.getTime()) && now.getTime() - detectedAt.getTime() <= 7 * DAY_MS
    })

    if (lead.stage === 'researched' && !needsResearch && icp >= 75) {
      leadActions.push({
        id: `${lead.id}:prospecting`,
        leadId: lead.id,
        leadName: lead.contact_name,
        leadType: lead.type,
        companyName: lead.company_name,
        priority: hasPositiveSignal || icp >= 90 ? 'medium' : 'medium',
        category: 'prospecting',
        title: `Draft outreach to ${lead.contact_name}`,
        reason: `${lead.company_name} is a strong ICP fit (${icp}/100) and has hooks ready.`,
        recommendedAction: 'Create a personalized SMYKM opener using the strongest research hook.',
        ctaLabel: 'Draft email',
        ctaHref: `/leads/${lead.id}`,
        score: 650 + icp + (hasPositiveSignal ? 40 : 0),
      })
    }

    // Pick only the highest scoring action for this lead
    if (leadActions.length > 0) {
      const bestAction = leadActions.sort((a, b) => b.score - a.score)[0]
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

function mostRecentDate(values: Array<string | null | undefined>) {
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
