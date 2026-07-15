import { generateJSON } from '@/lib/ai/anthropic'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { InvestorMemo } from '@/types/leads'
import { rateLimitResponse } from '@/lib/api/auth-guard'

const requestSchema = z.object({
  leadId: z.string().uuid(),
})

const SYSTEM_PROMPT = `You are Daniel Chalco, CEO of Pigeon. You are writing a highly personalized, Amazon-style one-page investor memo for a specific VC.

=== ABOUT PIGEON (Use ONLY these facts) ===
Company: Pigeon helps SaaS companies like Subgraph stay secure.
Work: Pigeon finds practical security weaknesses before attackers do and helps teams fix them. For AI products, Pigeon tests the channels, APIs, data, and tools their users and automations can reach.
Do not invent product capabilities, traction, clients, findings, roadmap, or team credentials.
===

Your goal is to synthesize the lead's investment thesis and personal background with Pigeon's value proposition. The memo should feel like it was written specifically for them, mirroring their beliefs and showing exactly how Pigeon fits their portfolio or worldview.

STRUCTURE:
1. Executive Summary (High-level pitch)
2. The Problem (The security vacuum in the agentic AI explosion)
3. The Solution (How Pigeon helps SaaS teams find and fix practical security weaknesses)
4. Why Now (Market timing, the shift from "AI features" to "AI agents")
5. Traction & Team (only facts present in the supplied lead or company context)
6. Strategic Fit (Directly addressing the investor's stated beliefs/thesis)

RULES:
- NO em dashes or en dashes. Use commas, periods, or "and".
- Tone: Professional, technical, yet casual (founder-to-founder).
- Be specific. Reference their portfolio companies or blog posts if found in the lead data.
- Do NOT invent facts about Pigeon.
- The "Strategic Fit" section is the most important—make it personal.

Return ONLY valid JSON.`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = requestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'leadId required' }, { status: 400 })
    }

    const { leadId } = validation.data
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const limited = rateLimitResponse(user.id, 'ai:investor-memo', {
      limit: 10,
      windowMs: 60_000,
    })
    if (limited) return limited

    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('user_id', user.id)
      .single()

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const context = `
Lead Name: ${lead.contact_name}
Fund: ${lead.fund_name || lead.company_name}
Investment Thesis: ${lead.investment_thesis_notes || 'N/A'}
Personal Details: ${lead.personal_details || 'N/A'}
SMYKM Hooks: ${(lead.smykm_hooks || []).join('; ')}
Company Description: ${lead.company_description || 'N/A'}
    `.trim()

    const result = await generateJSON<InvestorMemo>(
      SYSTEM_PROMPT,
      `Generate a one-page investor memo for ${lead.contact_name} at ${lead.fund_name || lead.company_name} based on this context:\n\n${context}`,
      { maxTokens: 4096, temperature: 0.7 }
    )

    // Strip em dashes from all fields
    const strip = (s: string) => s.replace(/[\u2013\u2014]/g, ',')
    const memo = {
      title: strip(result.title),
      executive_summary: strip(result.executive_summary),
      the_problem: strip(result.the_problem),
      the_solution: strip(result.the_solution),
      why_now: strip(result.why_now),
      traction: strip(result.traction),
      the_team: strip(result.the_team),
      strategic_fit: strip(result.strategic_fit),
    }

    // Persist to lead
    await supabase.from('leads').update({
      investor_memo: memo as unknown as Record<string, unknown>,
      investor_memo_generated_at: new Date().toISOString(),
    }).eq('id', leadId).eq('user_id', user.id)

    return NextResponse.json(memo)
  } catch (error) {
    console.error('Investor memo error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate memo' },
      { status: 500 }
    )
  }
}
