import { generateJSON } from '@/lib/ai/anthropic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const requestSchema = z.object({
  lead: z.object({
    type: z.enum(['customer', 'investor']),
    company_name: z.string(),
    product_name: z.string().optional().nullable(),
    fund_name: z.string().optional().nullable(),
    contact_name: z.string(),
    contact_title: z.string().optional().nullable(),
    company_description: z.string().optional().nullable(),
    attack_surface_notes: z.string().optional().nullable(),
    investment_thesis_notes: z.string().optional().nullable(),
    personal_details: z.string().optional().nullable(),
    smykm_hooks: z.array(z.string()).optional().default([]),
    stage: z.string(),
  }),
  originalEmail: z.object({
    subject: z.string(),
    body: z.string(),
    sent_at: z.string(),
  }),
  replyContent: z.string().optional().nullable(),
  followUpNumber: z.number().int().min(1).max(4),
})

const SYSTEM_PROMPT = `You are writing a follow-up email from Daniel Chalco, co-founder of Rocoto. Rocoto is an autonomous AI agent that hacks other AI agents.

RULES:
- Reply on the same thread (Re: original subject)
- No em dashes
- No AI slop (no "the question nobody's asking," "in today's landscape," "at the intersection of")
- Shorter than the original email
- Human and casual
- Write like a founder texting another founder

Respond with ONLY valid JSON:
{"subject": "...", "body": "...", "channel": "email|linkedin|twitter"}`

function buildFollowUpPrompt(input: z.infer<typeof requestSchema>): string {
  const { lead, originalEmail, replyContent, followUpNumber } = input

  const context = `
Lead: ${lead.contact_name} at ${lead.company_name}
Lead type: ${lead.type}
Lead stage: ${lead.stage}
Original email sent: ${originalEmail.sent_at}
Original subject: ${originalEmail.subject}
Original body: ${originalEmail.body}
Reply received: ${replyContent || 'No reply'}
${lead.product_name ? `Product: ${lead.product_name}` : ''}
${lead.attack_surface_notes ? `Attack surface: ${lead.attack_surface_notes}` : ''}
${lead.investment_thesis_notes ? `Thesis: ${lead.investment_thesis_notes}` : ''}
`.trim()

  if (replyContent) {
    return `${context}

They REPLIED with: "${replyContent}"

Use Hormozi's ACA framework to respond:
- Acknowledge: Mirror back what they said
- Compliment: Tie it to a positive character trait
- Ask: Lead the conversation toward next steps

If they asked for more info: ${lead.type === 'investor' ? 'offer to send the one-page memo' : 'offer a specific breakdown of their vulnerabilities'}
If they said "let's chat": suggest they pick a time. "What works for you? I'll send over an invite."
If they said "not right now": thank them, leave the door open
Keep it SHORT. Match the length and energy of their reply.`
  }

  if (followUpNumber === 1) {
    return `${context}

This is follow-up #1 (Day 4 — The Bump).
- Keep it to 2-3 sentences max
- Reference the original email
- Add one new piece of value or a new development
- Don't repeat the pitch
- Example tone: "Hey [Name], wanted to bump this up in your inbox. Since I sent this, we actually found a new attack pattern against [type of agent they build] that I think you'd find interesting. Happy to share if you're curious."`
  }

  if (followUpNumber === 2) {
    if (lead.type === 'investor') {
      return `${context}

This is follow-up #2 (Day 9 — Memo Drop for investors).
- Send the investor memo (one-page doc)
- Example: "Hey [Name], I put together a one-page memo on what we're building. Figured it might be easier than a cold email to get a feel for the opportunity. Happy to go deeper on anything."
- Don't ask for a meeting. Just deliver value.`
    }
    return `${context}

This is follow-up #2 (Day 9 — Lead Magnet Drop).
- Don't ask for a meeting. Just deliver value.
- Offer a specific free resource related to their product
- Example: "Hey [Name], I put together a one-page breakdown of the top 3 ways [their type of agent] can be manipulated through [their specific input channel]. No strings attached, just thought it'd be useful given what you're building. Want me to send it over?"`
  }

  if (followUpNumber === 3) {
    return `${context}

This is follow-up #3 (Day 14 — Channel Switch to LinkedIn or Twitter DM).
- This should be written for LinkedIn DM or Twitter DM, not email
- Much shorter. 2-3 sentences max.
- Reference that you emailed them. Acknowledge they're busy.
- Offer value, not a meeting.
- Example DM: "Hey [Name], I sent you a note about AI agent security a couple weeks ago. Didn't want to be annoying in your inbox but thought this might be a better channel. We're finding some really interesting vulnerabilities in [their type of agent]. Happy to share what we're seeing if you're curious."`
  }

  // followUpNumber === 4: Break-up email
  return `${context}

This is the BREAK-UP email (Day 21+).
- Last email. Give them an easy out.
- Example: "Hey [Name], I've reached out a couple of times and I know you're busy. If AI agent security isn't a priority right now, totally understand. If it ever becomes one, I'm easy to find. Cheers, Daniel"
- Keep it SHORT and graceful.`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = requestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      )
    }

    const result = await generateJSON<{
      subject: string
      body: string
      channel: 'email' | 'linkedin' | 'twitter'
    }>(SYSTEM_PROMPT, buildFollowUpPrompt(validation.data), {
      temperature: 0.7,
      maxTokens: 600,
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
