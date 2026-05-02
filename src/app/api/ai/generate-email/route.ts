import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, rateLimitResponse } from '@/lib/api/auth-guard'
import { generateInitialEmailVariants } from '@/lib/ai/email-service'
import type { Lead } from '@/types/leads'

const requestSchema = z.object({
  lead: z.object({
    id: z.string().uuid().optional(),
    type: z.enum(['customer', 'investor', 'partnership']),
    company_name: z.string(),
    product_name: z.string().optional().nullable(),
    fund_name: z.string().optional().nullable(),
    contact_name: z.string(),
    contact_title: z.string().optional().nullable(),
    company_description: z.string().optional().nullable(),
    attack_surface_notes: z.string().optional().nullable(),
    investment_thesis_notes: z.string().optional().nullable(),
    personal_details: z.string().optional().nullable(),
    smykm_hooks: z.array(z.string()).optional().default([]),
    icp_score: z.number().optional().nullable(),
    icp_reasons: z.array(z.string()).optional().default([]),
    battle_card: z.object({
      company_overview: z.string().optional(),
      their_product: z.string().optional(),
      their_strengths: z.array(z.string()).optional(),
      their_weaknesses: z.array(z.string()).optional(),
      competitive_landscape: z.array(z.string()).optional(),
      our_angle: z.string().optional(),
      objection_handlers: z.array(z.object({ objection: z.string(), response: z.string() })).optional(),
      discovery_questions: z.array(z.string()).optional(),
      trigger_events: z.array(z.string()).optional(),
      icp_score: z.number().optional(),
      icp_reasons: z.array(z.string()).optional(),
      pricing_intel: z.string().optional().nullable(),
      tech_stack: z.array(z.string()).optional(),
      decision_makers: z.array(z.object({ role: z.string(), concerns: z.string(), pitch_angle: z.string() })).optional(),
    }).optional().nullable(),
  }),
  customContext: z.string().optional().default(''),
})

export async function POST(request: NextRequest) {
  try {
    const guard = await requireUser()
    if (guard instanceof NextResponse) return guard
    const limited = rateLimitResponse(guard.user.id, 'ai:generate-email', {
      limit: 20,
      windowMs: 60_000,
    })
    if (limited) return limited
    const { user, supabase } = guard

    const body = await request.json()
    const validation = requestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      )
    }

    const { lead, customContext } = validation.data

    // Fetch agent memories for progressive personalization
    let memories: Array<{ memory_type: string; content: string }> = []
    if (lead.id) {
      try {
        const { data: ownedLead } = await supabase
          .from('leads')
          .select('id')
          .eq('id', lead.id)
          .eq('user_id', user.id)
          .single()
        if (ownedLead) {
          const { data } = await supabase
            .from('agent_memory')
            .select('memory_type, content')
            .eq('lead_id', lead.id)
            .order('relevance_score', { ascending: false })
            .limit(10)
          memories = data || []
        }
      } catch {
        // Non-critical
      }
    }

    const variants = await generateInitialEmailVariants(lead as Lead, customContext, memories)

    return NextResponse.json(variants)
  } catch (error) {
    console.error('Generate email error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate email' },
      { status: 500 }
    )
  }
}
