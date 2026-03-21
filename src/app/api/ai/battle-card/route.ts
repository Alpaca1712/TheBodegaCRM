import { researchWithWebSearchJSON } from '@/lib/ai/anthropic'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface BattleCard {
  company_overview: string
  their_product: string
  their_strengths: string[]
  their_weaknesses: string[]
  competitive_landscape: string[]
  our_angle: string
  objection_handlers: Array<{ objection: string; response: string }>
  discovery_questions: string[]
  trigger_events: string[]
  icp_score: number
  icp_reasons: string[]
  pricing_intel: string | null
  tech_stack: string[]
  decision_makers: Array<{ role: string; concerns: string; pitch_angle: string }>
}

const SYSTEM_PROMPT = `You are a sales strategist for Rocoto, an AI agent security company that hacks other AI agents to find vulnerabilities. Generate a comprehensive battle card for a sales conversation.

Rocoto's value prop: We autonomously test AI agents for prompt injection, jailbreaking, data exfiltration, and tool abuse. Think "penetration testing but for AI agents."

Search the web to find:
1. What the target company's product does (especially their AI/agent capabilities)
2. Their competitors and how they position themselves
3. Their tech stack, integrations, and architecture
4. Recent news, funding, product launches
5. Their pricing model if public
6. Key decision makers and their likely concerns

ICP SCORING (0-100):
- 90-100: They build AI agents that handle sensitive data/actions (legal, financial, healthcare AI). Perfect fit.
- 70-89: They use AI agents in production but sensitivity is moderate. Strong fit.
- 50-69: They have AI features but agents aren't core. Moderate fit.
- 30-49: They're AI-adjacent but don't have agents in production yet. Weak fit.
- 0-29: No AI agent usage. Not ICP.

NEVER use em dashes or en dashes. Use commas, periods, or "and" instead.

Return ONLY valid JSON.`

export async function POST(request: NextRequest) {
  try {
    const { leadId } = await request.json()
    if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: lead } = await supabase
      .from('leads')
      .select('id, company_name, product_name, company_description, attack_surface_notes, type, contact_name, contact_title, company_website')
      .eq('id', leadId)
      .single()

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const context = [
      `Company: ${lead.company_name}`,
      lead.product_name && `Product: ${lead.product_name}`,
      lead.company_website && `Website: ${lead.company_website}`,
      lead.company_description && `Description: ${lead.company_description}`,
      lead.attack_surface_notes && `Known attack surface: ${lead.attack_surface_notes}`,
      lead.contact_name && `Primary contact: ${lead.contact_name}${lead.contact_title ? ` (${lead.contact_title})` : ''}`,
      `Lead type: ${lead.type}`,
    ].filter(Boolean).join('\n')

    const result = await researchWithWebSearchJSON<BattleCard>(
      SYSTEM_PROMPT,
      `Generate a battle card for selling Rocoto's AI agent security testing to this company:\n\n${context}\n\nReturn JSON: {"company_overview": "...", "their_product": "...", "their_strengths": ["..."], "their_weaknesses": ["..."], "competitive_landscape": ["competitor: how they differ"], "our_angle": "the specific pitch angle for this company", "objection_handlers": [{"objection": "...", "response": "..."}], "discovery_questions": ["..."], "trigger_events": ["recent events that create urgency"], "icp_score": 0-100, "icp_reasons": ["why this score"], "pricing_intel": "...", "tech_stack": ["..."], "decision_makers": [{"role": "CTO", "concerns": "...", "pitch_angle": "..."}]}`,
      { maxTokens: 4096, temperature: 0.3, maxSearches: 8 }
    )

    const strip = (s: string) => s.replace(/[\u2013\u2014]/g, ',')
    result.company_overview = strip(result.company_overview)
    result.their_product = strip(result.their_product)
    result.our_angle = strip(result.our_angle)

    await supabase.from('leads').update({
      battle_card: result as unknown as Record<string, unknown>,
      battle_card_generated_at: new Date().toISOString(),
      icp_score: result.icp_score,
      icp_reasons: result.icp_reasons,
    }).eq('id', leadId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Battle card error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate battle card' },
      { status: 500 }
    )
  }
}
