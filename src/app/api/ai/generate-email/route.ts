import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, rateLimitResponse } from '@/lib/api/auth-guard'
import { generateInitialOutreach } from '@/lib/ai/email-service'
import { Lead } from '@/types/leads'

const requestSchema = z.object({
  lead: z.any(), // We trust the service to handle the lead object
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

    const result = await generateInitialOutreach(lead as Lead, customContext, memories)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Generate email error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate email' },
      { status: 500 }
    )
  }
}
