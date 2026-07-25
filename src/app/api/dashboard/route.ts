import { getOrgScopedClient } from '@/lib/supabase/org-scope'
import { buildSalesActionPlan, type SalesAction } from '@/lib/dashboard/sales-actions'
import { isMissingRelation } from '@/lib/supabase/missing-column'
import { NextResponse } from 'next/server'
import type { LeadType, PipelineStage } from '@/types/leads'

const DASHBOARD_LEAD_FIELDS = 'id, contact_name, company_name, stage, type, icp_score, last_contacted_at, last_inbound_at, last_outbound_at, updated_at, conversation_next_step, conversation_signals, smykm_hooks, company_description, battle_card, investor_memo, total_emails_out' as const

type ConversationSignal = {
  type?: string
  detected_at?: string | null
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')

    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const now = new Date()
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    let leadsQuery = supabase.from('leads').select(DASHBOARD_LEAD_FIELDS).eq('org_id', orgId)
    if (type) {
      leadsQuery = leadsQuery.eq('type', type)
    }

    const [leadsRes, emailsRes, interactionsRes, automationFailuresRes] = await Promise.all([
      leadsQuery,
      supabase
        .from('lead_emails')
        .select('lead_id, direction, created_at, sent_at, replied_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: true }),
      supabase.from('lead_interactions').select('lead_id').eq('org_id', orgId),
      supabase
        .from('campaign_sequence_executions')
        .select('id,campaign_id,lead_id,error_message,created_at,campaign:campaigns(name),lead:leads(contact_name,company_name,type,stage)')
        .eq('org_id', orgId)
        .eq('status', 'failed')
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    if (leadsRes.error) throw leadsRes.error
    if (emailsRes.error) throw emailsRes.error
    if (interactionsRes.error) throw interactionsRes.error
    if (automationFailuresRes.error && !isMissingRelation(automationFailuresRes.error, 'campaign_sequence_executions')) {
      throw automationFailuresRes.error
    }

    const leads = leadsRes.data || []
    const leadIds = new Set(leads.map(l => l.id))

    const emails = (emailsRes.data || []).filter(e => leadIds.has(e.lead_id))
    const interactions = (interactionsRes.data || []).filter(ix => leadIds.has(ix.lead_id))

    // Build per-lead email index maps for O(1) lookups (was O(N) .filter() per lead)
    const outboundByLead = new Map<string, typeof emails>()
    const inboundByLead = new Map<string, typeof emails>()
    for (const e of emails) {
      if (e.direction === 'outbound') {
        const arr = outboundByLead.get(e.lead_id)
        if (arr) arr.push(e); else outboundByLead.set(e.lead_id, [e])
      } else {
        const arr = inboundByLead.get(e.lead_id)
        if (arr) arr.push(e); else inboundByLead.set(e.lead_id, [e])
      }
    }

    const outboundEmails = emails.filter(e => e.direction === 'outbound')
    const inboundEmails = emails.filter(e => e.direction === 'inbound')

    const thisWeekOutbound = outboundEmails.filter(e => new Date(e.created_at) >= weekAgo)
    const lastWeekOutbound = outboundEmails.filter(e => {
      const d = new Date(e.created_at)
      return d >= twoWeeksAgo && d < weekAgo
    })

    const leadsWithReplies = new Set(inboundEmails.map(e => e.lead_id))
    const leadsWithOutbound = new Set(outboundEmails.map(e => e.lead_id))
    const leadsContacted = leadsWithOutbound.size

    const meetingLeads = leads.filter(l =>
      ['meeting_booked', 'meeting_held', 'closed_won'].includes(l.stage)
    )

    // Avg days to reply: use pre-built maps instead of .find()
    const replyTimes: number[] = []
    for (const leadId of leadsWithReplies) {
      const outArr = outboundByLead.get(leadId)
      const inArr = inboundByLead.get(leadId)
      if (outArr && outArr.length > 0 && inArr && inArr.length > 0) {
        const days = (new Date(inArr[0].created_at).getTime() - new Date(outArr[0].created_at).getTime()) / (1000 * 60 * 60 * 24)
        if (days >= 0) replyTimes.push(days)
      }
    }
    const avgDaysToReply = replyTimes.length > 0
      ? replyTimes.reduce((a, b) => a + b, 0) / replyTimes.length
      : 0

    // Follow-up compliance: use map for O(1) email count per lead
    const followUpLeads = leads.filter(l =>
      ['email_sent', 'follow_up', 'no_response'].includes(l.stage)
    )
    const followUpsDue = followUpLeads.filter((lead) => {
      if (!lead.last_contacted_at) return true
      return new Date(lead.last_contacted_at).getTime() <= now.getTime() - (3 * 24 * 60 * 60 * 1000)
    }).length
    let leadsWithMultipleOutbound = 0
    for (const l of followUpLeads) {
      if ((outboundByLead.get(l.id)?.length ?? 0) >= 2) leadsWithMultipleOutbound++
    }
    const followUpCompliance = followUpLeads.length > 0
      ? (leadsWithMultipleOutbound / followUpLeads.length) * 100
      : 100

    // Hot leads: high-signal activity (replies, high ICP research, positive signals)
    const hotLeads = leads.filter(l => {
      const lastUpdate = new Date(l.updated_at)

      // 1. Replied or meeting_booked in last 7 days
      if (['replied', 'meeting_booked'].includes(l.stage)) {
        const lastIn = l.last_inbound_at || l.updated_at
        if (new Date(lastIn) >= weekAgo) return true
      }

      // 2. Researched with high ICP in last 48h (new high-value prospects)
      if (l.stage === 'researched' && (l.icp_score ?? 0) >= 80 && lastUpdate >= fortyEightHoursAgo) {
        return true
      }

      // 3. Positive signals in last 7 days (AI detected interest)
      if (l.conversation_signals && Array.isArray(l.conversation_signals)) {
        const hasRecentPositive = (l.conversation_signals as ConversationSignal[]).some(s =>
          s.type === 'positive' && s.detected_at && new Date(s.detected_at) >= weekAgo
        )
        if (hasRecentPositive) return true
      }

      return false
    })
    .sort((a, b) => (b.icp_score ?? 0) - (a.icp_score ?? 0))
    .slice(0, 8)

    // Build per-lead interaction count map
    const interactionsByLead = new Map<string, number>()
    for (const ix of interactions) {
      interactionsByLead.set(ix.lead_id, (interactionsByLead.get(ix.lead_id) ?? 0) + 1)
    }

    // Touchpoints per lead — single pass using maps
    const touchpointCounts: number[] = []
    for (const lead of leads) {
      const emailCount = outboundByLead.get(lead.id)?.length ?? 0
      const interactionCount = interactionsByLead.get(lead.id) ?? 0
      if (emailCount + interactionCount > 0) {
        touchpointCounts.push(emailCount + interactionCount)
      }
    }
    const avgTouchpoints = touchpointCounts.length > 0
      ? touchpointCounts.reduce((a, b) => a + b, 0) / touchpointCounts.length
      : 0

    // Pipeline counts + byType — single pass
    const pipelineCounts: Record<string, number> = {}
    let customerCount = 0, investorCount = 0, partnershipCount = 0
    let closedWon = 0, activePipeline = 0
    for (const lead of leads) {
      pipelineCounts[lead.stage] = (pipelineCounts[lead.stage] || 0) + 1
      if (lead.type === 'customer') customerCount++
      else if (lead.type === 'investor') investorCount++
      else if (lead.type === 'partnership') partnershipCount++
      if (lead.stage === 'closed_won') closedWon++
      if (!['researched', 'email_drafted', 'closed_won', 'closed_lost'].includes(lead.stage)) activePipeline++
    }

    const leadIdsForDashboard = new Set(leads.map((lead) => lead.id))
    const automationActions = (automationFailuresRes.error ? [] : automationFailuresRes.data || [])
      .reduce<SalesAction[]>((actions, failure) => {
        const failureLead = Array.isArray(failure.lead) ? failure.lead[0] : failure.lead
        const failureCampaign = Array.isArray(failure.campaign) ? failure.campaign[0] : failure.campaign
        if (!failureLead || !leadIdsForDashboard.has(failure.lead_id)) return actions
        actions.push({
          id: `automation:${failure.id}`,
          leadId: failure.lead_id,
          leadName: failureLead.contact_name,
          leadType: failureLead.type as LeadType,
          leadStage: failureLead.stage as PipelineStage,
          companyName: failureLead.company_name,
          priority: 'critical' as const,
          category: 'automation' as const,
          title: `Fix automation for ${failureLead.contact_name}`,
          reason: `${failureCampaign?.name || 'Campaign'} could not deliver a sequence step.`,
          recommendedAction: failure.error_message || 'Open the campaign run inspector, fix the rule, then run due automations again.',
          ctaLabel: 'Inspect run',
          ctaHref: `/campaigns/${failure.campaign_id}`,
          score: 1_500,
        })
        return actions
      }, [])

    const salesActionPlan = [...automationActions, ...buildSalesActionPlan({
      leads,
      outboundEmails,
      inboundEmails,
      now,
    })]
      .sort((a, b) => b.score - a.score)
      .slice(0, 7)

    const response = NextResponse.json({
      totalLeads: leads.length,
      outreachThisWeek: thisWeekOutbound.length,
      outreachLastWeek: lastWeekOutbound.length,
      totalOutbound: outboundEmails.length,
      totalInbound: inboundEmails.length,
      leadsContacted,
      leadsWithReplies: leadsWithReplies.size,
      replyRate: leadsContacted > 0 ? (leadsWithReplies.size / leadsContacted) * 100 : 0,
      meetingsBooked: meetingLeads.length,
      meetingConversion: leadsWithReplies.size > 0 ? (meetingLeads.length / leadsWithReplies.size) * 100 : 0,
      avgDaysToReply: Math.round(avgDaysToReply * 10) / 10,
      followUpsDue,
      followUpCompliance: Math.round(followUpCompliance),
      avgTouchpoints: Math.round(avgTouchpoints * 10) / 10,
      hotLeads,
      salesActionPlan,
      pipelineCounts,
      byType: {
        customers: customerCount,
        investors: investorCount,
        partnerships: partnershipCount,
      },
      closedWon,
      activePipeline,
    })
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
    return response
  } catch (error) {
    console.error('GET /api/dashboard error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch dashboard' },
      { status: 500 }
    )
  }
}
