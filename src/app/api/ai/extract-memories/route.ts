import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateJSON } from '@/lib/ai/anthropic'
import { z } from 'zod'

const requestSchema = z.object({
  leadId: z.string().uuid(),
  text: z.string().min(1),
  source: z.enum(['email', 'interaction', 'manual', 'research']),
  sourceId: z.string().optional(),
})

interface ExtractedMemory {
  memory_type: 'preference' | 'objection' | 'personal' | 'strategic' | 'context'
  content: string
  relevance_score: number
}

const SYSTEM_PROMPT = `You extract memorable facts from sales conversations for a CRM.

Extract facts that would be useful for personalizing future outreach. Categories:
- preference: What they like, dislike, care about, communication preferences
- objection: Concerns, pushback, reasons for hesitation
- personal: Personal details (hobbies, background, family, education, career history)
- strategic: Business decisions, priorities, timelines, budget signals
- context: Situational info (org changes, product launches, hiring, funding)

RULES:
- Each fact should be a single, clear sentence
- Only extract genuinely useful info, not filler
- Score relevance 1-10 (10 = extremely useful for future emails)
- Skip anything too generic ("they work at a company")
- Max 8 memories per extraction

Return JSON array:
[{"memory_type": "...", "content": "...", "relevance_score": N}]

If nothing worth remembering, return: []`

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

    const { leadId, text, source, sourceId } = validation.data

    const { data: profile } = await supabase
      .from('profiles')
      .select('active_org_id')
      .eq('user_id', user.id)
      .single()

    const orgId = profile?.active_org_id || null

    const memories = await generateJSON<ExtractedMemory[]>(
      SYSTEM_PROMPT,
      `Extract memorable facts from this ${source} content:\n\n${text}`,
      { maxTokens: 2048, temperature: 0.2 }
    )

    if (!Array.isArray(memories) || memories.length === 0) {
      return NextResponse.json({ extracted: 0, memories: [] })
    }

    const rows = memories.map(m => ({
      lead_id: leadId,
      org_id: orgId,
      memory_type: m.memory_type,
      content: m.content,
      source,
      source_id: sourceId || null,
      relevance_score: m.relevance_score,
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('agent_memory')
      .insert(rows)
      .select()

    if (insertError) {
      console.error('Memory insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save memories' }, { status: 500 })
    }

    return NextResponse.json({ extracted: inserted?.length || 0, memories: inserted })
  } catch (error) {
    console.error('Extract memories error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extract memories' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const leadId = request.nextUrl.searchParams.get('leadId')
    if (!leadId) {
      return NextResponse.json({ error: 'leadId required' }, { status: 400 })
    }

    const { data: memories, error } = await supabase
      .from('agent_memory')
      .select('*')
      .eq('lead_id', leadId)
      .order('relevance_score', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 })
    }

    return NextResponse.json({ memories: memories || [] })
  } catch (error) {
    console.error('Get memories error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const memoryId = request.nextUrl.searchParams.get('id')
    if (!memoryId) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('agent_memory')
      .delete()
      .eq('id', memoryId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete memory error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
