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

const SYSTEM_PROMPT = `You are a sales strategist for Rocoto. Generate a comprehensive battle card for a sales conversation.

Rocoto's value prop: We try to break AI agents before bad actors do. We talk to AI agents the same way their users do (email, text, voice, chat, Slack) and try to take them over, pull out private data, or make them misbehave. Then we help fix everything. Think "hiring a burglar to test your locks, but for AI."
Real results: Worked with Mason (AI agent for property managers). Took over their agent through its customer channels. Helped them fix everything.
Team: Daniel and David, both on Amazon's offensive security team.

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
      .eq('user_id', user.id)
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
      `Generate a battle card for selling Rocoto's agentic pentesting to this company:\n\n${context}\n\nReturn JSON: {"company_overview": "...", "their_product": "...", "their_strengths": ["..."], "their_weaknesses": ["..."], "competitive_landscape": ["competitor: how they differ"], "our_angle": "the specific pitch angle for this company based on their AI agent's communication channels", "objection_handlers": [{"objection": "...", "response": "..."}], "discovery_questions": ["..."], "trigger_events": ["recent events that create urgency"], "icp_score": 0-100, "icp_reasons": ["why this score"], "pricing_intel": "...", "tech_stack": ["..."], "decision_makers": [{"role": "CTO", "concerns": "...", "pitch_angle": "..."}]}`,
      { maxTokens: 4096, temperature: 0.3, maxSearches: 8 }
    )

    const strip = (s: string | null | undefined) => s ? s.replace(/[\u2013\u2014]/g, ',') : s
    const stripArr = (arr: string[] | undefined) => arr?.map(s => strip(s) as string)

    result.company_overview = strip(result.company_overview) as string
    result.their_product = strip(result.their_product) as string
    result.our_angle = strip(result.our_angle) as string
    result.pricing_intel = strip(result.pricing_intel) as string | null
    result.their_strengths = stripArr(result.their_strengths) || []
    result.their_weaknesses = stripArr(result.their_weaknesses) || []
    result.competitive_landscape = stripArr(result.competitive_landscape) || []
    result.discovery_questions = stripArr(result.discovery_questions) || []
    result.trigger_events = stripArr(result.trigger_events) || []
    result.tech_stack = stripArr(result.tech_stack) || []
    if (result.objection_handlers) {
      result.objection_handlers = result.objection_handlers.map(oh => ({
        objection: strip(oh.objection) as string,
        response: strip(oh.response) as string,
      }))
    }
    if (result.decision_makers) {
      result.decision_makers = result.decision_makers.map(dm => ({
        role: strip(dm.role) as string,
        concerns: strip(dm.concerns) as string,
        pitch_angle: strip(dm.pitch_angle) as string,
      }))
    }
    if (result.icp_reasons) {
      result.icp_reasons = stripArr(result.icp_reasons) || []
    }

    const { error: updateError } = await supabase.from('leads').update({
      battle_card: result as unknown as Record<string, unknown>,
      battle_card_generated_at: new Date().toISOString(),
      icp_score: result.icp_score,
      icp_reasons: result.icp_reasons,
    }).eq('id', leadId).eq('user_id', user.id)

    if (updateError) {
      console.error('Battle card DB update error:', updateError)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Battle card error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate battle card' },
      { status: 500 }
    )
  }
}
