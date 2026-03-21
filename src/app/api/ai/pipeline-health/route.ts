import { NextRequest, NextResponse } from 'next/server'
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

  if (daysSinceContact > 14) {
    score += 30
    factors.push(`No contact in ${daysSinceContact}d`)
  } else if (daysSinceContact > 7) {
    score += 15
    factors.push(`Last contact ${daysSinceContact}d ago`)
  }

  const emailsOut = (lead.total_emails_out as number) || 0
  const emailsIn = (lead.total_emails_in as number) || 0
  if (emailsOut >= 3 && emailsIn === 0) {
    score += 25
    factors.push(`Ghost: ${emailsOut} sent, 0 replies`)
  }

  if (lead.stage === 'no_response') {
    score += 20
    factors.push('No response stage')
  }

  if (lead.stage === 'follow_up' && daysSinceInbound > 7) {
    score += 15
    factors.push('Follow-up with no recent reply')
  }

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

// GET: Fast rule-based scoring only, no AI calls
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, contact_name, company_name, stage, type, priority, last_contacted_at, last_inbound_at, last_outbound_at, total_emails_in, total_emails_out, risk_score, risk_factors, risk_assessed_at')
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

    scoredLeads.sort((a, b) => b.risk_score - a.risk_score)

    const atRisk = scoredLeads.filter(l => l.risk_score > 30).length
    const healthy = scoredLeads.filter(l => l.risk_score <= 15).length
    const overallScore = Math.round(100 - (scoredLeads.reduce((sum, l) => sum + l.risk_score, 0) / leads.length))

    // Fire-and-forget DB update for the top 20 risk scores
    Promise.all(
      scoredLeads.slice(0, 20).map(l =>
        supabase.from('leads').update({
          risk_score: l.risk_score,
          risk_factors: l.risk_factors,
          risk_assessed_at: new Date().toISOString(),
        }).eq('id', l.lead_id)
      )
    ).catch(() => {})

    const topRisky = scoredLeads.filter(l => l.risk_score > 15).slice(0, 3)
    const summaryParts = []
    if (atRisk > 0) summaryParts.push(`${atRisk} lead${atRisk !== 1 ? 's' : ''} at risk`)
    if (topRisky.length > 0) summaryParts.push(`Top concern: ${topRisky[0].contact_name} (${topRisky[0].risk_factors[0] || 'multiple factors'})`)
    if (summaryParts.length === 0) summaryParts.push('Pipeline looks healthy')

    const result: PipelineHealth = {
      overall_score: Math.max(0, Math.min(100, overallScore)),
      total_leads: leads.length,
      at_risk_count: atRisk,
      healthy_count: healthy,
      leads: scoredLeads,
      ai_summary: summaryParts.join('. ') + '.',
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

// POST: AI-powered recommendations for specific leads (called lazily from the UI)
export async function POST(request: NextRequest) {
  try {
    const { leadIds } = await request.json() as { leadIds: string[] }
    if (!leadIds?.length) {
      return NextResponse.json({ error: 'leadIds required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: leads } = await supabase
      .from('leads')
      .select('id, contact_name, company_name, stage, risk_score, risk_factors, conversation_summary, total_emails_in, total_emails_out, last_contacted_at')
      .in('id', leadIds.slice(0, 10))

    if (!leads?.length) return NextResponse.json({ recommendations: [] })

    const riskContext = leads.map(l => {
      const factors = Array.isArray(l.risk_factors) ? l.risk_factors.join(', ') : ''
      return `${l.contact_name} (${l.company_name}) - Stage: ${l.stage}, Risk: ${l.risk_score}/100
Factors: ${factors}
Summary: ${l.conversation_summary || 'No conversation data'}
Emails sent: ${l.total_emails_out || 0}, Replies: ${l.total_emails_in || 0}`
    }).join('\n\n')

    const recommendations = await generateJSON<Array<{ lead_id: string; recommendation: string }>>(
      `You are a sales coach for Rocoto (AI agent security). For each at-risk lead, provide one specific, actionable recommendation to re-engage them. Be direct and practical. Max 2 sentences each. No em dashes. Return JSON array: [{"lead_id": "...", "recommendation": "..."}]`,
      `These leads are at risk. What should we do?\n\n${riskContext}`,
      { maxTokens: 1024, temperature: 0.4 }
    )

    return NextResponse.json({ recommendations: Array.isArray(recommendations) ? recommendations : [] })
  } catch (error) {
    console.error('Pipeline health AI error:', error)
    return NextResponse.json({ recommendations: [] })
  }
}
