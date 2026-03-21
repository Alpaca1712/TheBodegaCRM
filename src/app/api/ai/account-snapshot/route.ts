import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateJSON } from '@/lib/ai/anthropic'
import { z } from 'zod'

const requestSchema = z.object({
  leadId: z.string().uuid(),
})

interface AccountSnapshot {
  executive_summary: string
  sentiment_score: number
  health_grade: 'A' | 'B' | 'C' | 'D' | 'F'
  relationship_highlights: Array<{ date: string; event: string; significance: string }>
  stakeholder_map: Array<{ name: string; role: string; relationship: string }>
  active_blockers: string[]
  opportunities: string[]
  recommended_actions: string[]
}

const SYSTEM_PROMPT = `You are a sales intelligence analyst for Rocoto (AI agent security company).

Generate a comprehensive account snapshot from all available data about a lead.

Return JSON:
{
  "executive_summary": "3-5 sentence overview of the relationship, where it stands, and what matters most right now",
  "sentiment_score": 1-10 (1=hostile, 5=neutral, 10=champion),
  "health_grade": "A|B|C|D|F" (A=thriving, F=dead),
  "relationship_highlights": [{"date": "YYYY-MM-DD", "event": "what happened", "significance": "why it matters"}],
  "stakeholder_map": [{"name": "person", "role": "their title/role", "relationship": "how they relate to the deal"}],
  "active_blockers": ["things preventing progress"],
  "opportunities": ["potential upsells, expansions, or angles"],
  "recommended_actions": ["specific next steps ranked by priority"]
}

RULES:
- Be specific, not generic. Reference actual emails, meetings, and interactions.
- Sentiment score should reflect the LATEST state of the relationship.
- Health grade: A=active engagement/deal moving, B=positive but slow, C=stalled, D=going cold, F=lost/hostile.
- No em dashes. Use commas or periods.
- Keep each field concise but actionable.`

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

    const { leadId } = validation.data

    const [leadResult, emailsResult, interactionsResult, memoriesResult] = await Promise.all([
      supabase.from('leads').select('*').eq('id', leadId).single(),
      supabase.from('lead_emails').select('*').eq('lead_id', leadId).order('created_at', { ascending: true }),
      supabase.from('lead_interactions').select('*').eq('lead_id', leadId).order('occurred_at', { ascending: true }),
      supabase.from('agent_memory').select('*').eq('lead_id', leadId).order('relevance_score', { ascending: false }),
    ])

    if (leadResult.error || !leadResult.data) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const lead = leadResult.data
    const emails = emailsResult.data || []
    const interactions = interactionsResult.data || []
    const memories = memoriesResult.data || []

    // Find related leads at same domain
    let relatedLeads: Array<{ contact_name: string; contact_title: string | null; stage: string }> = []
    if (lead.email_domain) {
      const { data: related } = await supabase
        .from('leads')
        .select('contact_name, contact_title, stage')
        .eq('email_domain', lead.email_domain)
        .neq('id', leadId)
        .limit(10)
      relatedLeads = related || []
    }

    const emailContext = emails.slice(-30).map((e, i) =>
      `[${i + 1}] ${e.direction === 'outbound' ? 'US ->' : '<- THEM'} | ${e.created_at} | ${e.subject}\n${(e.body || '').slice(0, 500)}`
    ).join('\n---\n')

    const interactionContext = interactions.map((i, idx) =>
      `[${idx + 1}] ${i.channel}/${i.interaction_type} | ${i.occurred_at}\n${i.content || i.summary || '(no content)'}`
    ).join('\n---\n')

    const memoryContext = memories.map(m =>
      `[${m.memory_type}] ${m.content} (relevance: ${m.relevance_score}/10)`
    ).join('\n')

    const relatedContext = relatedLeads.length > 0
      ? `\nRelated contacts at ${lead.company_name}:\n` + relatedLeads.map(r => `- ${r.contact_name} (${r.contact_title || 'unknown role'}) - stage: ${r.stage}`).join('\n')
      : ''

    const userPrompt = `Generate account snapshot for ${lead.contact_name} at ${lead.company_name}.

Lead type: ${lead.type}
Current stage: ${lead.stage}
Priority: ${lead.priority}
Company: ${lead.company_description || 'N/A'}
Notes: ${lead.notes || 'None'}
Attack surface: ${lead.attack_surface_notes || 'N/A'}
Investment thesis: ${lead.investment_thesis_notes || 'N/A'}
Personal details: ${lead.personal_details || 'N/A'}
SMYKM hooks: ${(lead.smykm_hooks || []).join('; ') || 'None'}
Conversation summary: ${lead.conversation_summary || 'None'}
Next step: ${lead.conversation_next_step || 'None'}
Emails in: ${lead.total_emails_in || 0}, Emails out: ${lead.total_emails_out || 0}
Last inbound: ${lead.last_inbound_at || 'Never'}
Last outbound: ${lead.last_outbound_at || 'Never'}
${relatedContext}

=== EMAIL HISTORY ===
${emailContext || 'No emails'}

=== INTERACTIONS ===
${interactionContext || 'No interactions'}

=== AGENT MEMORIES ===
${memoryContext || 'No memories yet'}`

    const snapshot = await generateJSON<AccountSnapshot>(
      SYSTEM_PROMPT,
      userPrompt,
      { maxTokens: 4096, temperature: 0.3 }
    )

    // Cache on the lead
    await supabase.from('leads').update({
      account_snapshot: snapshot,
      snapshot_generated_at: new Date().toISOString(),
    }).eq('id', leadId)

    return NextResponse.json(snapshot)
  } catch (error) {
    console.error('Account snapshot error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate snapshot' },
      { status: 500 }
    )
  }
}
