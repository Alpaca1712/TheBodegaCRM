import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, rateLimitResponse } from '@/lib/api/auth-guard'
import { generateFollowupEmail } from '@/lib/ai/email-service'

const requestSchema = z.object({
  lead: z.record(z.unknown()),
  emailThread: z.array(z.record(z.unknown())).optional().default([]),
  followUpNumber: z.number().int().min(1).max(4),
  customContext: z.string().optional().default(''),
})

export async function POST(request: NextRequest) {
  try {
    const guard = await requireUser()
    if (guard instanceof NextResponse) return guard
    const { user, supabase } = guard

    const limited = rateLimitResponse(user.id, 'ai:generate-followup', {
      limit: 20,
      windowMs: 60_000,
    })
    if (limited) return limited

    const body = await request.json()
    const validation = requestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { lead, emailThread, followUpNumber, customContext } = validation.data

    let memories: Array<{ memory_type: string; content: string }> = []
    if (lead.id) {
      const { data } = await supabase
        .from('agent_memory')
        .select('memory_type, content')
        .eq('lead_id', lead.id)
        .order('relevance_score', { ascending: false })
        .limit(10)
      memories = data || []
    }

    const result = await generateFollowupEmail({
      lead,
      emailThread,
      followUpNumber,
      ctaStyle: 'mckenna', // Default for single variant API
      customContext,
      memories,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Generate follow-up error:', error)
    return NextResponse.json({ error: 'Failed to generate follow-up' }, { status: 500 })
  }
}
