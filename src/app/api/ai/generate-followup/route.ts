import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, rateLimitResponse } from '@/lib/api/auth-guard'
import { EmailService } from '@/lib/ai/email-service'

const emailSchema = z.object({
  direction: z.enum(['inbound', 'outbound']),
  subject: z.string(),
  body: z.string(),
  sent_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
  email_type: z.string().nullable().optional(),
})

const requestSchema = z.object({
  lead: z.any(),
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
    const { supabase } = guard

    const body = await request.json()
    const validation = requestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      )
    }

    const { lead, emailThread, followUpNumber, customContext } = validation.data

    let memories: Array<{ memory_type: string; content: string }> = []
    if (lead.id) {
      try {
        const { data } = await supabase
          .from('agent_memory')
          .select('memory_type, content')
          .eq('lead_id', lead.id)
          .order('relevance_score', { ascending: false })
          .limit(10)
        memories = data || []
      } catch { /* ignore */ }
    }

    const result = await EmailService.generateFollowup(
      lead,
      emailThread,
      followUpNumber,
      { customContext, memories }
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Generate follow-up error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate follow-up' },
      { status: 500 }
    )
  }
}
