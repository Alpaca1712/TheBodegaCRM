import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, rateLimitResponse } from '@/lib/api/auth-guard'
import { generateFollowupOutreach } from '@/lib/ai/email-service'
import { Lead } from '@/types/leads'

const requestSchema = z.object({
  lead: z.any(),
  emailThread: z.array(z.any()).optional().default([]),
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
    const { supabase, user } = guard

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
        const { data: ownedLead } = await supabase
          .from('leads')
          .select('id')
          .eq('id', validation.data.lead.id)
          .eq('user_id', user.id)
          .single()
        if (ownedLead) {
          const { data } = await supabase
            .from('agent_memory')
            .select('memory_type, content')
            .eq('lead_id', validation.data.lead.id)
            .order('relevance_score', { ascending: false })
            .limit(10)
          memories = data || []
        }
      } catch {
        // Non-critical
      }
    }

    const result = await generateFollowupOutreach({
      ...validation.data,
      lead: validation.data.lead as Lead,
      memories
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Generate follow-up error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate follow-up' },
      { status: 500 }
    )
  }
}
