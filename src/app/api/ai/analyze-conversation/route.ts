import { NextRequest, NextResponse } from 'next/server'
import { generateJSON } from '@/lib/ai/anthropic'
import { z } from 'zod'
import type { PipelineStage } from '@/types/leads'

const requestSchema = z.object({
  lead: z.object({
    type: z.enum(['customer', 'investor']),
    contact_name: z.string(),
    company_name: z.string(),
    contact_email: z.string().optional(),
    current_stage: z.string(),
    company_description: z.string().optional(),
    attack_surface_notes: z.string().optional(),
    investment_thesis_notes: z.string().optional(),
  }),
  directConversation: z.array(z.object({
    subject: z.string(),
    from: z.string(),
    date: z.string(),
    body: z.string(),
    direction: z.enum(['inbound', 'outbound']),
  })),
  domainConversation: z.array(z.object({
    subject: z.string(),
    from: z.string(),
    date: z.string(),
    body: z.string(),
    direction: z.enum(['inbound', 'outbound']),
    participant: z.string().optional(),
  })).optional(),
})

export interface ConversationAnalysis {
  suggested_stage: PipelineStage
  stage_confidence: 'high' | 'medium' | 'low'
  stage_reason: string
  conversation_summary: string
  next_step: string
  signals: Array<{
    type: 'positive' | 'negative' | 'neutral' | 'action_needed'
    signal: string
    source: string
  }>
  reply_urgency: 'immediate' | 'soon' | 'can_wait' | 'none'
  domain_insights: string | null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = requestSchema.parse(body)

    const directEmails = parsed.directConversation
      .map((e, i) => `[${i + 1}] ${e.direction === 'outbound' ? 'YOU →' : '← THEM'} | ${e.date}\nSubject: ${e.subject}\nFrom: ${e.from}\n${e.body}`)
      .join('\n\n---\n\n')

    let domainContext = ''
    if (parsed.domainConversation?.length) {
      domainContext = `\n\n=== OTHER CONVERSATIONS WITH PEOPLE AT ${parsed.lead.company_name.toUpperCase()} ===\n\n` +
        parsed.domainConversation
          .map((e, i) => `[D${i + 1}] ${e.direction === 'outbound' ? 'YOU →' : '← THEM'} ${e.participant || ''} | ${e.date}\nSubject: ${e.subject}\n${e.body.slice(0, 500)}`)
          .join('\n\n---\n\n')
    }

    const leadContext = parsed.lead.type === 'customer'
      ? `Company: ${parsed.lead.company_name}${parsed.lead.company_description ? `\nDescription: ${parsed.lead.company_description}` : ''}${parsed.lead.attack_surface_notes ? `\nSecurity notes: ${parsed.lead.attack_surface_notes}` : ''}`
      : `Fund/Firm: ${parsed.lead.company_name}${parsed.lead.investment_thesis_notes ? `\nThesis: ${parsed.lead.investment_thesis_notes}` : ''}`

    const systemPrompt = `You are an expert sales intelligence analyst for Rocoto, an AI agent security company doing cold email outreach.

Your job: Read the FULL email conversation history between us and a lead, understand exactly where the relationship stands, and recommend the correct pipeline stage.

Pipeline stages (in order):
- researched: We know about them but haven't emailed yet
- email_drafted: Email is written but not sent
- email_sent: Initial email sent, awaiting response
- replied: They responded (any response)
- meeting_booked: A meeting/call is scheduled
- meeting_held: Meeting happened, awaiting follow-up
- follow_up: In active follow-up after meeting or reply
- closed_won: Deal signed, investment committed, or partnership agreed
- closed_lost: Explicitly said no, unsubscribed, or asked to stop
- no_response: Multiple follow-ups sent with zero response

CRITICAL RULES:
- Read every single email in the thread chronologically
- The MOST RECENT emails matter most for stage determination
- If they mention a meeting/call/demo, that's meeting_booked
- If they say "let's circle back", "not right now", or go silent after interest, that's follow_up
- If they explicitly say "not interested", "please remove me", or "no thanks", that's closed_lost
- If the last email is from us with no reply for 7+ days, consider no_response
- Look for commitment language: "let's do it", "send me the contract", "we're in" → closed_won
- Look for the domain conversations for additional context about the company's stance

Respond with valid JSON only, no markdown.`

    const userPrompt = `Analyze this conversation with ${parsed.lead.contact_name} (${parsed.lead.type}).

${leadContext}
Current pipeline stage: ${parsed.lead.current_stage}

=== DIRECT EMAIL THREAD (chronological) ===

${directEmails || 'No emails found yet.'}
${domainContext}

Respond with this JSON structure:
{
  "suggested_stage": "one of the pipeline stages",
  "stage_confidence": "high" | "medium" | "low",
  "stage_reason": "1-2 sentences explaining why this stage",
  "conversation_summary": "2-4 sentence summary of the full conversation arc — where it started, key turns, and where it stands now",
  "next_step": "Specific action to take next (e.g. 'Send follow-up referencing their Q2 security audit mention')",
  "signals": [
    {"type": "positive|negative|neutral|action_needed", "signal": "what you detected", "source": "which email"}
  ],
  "reply_urgency": "immediate|soon|can_wait|none",
  "domain_insights": "Any relevant context from other people at the same company, or null"
}`

    const analysis = await generateJSON<ConversationAnalysis>(
      systemPrompt,
      userPrompt,
      { maxTokens: 2048, temperature: 0.3 }
    )

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Conversation analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze conversation', details: (error as Error).message },
      { status: 500 }
    )
  }
}
