import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, rateLimitResponse } from '@/lib/api/auth-guard'
import { ModelJSONParseError } from '@/lib/ai/anthropic'
import { UngroundedEmailError } from '@/lib/ai/email-grounding'
import { generateFollowupOutreach } from '@/lib/ai/email-service'
import { Lead, LeadEmail } from '@/types/leads'

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

    let lead = validation.data.lead as Lead
    let emailThread = validation.data.emailThread as LeadEmail[]
    if (lead.id) {
      const [leadResult, emailResult] = await Promise.all([
        supabase
          .from('leads')
          .select('*')
          .eq('id', lead.id)
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('lead_emails')
          .select('*')
          .eq('lead_id', lead.id)
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),
      ])

      if (leadResult.error) throw leadResult.error
      if (emailResult.error) throw emailResult.error
      if (!leadResult.data) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
      }

      lead = leadResult.data as Lead
      emailThread = (emailResult.data || []) as LeadEmail[]
    }

    const result = await generateFollowupOutreach({
      ...validation.data,
      lead,
      emailThread,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Generate follow-up error:', error)
    if (error instanceof ModelJSONParseError) {
      return NextResponse.json(
        { error: 'The AI returned an invalid email format. Please retry.' },
        { status: 502 },
      )
    }
    if (error instanceof UngroundedEmailError) {
      return NextResponse.json(
        {
          error: 'Draft blocked because it included an unsupported fact. Re-run research or use only source-linked details.',
        },
        { status: 422 },
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate follow-up' },
      { status: 500 }
    )
  }
}
