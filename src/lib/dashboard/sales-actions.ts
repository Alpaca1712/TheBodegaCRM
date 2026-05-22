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

    // 1. REPLIES (CRITICAL)
    if (lead.stage === 'replied') {
      actions.push({
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
      continue
    }

    // 2. REVIEW DRAFT (HIGH)
    if (lead.stage === 'email_drafted') {
      actions.push({
        id: `${lead.id}:review`,
        leadId: lead.id,
        leadName: lead.contact_name,
        leadType: lead.type,
        companyName: lead.company_name,
        priority: 'high',
        category: 'review',
        title: `Review draft for ${lead.contact_name}`,
        reason: 'AI has generated a draft based on recent research/signals.',
        recommendedAction: 'Review the SMYKM opener, ensure factual accuracy, and hit send.',
        ctaLabel: 'Review',
        ctaHref: `/leads/${lead.id}`,
        score: 900 + icp,
      })
      continue
    }

    // 3. MEETING PREP (HIGH)
    if (lead.stage === 'meeting_booked' && !lead.battle_card) {
      actions.push({
        id: `${lead.id}:prep`,
        leadId: lead.id,
        leadName: lead.contact_name,
        leadType: lead.type,
        companyName: lead.company_name,
        priority: 'high',
        category: 'prep',
        title: `Prep meeting with ${lead.contact_name}`,
        reason: 'Meeting is booked but battle card is missing.',
        recommendedAction: 'Generate a battle card to review objection handlers and discovery questions.',
        ctaLabel: 'Prep',
        ctaHref: `/leads/${lead.id}`,
        score: 850 + icp,
      })
      continue
    }

    // 4. INVESTOR MEMO (HIGH)
    if (lead.stage === 'meeting_held' && lead.type === 'investor' && !lead.investor_memo) {
      actions.push({
        id: `${lead.id}:memo`,
        leadId: lead.id,
        leadName: lead.contact_name,
        leadType: lead.type,
        companyName: lead.company_name,
        priority: 'high',
        category: 'meeting',
        title: `Draft memo for ${lead.contact_name}`,
        reason: 'Post-meeting investor lead missing a strategic memo.',
        recommendedAction: 'Generate an investor memo to synthesize the meeting and strategic fit.',
        ctaLabel: 'Draft Memo',
        ctaHref: `/leads/${lead.id}`,
        score: 840 + icp,
      })
      continue
    }

    // 5. FOLLOW-UPS (HIGH/MEDIUM)
    const needsFollowUp = ['email_sent', 'follow_up', 'no_response'].includes(lead.stage)
      && (daysSinceOutbound === null || daysSinceOutbound >= 3)

    if (needsFollowUp) {
      const outCount = lead.total_emails_out ?? 0
      let followUpTitle = 'Follow up'
      let followUpDesc = 'Send the next concise, value-led follow-up and add a clear low-friction CTA.'

      if (outCount === 1) {
        followUpTitle = 'Bump'
        followUpDesc = 'Short 2-3 sentence bump with a new SMYKM hook.'
      } else if (outCount === 2) {
        followUpTitle = 'Value Drop'
        followUpDesc = 'Hormozi approach: deliver value, offer a free resource or breakdown.'
      } else if (outCount === 3) {
        followUpTitle = 'Channel Switch'
        followUpDesc = 'Move to LinkedIn or Twitter DM. Short and casual.'
      }

      actions.push({
        id: `${lead.id}:follow-up`,
        leadId: lead.id,
        leadName: lead.contact_name,
        leadType: lead.type,
        companyName: lead.company_name,
        priority: daysSinceOutbound === null || daysSinceOutbound >= 5 || icp >= 80 ? 'high' : 'medium',
        category: 'follow_up',
        title: `${followUpTitle} with ${lead.contact_name}`,
        reason: daysSinceOutbound === null
          ? `${lead.company_name} has no recorded recent outbound touch.`
          : `Last outbound was ${formatDaysAgo(daysSinceOutbound)}.`,
        recommendedAction: followUpDesc,
        ctaLabel: followUpTitle,
        ctaHref: `/leads/${lead.id}`,
        score: 820 + icp + Math.min(daysSinceOutbound ?? 6, 10) * 12,
      })
      continue
    }

    // 6. RESEARCH & PROSPECTING (MEDIUM)
    if (lead.stage === 'researched') {
      const hasHooks = lead.smykm_hooks && lead.smykm_hooks.length > 0
      const hasPositiveSignal = lead.conversation_signals?.some((signal) => {
        if (!['positive', 'action_needed', 'upsell_opportunity'].includes(signal.type)) return false
        const detectedAt = new Date(signal.detected_at)
        return Number.isFinite(detectedAt.getTime()) && now.getTime() - detectedAt.getTime() <= 7 * DAY_MS
      })

      if (!hasHooks) {
        actions.push({
          id: `${lead.id}:research`,
          leadId: lead.id,
          leadName: lead.contact_name,
          leadType: lead.type,
          companyName: lead.company_name,
          priority: icp >= 80 ? 'high' : 'medium',
          category: 'research',
          title: `Research ${lead.contact_name}`,
          reason: `High ICP (${icp}) lead needs SMYKM hooks for personalized outreach.`,
          recommendedAction: 'Run AI research to find deep personal and company-specific hooks.',
          ctaLabel: 'Research',
          ctaHref: `/leads/${lead.id}`,
          score: 750 + icp,
        })
      } else if (icp >= 75) {
        actions.push({
          id: `${lead.id}:prospecting`,
          leadId: lead.id,
          leadName: lead.contact_name,
          leadType: lead.type,
          companyName: lead.company_name,
          priority: hasPositiveSignal || icp >= 90 ? 'medium' : 'medium',
          category: 'prospecting',
          title: `Draft outreach to ${lead.contact_name}`,
          reason: `${lead.company_name} is a strong ICP fit (${icp}/100) and has not entered outreach.`,
          recommendedAction: 'Create a personalized SMYKM opener using the strongest research hook.',
          ctaLabel: 'Draft email',
          ctaHref: `/leads/${lead.id}`,
          score: 650 + icp + (hasPositiveSignal ? 40 : 0),
        })
      }
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
