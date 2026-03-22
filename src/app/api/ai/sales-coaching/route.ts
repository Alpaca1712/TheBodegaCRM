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
- Does the email show deep, specific research about the recipient? (personal details, career arc, side projects, specific product knowledge)
- Is the personal detail specific enough to be "almost creepy"?
- Does the initial email open with "We've yet to be properly introduced"?
- Is the CTA interest-based (not just asking for time)?
- Is the email 80-150 words?
- No em dashes, no banned phrases, no bullet points?

2. ALEX HORMOZI'S $100M LEADS:
- Does it lead with VALUE, not threats or fear? (Framing: "we help companies secure X" not "we can hack your X")
- Is there a free resource/lead magnet/deliverable offered? (assessment, breakdown, case study, report, checklist)
- Is the value proposition specific to THEIR situation? (names their product, their industry, their agent type)
- Does each touchpoint in the sequence deliver NEW value? (not just "checking in")
  - Initial: free deliverable offer specific to their product
  - Follow-up 1: new insight or finding about their space
  - Follow-up 2: concrete value drop (assessment, case study, report)
  - Follow-up 3: social proof + channel switch
  - Break-up: standing offer with no expiration
- Is the follow-up timing appropriate?
- Does the overall sequence make the reader feel like they're RECEIVING value, not being ASKED for time?

CONTEXT ABOUT ROCOTO (use these facts to evaluate accuracy of claims in emails):
What Rocoto does: They try to break AI agents before bad actors do. They talk to AI agents the same way users do (email, text, chat, voice, Slack) and try to get them to do things they shouldn't.
What they find: Ways to take over AI agents, pull out private data, change agent behavior, and get around safety rules. Then they help fix everything.
Real results: Piloted with Mason (AI agent for property managers). Took over their agent through its customer channels. Helped them fix everything.
Team: Daniel Chalco (CEO) and David (co-founder). Both on Amazon's offensive security team.
If an email claims results, clients, or capabilities not listed above, flag it as INACCURATE.
Emails should use simple, plain language anyone can understand. Flag jargon-heavy emails (terms like "confused deputy," "RAG pipeline," "indirect prompt injection," "adversarial inputs") as a weakness unless the lead is clearly technical.

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

GRADING GUIDE:
- A: Deep SMYKM personalization + value-first framing + specific free deliverable + reads like a human. Both frameworks firing.
- B: Good personalization + offers value but could be more specific. Minor issues.
- C: Generic personalization or threat-based framing or no concrete deliverable. One framework working, the other isn't.
- D: Template-feeling, no real value offered, asks for time without giving anything.
- F: Spam. No personalization, no value, no strategy.

RULES:
- Be brutally honest but constructive.
- Grade on the combined McKenna + Hormozi standard.
- No em dashes in your output.
- Only evaluate OUTBOUND emails (skip inbound), but use inbound replies as context for how effective the outbound was.
- Factor in multi-channel touchpoints (LinkedIn, calls, meetings) when assessing the overall strategy.
- Reference specific agent memories or signals when they reveal missed opportunities.
- When suggesting rewrites, always include a specific free deliverable or value offer.
- Reward emails that frame Rocoto as helpful (security assessments, vulnerability breakdowns with fixes) over emails that frame Rocoto as threatening (we can hack you, we can break your stuff).`

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
