import { generateJSON } from '@/lib/ai/anthropic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const emailSchema = z.object({
  direction: z.enum(['inbound', 'outbound']),
  subject: z.string(),
  body: z.string(),
  sent_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
  email_type: z.string().nullable().optional(),
})

const requestSchema = z.object({
  lead: z.object({
    type: z.enum(['customer', 'investor', 'partnership']),
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
    conversation_summary: z.string().optional().nullable(),
    conversation_next_step: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  }),
  emailThread: z.array(emailSchema).optional().default([]),
  followUpNumber: z.number().int().min(1).max(4),
})

const SYSTEM_PROMPT = `You are writing a follow-up email from Daniel Chalco, co-founder of Rocoto. Rocoto is an autonomous AI agent that hacks other AI agents.

You have access to the FULL conversation history, deep research notes, and SMYKM hooks for this lead. Use ALL of this context to write the most personalized, cheeky, memorable follow-up possible.

CRITICAL RULES:
- Reply on the same thread (Re: original subject)
- No em dashes. Use commas, periods, or "and"
- No AI slop: no "the question nobody's asking," "in today's landscape," "at the intersection of," "game-changer," "revolutionize"
- SHORTER than the original email. Follow-ups get progressively shorter.
- Human and casual. Write like a founder texting another founder.
- Reference something SPECIFIC from the research or their background — not generic filler
- Be cheeky and memorable. The goal is to make them smile or think "this person is clever"
- Use the SMYKM hooks — these are details only this person would recognize
- If you have conversation intel or AI summary, use it to understand where the relationship stands

Respond with ONLY valid JSON:
{"subject": "...", "body": "...", "channel": "email|linkedin|twitter"}`

