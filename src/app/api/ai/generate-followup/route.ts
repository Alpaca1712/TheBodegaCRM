import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, rateLimitResponse } from '@/lib/api/auth-guard'
import { generateFollowUpVariants } from '@/lib/ai/email-service'
import type { Lead } from '@/types/leads'

const emailSchema = z.object({
  direction: z.enum(['inbound', 'outbound']),
  subject: z.string(),
  body: z.string(),
  sent_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
  email_type: z.string().nullable().optional(),
})

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
    stage: z.enum(['researched', 'email_drafted', 'email_sent', 'replied', 'meeting_booked', 'meeting_held', 'follow_up', 'closed_won', 'closed_lost', 'no_response']),
    conversation_summary: z.string().optional().nullable(),
    conversation_next_step: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  }),
  emailThread: z.array(emailSchema).optional().default([]),
  followUpNumber: z.number().int().min(1).max(4),
  customContext: z.string().optional().default(''),
})

export async function POST(request: NextRequest) {
  try {
    const guard = await requireUser()
    if (guard instanceof NextResponse) return guard
    const limited = rateLimitResponse(guard.user.id, 'ai:generate-followup', {
      limit: 20,
      windowMs: 60_000,
    })
    if (limited) return limited
    const supabase = guard.supabase

    const body = await request.json()
    const validation = requestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      )
    }

    // Fetch agent memories for progressive personalization
    let memories: Array<{ memory_type: string; content: string }> = []
    if (validation.data.lead.id) {
      try {
        const { data } = await supabase
          .from('agent_memory')
          .select('memory_type, content')
          .eq('lead_id', validation.data.lead.id)
          .order('relevance_score', { ascending: false })
          .limit(10)
        memories = data || []
      } catch {
        // Non-critical
      }
    }

    const { lead, emailThread, followUpNumber, customContext } = validation.data

    const variants = await generateFollowUpVariants(
      lead as Lead,
      emailThread,
      followUpNumber,
      customContext,
      memories
    )

    return NextResponse.json(variants)
  } catch (error) {
    console.error('Generate follow-up error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate follow-up' },
      { status: 500 }
    )
  }
}
