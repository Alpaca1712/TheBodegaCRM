import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateJSON } from '@/lib/ai/anthropic'
import { z } from 'zod'

const requestSchema = z.object({
  leadId: z.string().uuid(),
})

interface EmailFeedback {
  gmail_message_id: string | null
  subject: string
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  strengths: string[]
  weaknesses: string[]
  rewrite_suggestion: string
}

interface CoachingReport {
  overall_grade: 'A' | 'B' | 'C' | 'D' | 'F'
  overall_summary: string
  mckenna_score: number
  hormozi_score: number
  strengths: string[]
  weaknesses: string[]
  email_feedback: EmailFeedback[]
  top_improvement: string
}

const SYSTEM_PROMPT = `You are an elite sales coach who evaluates cold outreach against two frameworks:

1. SAM MCKENNA'S "SHOW ME YOU KNOW ME" (SMYKM):
- Does the email show deep research about the recipient?
- Is the personal detail specific enough to be "almost creepy"?
- Does it open with "We've yet to be properly introduced"?
- Is the CTA interest-based (not just asking for time)?
- Is the email 80-150 words?
- No em dashes, no banned phrases, no bullet points?

2. ALEX HORMOZI'S $100M LEADS:
- Does it lead with value, not an ask?
- Is there a free resource/lead magnet offer?
- Is the value proposition specific to their situation?
- Does it follow the multi-touch sequence (initial, bump, value drop, channel switch)?
- Is the follow-up timing appropriate?

You have the FULL context of this deal: every email (complete body, not snippets), all interactions across channels (LinkedIn, calls, meetings), AI memories accumulated over time, conversation signals, and the lead's research profile. Use ALL of it to give the most informed coaching possible.

Grade each outbound email A-F and provide specific, actionable feedback.

Return JSON:
{
  "overall_grade": "A-F",
  "overall_summary": "2-3 sentences on the outreach quality",
  "mckenna_score": 1-10,
  "hormozi_score": 1-10,
  "strengths": ["what's working well"],
  "weaknesses": ["what needs improvement"],
  "email_feedback": [
    {
      "gmail_message_id": "id or null",
      "subject": "email subject",
      "grade": "A-F",
      "strengths": ["good things"],
      "weaknesses": ["bad things"],
      "rewrite_suggestion": "how to improve this specific email"
    }
  ],
  "top_improvement": "The single most impactful change to make"
}

RULES:
- Be brutally honest but constructive.
- Grade on the combined McKenna + Hormozi standard.
- A = exceptional, B = good, C = average, D = below average, F = needs complete rework.
- No em dashes in your output.
- Only evaluate OUTBOUND emails (skip inbound), but use inbound replies as context for how effective the outbound was.
- Factor in multi-channel touchpoints (LinkedIn, calls, meetings) when assessing the overall strategy.
- Reference specific agent memories or signals when they reveal missed opportunities.`

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
      supabase.from('agent_memory').select('*').eq('lead_id', leadId).order('created_at', { ascending: true }),
    ])

    if (leadResult.error || !leadResult.data) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const lead = leadResult.data
    const emails = emailsResult.data || []
    const interactions = interactionsResult.data || []
    const memories = memoriesResult.data || []

    if (emails.length === 0 && interactions.length === 0) {
      return NextResponse.json({ error: 'No emails or interactions to analyze' }, { status: 400 })
    }

    const emailContext = emails.map((e, i) => {
      const parts = [
        `[Email ${i + 1}] ${e.direction === 'outbound' ? 'OUTBOUND' : 'INBOUND'} | Type: ${e.email_type} | ${e.sent_at || e.created_at}`,
        `gmail_message_id: ${e.gmail_message_id || 'none'}`,
        `Subject: ${e.subject}`,
        `From: ${e.from_address || 'unknown'} -> To: ${e.to_address || 'unknown'}`,
        `Full Body:\n${e.body || '(empty)'}`,
      ]
      if (e.reply_content) {
        parts.push(`\nReply (${e.replied_at || 'date unknown'}):\n${e.reply_content}`)
      }
      if (e.cta_type) {
        parts.push(`CTA Type: ${e.cta_type}`)
      }
      return parts.join('\n')
    }).join('\n\n===\n\n')

    let interactionContext = ''
    if (interactions.length > 0) {
      interactionContext = '\n\n=== NON-EMAIL INTERACTIONS (LinkedIn, Calls, Meetings) ===\n\n' +
        interactions.map((ix, i) => {
          const parts = [
            `[Interaction ${i + 1}] ${ix.channel.toUpperCase()} | ${ix.interaction_type} | ${ix.occurred_at}`,
          ]
          if (ix.summary) parts.push(`Summary: ${ix.summary}`)
          if (ix.content) parts.push(`Full Content:\n${ix.content}`)
          if (ix.ai_summary) {
            const ai = ix.ai_summary as Record<string, unknown>
            if (ai.conversation_summary) parts.push(`AI Analysis: ${ai.conversation_summary}`)
            if (ai.next_step) parts.push(`Next Step: ${ai.next_step}`)
            if (ai.warmth) parts.push(`Warmth: ${ai.warmth}`)
          }
          return parts.join('\n')
        }).join('\n\n---\n\n')
    }

    let memoryContext = ''
    if (memories.length > 0) {
      const grouped: Record<string, string[]> = {}
      for (const m of memories) {
        const key = m.memory_type || 'general'
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(m.content)
      }
      memoryContext = '\n\n=== AGENT MEMORIES (accumulated intelligence about this lead) ===\n\n' +
        Object.entries(grouped).map(([type, items]) =>
          `${type.toUpperCase()}:\n${items.map(c => `  - ${c}`).join('\n')}`
        ).join('\n\n')
    }

    const signals = lead.conversation_signals as Array<{ type: string; signal: string; source: string }> | null
    let signalContext = ''
    if (signals && signals.length > 0) {
      signalContext = '\n\n=== CONVERSATION SIGNALS (AI-detected patterns) ===\n\n' +
        signals.map(s => `[${s.type.toUpperCase()}] ${s.signal} (source: ${s.source})`).join('\n')
    }

    const report = await generateJSON<CoachingReport>(
      SYSTEM_PROMPT,
      `Coach my outreach to ${lead.contact_name} at ${lead.company_name} (${lead.type}).
Current stage: ${lead.stage} | Priority: ${lead.priority}
Risk score: ${lead.risk_score ?? 'not assessed'}

=== LEAD PROFILE ===
- Title: ${lead.contact_title || 'Unknown'}
- Company: ${lead.company_name}${lead.company_description ? ` - ${lead.company_description}` : ''}
- Product: ${lead.product_name || 'N/A'}
- Personal details: ${lead.personal_details || 'None gathered'}
- SMYKM hooks: ${(lead.smykm_hooks || []).join('; ') || 'None'}
- Attack surface: ${lead.attack_surface_notes || 'None'}
- Investment thesis: ${lead.investment_thesis_notes || 'None'}
- Notes: ${lead.notes || 'None'}
- Conversation summary: ${lead.conversation_summary || 'None'}
- Recommended next step: ${lead.conversation_next_step || 'None'}
- Emails sent: ${lead.total_emails_out || 0} | Emails received: ${lead.total_emails_in || 0}
- Last outbound: ${lead.last_outbound_at || 'never'} | Last inbound: ${lead.last_inbound_at || 'never'}
${signalContext}
${memoryContext}

=== FULL EMAIL THREAD ===
${emailContext}
${interactionContext}`,
      { maxTokens: 8192, temperature: 0.4 }
    )

    return NextResponse.json(report)
  } catch (error) {
    console.error('Sales coaching error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate coaching report' },
      { status: 500 }
    )
  }
}