function buildFullContext(input: z.infer<typeof requestSchema>): string {
  const { lead, emailThread, followUpNumber } = input

  const sections: string[] = []

  sections.push(`=== LEAD ===
Name: ${lead.contact_name}
Title: ${lead.contact_title || 'Unknown'}
Company: ${lead.company_name}
Type: ${lead.type}
Stage: ${lead.stage}`)

  if (lead.company_description) {
    sections.push(`=== COMPANY ===\n${lead.company_description}`)
  }

  if (lead.type === 'customer' && lead.attack_surface_notes) {
    sections.push(`=== ATTACK SURFACE (how their AI is vulnerable) ===\n${lead.attack_surface_notes}`)
  }
  if (lead.type === 'investor' && lead.investment_thesis_notes) {
    sections.push(`=== INVESTMENT THESIS ===\n${lead.investment_thesis_notes}`)
  }
  if (lead.type === 'partnership' && lead.investment_thesis_notes) {
    sections.push(`=== PARTNERSHIP NOTES ===\n${lead.investment_thesis_notes}`)
  }

  if (lead.personal_details) {
    sections.push(`=== PERSONAL DETAILS (career arc, blog posts, podcasts, side projects) ===\n${lead.personal_details}`)
  }

  if (lead.smykm_hooks?.length) {
    sections.push(`=== SMYKM HOOKS (use these — they're details only this person would recognize) ===\n${lead.smykm_hooks.map((h, i) => `${i + 1}. ${h}`).join('\n')}`)
  }

  if (lead.conversation_summary) {
    sections.push(`=== AI CONVERSATION SUMMARY ===\n${lead.conversation_summary}`)
  }
  if (lead.conversation_next_step) {
    sections.push(`=== RECOMMENDED NEXT STEP ===\n${lead.conversation_next_step}`)
  }
  if (lead.notes) {
    sections.push(`=== MANUAL NOTES ===\n${lead.notes}`)
  }

  if (emailThread.length > 0) {
    const threadStr = emailThread
      .map((e, i) => {
        const dir = e.direction === 'outbound' ? 'YOU (Daniel) →' : `← ${lead.contact_name}`
        const date = e.sent_at || e.created_at || 'unknown date'
        return `[${i + 1}] ${dir} | ${date}\nSubject: ${e.subject}\n${e.body}`
      })
      .join('\n\n---\n\n')
    sections.push(`=== FULL EMAIL THREAD (oldest first) ===\n${threadStr}`)
  }

  const context = sections.join('\n\n')

  const hasReply = emailThread.some(e => e.direction === 'inbound')

  if (hasReply) {
    const lastInbound = [...emailThread].reverse().find(e => e.direction === 'inbound')
    return `${context}

=== TASK ===
They REPLIED. Their latest message is above in the thread.

Use Hormozi's ACA framework to respond:
- Acknowledge: Mirror back what they said in your own words
- Compliment: Tie it to a positive character trait (not sycophantic — genuine)
- Ask: Lead the conversation toward next steps

If they asked for more info: ${lead.type === 'investor' ? 'offer to send the one-page memo' : lead.type === 'partnership' ? 'offer to send a partnership overview' : 'offer a specific breakdown of their vulnerabilities'}
If they said "let's chat": suggest they pick a time. "What works for you? I'll send over an invite."
If they said "not right now": thank them, leave the door open. Be graceful.

Their reply: "${lastInbound?.body || ''}"

Keep it SHORT. Match the length and energy of their reply. Use a SMYKM hook if you can work one in naturally.`
  }

  if (followUpNumber === 1) {
    return `${context}

=== TASK: FOLLOW-UP #1 (Day 4 — The Bump) ===
- 2-3 sentences MAX
- Reference the original email briefly
- Add ONE new piece of value — use something from the research or SMYKM hooks that you DIDN'T use in the original email
- Be cheeky. Make them remember you.
- Don't repeat the pitch. They already know what Rocoto does.
- If you found something new about their company (a blog post, a product update, a vulnerability pattern), reference it specifically.`
  }

  if (followUpNumber === 2) {
    const typeSpecific = lead.type === 'investor'
      ? `This is the Memo Drop. Offer to send the one-page investor memo.
- Frame it as "easier than a cold email to get a feel for the opportunity"
- Don't ask for a meeting. Just deliver value.`
      : lead.type === 'partnership'
      ? `This is the Partnership Overview Drop. Offer a brief overview of how Rocoto complements their business.
- Frame it around mutual value — what's in it for THEM
- Don't ask for a meeting. Just deliver value.`
      : `This is the Lead Magnet Drop. Offer a specific free resource.
- Use the attack surface notes to offer something concrete: "I put together a breakdown of the top 3 ways [their specific agent type] can be manipulated through [their specific channel]"
- Don't ask for a meeting. Just deliver value.
- The more specific to THEIR product, the better.`

    return `${context}

=== TASK: FOLLOW-UP #2 (Day 9 — Value Drop) ===
${typeSpecific}
- Use a SMYKM hook you haven't used yet
- Be brief. 3-4 sentences max.`
  }

  if (followUpNumber === 3) {
    return `${context}

=== TASK: FOLLOW-UP #3 (Day 14 — Channel Switch) ===
- Write for LinkedIn DM or Twitter DM, NOT email
- 2-3 sentences MAX. DMs are short.
- Reference that you emailed them. Acknowledge they're busy.
- Use a SMYKM hook — something personal that shows you're not just mass-blasting
- Offer value, not a meeting
- Be human. "Hey [Name], I sent you a note about AI agent security a couple weeks ago..." tone.`
  }

  return `${context}

=== TASK: BREAK-UP EMAIL (Day 21+ — The Graceful Exit) ===
- Last email. Give them an easy out.
- Be graceful and memorable. Leave the door open.
- 2-3 sentences max.
- Optional: one final cheeky reference to something from their background
- Tone: "Hey [Name], I've reached out a couple of times and I know you're busy. If [specific thing about their situation] isn't making AI security a priority right now, totally understand. If it ever becomes one, I'm easy to find."`
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
    }>(SYSTEM_PROMPT, buildFullContext(validation.data), {
      temperature: 0.8,
      maxTokens: 800,
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
