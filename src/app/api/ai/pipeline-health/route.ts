import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateJSON } from '@/lib/ai/anthropic'

interface LeadRisk {
  lead_id: string
  contact_name: string
  company_name: string
  stage: string
  risk_score: number
  risk_factors: string[]
  recommendation: string
}

interface PipelineHealth {
  overall_score: number
  total_leads: number
  at_risk_count: number
  healthy_count: number
  leads: LeadRisk[]
  ai_summary: string
}

function computeRuleBasedRisk(lead: Record<string, unknown>): { score: number; factors: string[] } {
  let score = 0
  const factors: string[] = []
  const now = Date.now()

  const lastContact = lead.last_contacted_at ? new Date(lead.last_contacted_at as string).getTime() : 0
  const lastInbound = lead.last_inbound_at ? new Date(lead.last_inbound_at as string).getTime() : 0
  const daysSinceContact = lastContact ? Math.floor((now - lastContact) / 86400000) : 999
  const daysSinceInbound = lastInbound ? Math.floor((now - lastInbound) / 86400000) : 999

  // Staleness
  if (daysSinceContact > 14) {
    score += 30
    factors.push(`No contact in ${daysSinceContact} days`)
  } else if (daysSinceContact > 7) {
    score += 15
    factors.push(`Last contact ${daysSinceContact} days ago`)
  }

  // Ghost detection: lots of outbound, zero inbound
  const emailsOut = (lead.total_emails_out as number) || 0
  const emailsIn = (lead.total_emails_in as number) || 0
  if (emailsOut >= 3 && emailsIn === 0) {
    score += 25
    factors.push(`Ghost: ${emailsOut} emails sent, 0 replies`)
  }

  // No response stage
  if (lead.stage === 'no_response') {
    score += 20
    factors.push('In no_response stage')
  }

  // Stale follow-up
  if (lead.stage === 'follow_up' && daysSinceInbound > 7) {
    score += 15
    factors.push('Follow-up with no recent reply')
  }

  // Positive signals reduce risk
  if (daysSinceInbound < 3) {
    score -= 20
    factors.push('Recent inbound activity')
  }
  if (lead.stage === 'meeting_booked' || lead.stage === 'meeting_held') {
    score -= 15
    factors.push('Meeting engagement')
  }

  return { score: Math.max(0, Math.min(100, score)), factors }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, contact_name, company_name, stage, type, priority, last_contacted_at, last_inbound_at, last_outbound_at, total_emails_in, total_emails_out, conversation_summary, conversation_signals, notes')
      .eq('user_id', user.id)
      .not('stage', 'in', '("closed_won","closed_lost")')

    if (leadsError) {
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({
        overall_score: 100,
        total_leads: 0,
        at_risk_count: 0,
        healthy_count: 0,
        leads: [],
        ai_summary: 'No active leads in the pipeline.',
      })
    }

    // Rule-based scoring for all leads
    const scoredLeads: LeadRisk[] = leads.map(lead => {
      const { score, factors } = computeRuleBasedRisk(lead)
      return {
        lead_id: lead.id,
        contact_name: lead.contact_name,
        company_name: lead.company_name,
        stage: lead.stage,
        risk_score: score,
        risk_factors: factors,
        recommendation: '',
      }
    })

    // Sort by risk (highest first) and get top 10 for AI analysis
    scoredLeads.sort((a, b) => b.risk_score - a.risk_score)
    const topRisky = scoredLeads.filter(l => l.risk_score > 15).slice(0, 10)

    if (topRisky.length > 0) {
      const riskContext = topRisky.map(l => {
        const lead = leads.find(ld => ld.id === l.lead_id)!
        return `${l.contact_name} (${l.company_name}) - Stage: ${l.stage}, Risk: ${l.risk_score}/100
Factors: ${l.risk_factors.join(', ')}
Summary: ${lead.conversation_summary || 'No conversation data'}`
      }).join('\n\n')

      try {
        const aiRecommendations = await generateJSON<Array<{ lead_id: string; recommendation: string }>>(
          `You are a sales coach. For each at-risk lead, provide a specific, actionable recommendation to re-engage them. Be direct and practical. No em dashes. Return JSON array: [{"lead_id": "...", "recommendation": "..."}]`,
          `These leads are at risk of going cold. What should we do?\n\n${riskContext}`,
          { maxTokens: 2048, temperature: 0.4 }
        )

        for (const rec of aiRecommendations) {
          const lead = scoredLeads.find(l => l.lead_id === rec.lead_id)
          if (lead) lead.recommendation = rec.recommendation
        }
      } catch (aiErr) {
        console.error('Pipeline health AI error:', aiErr)
      }
    }

    // Update risk scores in DB
    await Promise.all(
      scoredLeads.slice(0, 20).map(l =>
        supabase.from('leads').update({
          risk_score: l.risk_score,
          risk_factors: l.risk_factors,
          risk_assessed_at: new Date().toISOString(),
        }).eq('id', l.lead_id)
      )
    )

    const atRisk = scoredLeads.filter(l => l.risk_score > 30).length
    const healthy = scoredLeads.filter(l => l.risk_score <= 15).length
    const overallScore = leads.length > 0
      ? Math.round(100 - (scoredLeads.reduce((sum, l) => sum + l.risk_score, 0) / leads.length))
      : 100

    const result: PipelineHealth = {
      overall_score: Math.max(0, Math.min(100, overallScore)),
      total_leads: leads.length,
      at_risk_count: atRisk,
      healthy_count: healthy,
      leads: scoredLeads,
      ai_summary: topRisky.length > 0
        ? `${atRisk} lead${atRisk !== 1 ? 's' : ''} at risk. Top concern: ${topRisky[0].contact_name} at ${topRisky[0].company_name} (${topRisky[0].risk_factors[0] || 'multiple factors'}).`
        : 'Pipeline looks healthy. No leads at significant risk.',
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Pipeline health error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assess pipeline health' },
      { status: 500 }
    )
  }
}
