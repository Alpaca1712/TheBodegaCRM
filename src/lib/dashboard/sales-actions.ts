import type { Lead, LeadType, PipelineStage } from '@/types/leads'

export type SalesActionPriority = 'critical' | 'high' | 'medium'
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

    // 1. REPLIED -> Reply (Critical)
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
        ctaHref: `/leads/${lead.id}`,
        score: 1000 + icp + recencyBoost(daysSinceInbound),
      })
      continue
    }

    // 2. EMAIL_DRAFTED -> Review (High)
    if (lead.stage === 'email_drafted') {
      actions.push({
        id: `${lead.id}:review`,
        leadId: lead.id,
        leadName: lead.contact_name,
        leadType: lead.type,
        leadStage: lead.stage,
        companyName: lead.company_name,
        priority: 'high',
        category: 'review',
        title: `Review draft for ${lead.contact_name}`,
        reason: `A personalized outreach draft is ready for your final review.`,
        recommendedAction: 'Check for SMYKM accuracy and hit send to advance the pipeline.',
        ctaLabel: 'Review',
        ctaHref: `/leads/${lead.id}`,
        score: 900 + icp,
      })
      continue
    }

    // 3. MEETING_BOOKED (No battle card) -> Meeting Prep (High)
    if (lead.stage === 'meeting_booked' && !lead.battle_card) {
      actions.push({
        id: `${lead.id}:prep`,
        leadId: lead.id,
        leadName: lead.contact_name,
        leadType: lead.type,
        leadStage: lead.stage,
        companyName: lead.company_name,
        priority: 'high',
        category: 'meeting_prep',
        title: `Run prep for ${lead.contact_name}`,
        reason: `Meeting is booked but deep battle card research is missing.`,
        recommendedAction: 'Generate a battle card to identify technical vulnerabilities and objection handlers.',
        ctaLabel: 'Prep',
        ctaHref: `/leads/${lead.id}`,
        score: 850 + icp,
      })
      continue
    }

    // 4. INVESTOR (No memo) -> Investor Memo (High)
    if (lead.type === 'investor' && !lead.investor_memo && ['researched', 'email_sent', 'replied'].includes(lead.stage)) {
      actions.push({
        id: `${lead.id}:memo`,
        leadId: lead.id,
        leadName: lead.contact_name,
        leadType: lead.type,
        leadStage: lead.stage,
        companyName: lead.company_name,
        priority: icp >= 80 ? 'high' : 'medium',
        category: 'investor_memo',
        title: `Generate memo for ${lead.contact_name}`,
        reason: `${lead.contact_name} is a high-value investor missing a personalized memo.`,
        recommendedAction: 'Create an Amazon-style one-pager to drop in the next follow-up.',
        ctaLabel: 'Memo',
        ctaHref: `/leads/${lead.id}`,
        score: 840 + icp,
      })
      // We don't continue here because they might also need follow-up
    }

    // 5. FOLLOW-UP (Normal sequence)
    const needsFollowUp = ['email_sent', 'follow_up', 'no_response'].includes(lead.stage)
      && (daysSinceOutbound === null || daysSinceOutbound >= 3)

    if (needsFollowUp) {
      actions.push({
        id: `${lead.id}:follow-up`,
        leadId: lead.id,
        leadName: lead.contact_name,
        leadType: lead.type,
        leadStage: lead.stage,
        companyName: lead.company_name,
        priority: daysSinceOutbound === null || daysSinceOutbound >= 5 || icp >= 80 ? 'high' : 'medium',
        category: 'follow_up',
        title: `Follow up with ${lead.contact_name}`,
        reason: daysSinceOutbound === null
          ? `${lead.company_name} has no recorded recent outbound touch.`
          : `Last outbound was ${formatDaysAgo(daysSinceOutbound)}.`,
        recommendedAction: 'Send the next concise, value-led follow-up and add a clear low-friction CTA.',
        ctaLabel: 'Follow up',
        ctaHref: `/leads/${lead.id}`,
        score: 820 + icp + Math.min(daysSinceOutbound ?? 6, 10) * 12,
      })
      continue
    }

    // 6. MEETING_HELD -> Recap (Medium)
    if (lead.stage === 'meeting_held') {
      actions.push({
        id: `${lead.id}:meeting-recap`,
        leadId: lead.id,
        leadName: lead.contact_name,
        leadType: lead.type,
        leadStage: lead.stage,
        companyName: lead.company_name,
        priority: 'medium',
        category: 'meeting',
        title: `Send recap to ${lead.contact_name}`,
        reason: `${lead.company_name} meeting completed. Momentum requires a fast recap.`,
        recommendedAction: 'Send a recap with agreed pains, next milestone, owner, and deadline.',
        ctaLabel: 'Recap',
        ctaHref: `/leads/${lead.id}`,
        score: 780 + icp,
      })
      continue
    }

    // 7. RESEARCHED (No hooks) -> Research (Medium)
    if (lead.stage === 'researched' && (!lead.smykm_hooks || lead.smykm_hooks.length === 0)) {
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
        reason: `Lead is qualified but missing deep SMYKM homework.`,
        recommendedAction: 'Run deep research to find blog posts, podcasts, or GitHub activity.',
        ctaLabel: 'Research',
        ctaHref: `/leads/${lead.id}`,
        score: 750 + icp,
      })
      continue
    }

    // 8. RESEARCHED (With hooks) -> Prospecting (Medium)
    if (lead.stage === 'researched' && icp >= 75) {
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
        priority: hasPositiveSignal || icp >= 90 ? 'medium' : 'medium',
        category: 'prospecting',
        title: `Draft outreach to ${lead.contact_name}`,
        reason: `${lead.company_name} is outreach-ready with hooks and strong ICP fit.`,
        recommendedAction: 'Create a personalized SMYKM opener using the strongest research hook.',
        ctaLabel: 'Draft email',
        ctaHref: `/leads/${lead.id}`,
        score: 650 + icp + (hasPositiveSignal ? 40 : 0),
      })
    }
  }

  // Remove duplicate leads (e.g. if they have both memo and follow-up)
  // Keep the one with the higher score
  const uniqueActions = new Map<string, SalesAction>()
  for (const action of actions) {
    const existing = uniqueActions.get(action.leadId)
    if (!existing || action.score > existing.score) {
      uniqueActions.set(action.leadId, action)
    }
  }

  return Array.from(uniqueActions.values())
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
