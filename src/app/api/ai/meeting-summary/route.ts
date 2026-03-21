import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateJSON } from '@/lib/ai/anthropic'
import { z } from 'zod'

const requestSchema = z.object({
  leadId: z.string().uuid(),
  content: z.string().min(10, 'Meeting notes must be at least 10 characters'),
  meetingType: z.enum(['call', 'meeting', 'demo', 'other']).default('meeting'),
  occurredAt: z.string().optional(),
})

interface MeetingSummary {
  summary: string
  action_items: Array<{ owner: string; task: string; deadline: string | null }>
  key_quotes: string[]
  objections_raised: string[]
  sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative'
  next_steps: string[]
  deal_signals: Array<{ type: 'positive' | 'negative' | 'neutral'; signal: string }>
}

const SYSTEM_PROMPT = `You are a sales meeting analyst for Rocoto (AI agent security company).

Analyze meeting notes/transcript and extract structured intelligence.

Return JSON:
{
  "summary": "3-5 sentence summary of what happened, key decisions, and outcome",
  "action_items": [{"owner": "us|them|both", "task": "specific action", "deadline": "date or null"}],
  "key_quotes": ["important things they said, verbatim or near-verbatim"],
  "objections_raised": ["concerns or pushback they expressed"],
  "sentiment": "very_positive|positive|neutral|negative|very_negative",
  "next_steps": ["ordered list of what should happen next"],
  "deal_signals": [{"type": "positive|negative|neutral", "signal": "what it means for the deal"}]
}

RULES:
- Be specific. Quote actual content from the notes.
- Action items should be concrete and assignable.
- Sentiment reflects their overall attitude toward working with us.
- Deal signals should help predict whether this deal closes.
- No em dashes. Use commas or periods.`

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = requestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 })
    }

    const { leadId, content, meetingType, occurredAt } = validation.data

    const [leadRes, profileRes] = await Promise.all([
      supabase.from('leads').select('contact_name, company_name, type, stage').eq('id', leadId).single(),
      supabase.from('profiles').select('active_org_id').eq('user_id', user.id).single(),
    ])

    const lead = leadRes.data
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const orgId = profileRes.data?.active_org_id || null

    const summary = await generateJSON<MeetingSummary>(
      SYSTEM_PROMPT,
      `Analyze this ${meetingType} with ${lead.contact_name} at ${lead.company_name} (${lead.type}, stage: ${lead.stage}):\n\n${content}`,
      { maxTokens: 4096, temperature: 0.3 }
    )

    const { data: interaction, error: insertError } = await supabase
      .from('lead_interactions')
      .insert({
        lead_id: leadId,
        user_id: user.id,
        org_id: orgId,
        channel: meetingType === 'call' ? 'phone' : 'in_person',
        interaction_type: meetingType === 'call' ? 'call' : 'meeting',
        content,
        summary: summary.summary,
        ai_summary: summary,
        occurred_at: occurredAt || new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Meeting summary insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save meeting summary' }, { status: 500 })
    }

    // Auto-extract memories from the meeting
    try {
      const memoryPrompt = `Extract memorable facts from this meeting summary:\n\nSummary: ${summary.summary}\nKey quotes: ${summary.key_quotes.join('; ')}\nObjections: ${summary.objections_raised.join('; ')}`

      const memories = await generateJSON<Array<{ memory_type: string; content: string; relevance_score: number }>>(
        `Extract memorable facts useful for future outreach. Return JSON array: [{"memory_type": "preference|objection|personal|strategic|context", "content": "...", "relevance_score": 1-10}]. Max 5 facts. Return [] if nothing worth remembering.`,
        memoryPrompt,
        { maxTokens: 1024, temperature: 0.2 }
      )

      if (Array.isArray(memories) && memories.length > 0) {
        await supabase.from('agent_memory').insert(
          memories.map(m => ({
            lead_id: leadId,
            org_id: orgId,
            memory_type: m.memory_type,
            content: m.content,
            source: 'interaction' as const,
            source_id: interaction.id,
            relevance_score: m.relevance_score,
          }))
        )
      }
    } catch (memErr) {
      console.error('Meeting memory extraction error:', memErr)
    }

    return NextResponse.json({ interaction, summary })
  } catch (error) {
    console.error('Meeting summary error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate meeting summary' },
      { status: 500 }
    )
  }
}
