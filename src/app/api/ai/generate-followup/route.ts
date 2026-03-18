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
  customContext: z.string().optional().default(''),
})

const SYSTEM_PROMPT = `You are Daniel Chalco writing a follow-up. Rocoto is an AI agent that hacks other AI agents. His co-founder is David.

You have the FULL conversation history, deep research, SMYKM hooks, and sometimes STRATEGIC DIRECTION with a specific angle or offer Daniel wants to use.

PRIORITY ORDER:
1. If STRATEGIC DIRECTION is provided, that IS the email. Build the entire follow-up around that strategy, offer, or angle. Don't just mention it. Make it the core pitch. Write it like Daniel would actually write it: direct, confident, a little provocative, with a clear offer that has teeth.
2. If no strategic direction, use SMYKM hooks and the conversation history to write a short, personally specific follow-up.

WHAT GOOD LOOKS LIKE (when given strategic direction like "free pentest, Amalfi affair style"):
"Hey Nick,

If your pentest vendor sucks, why not have some fun and cheat on them with us.

Till the end of the month, show us a pentest report from the last six months and we'll waive our fee entirely for one AI agent scan. If we find nothing critical or you hate the report, you owe us nothing.

Got a recent report and an AI agent in production?

Best,
Daniel Chalco
CEO of Rocoto"

Notice: direct, punchy, the offer has real stakes, reads like a human wrote it in 30 seconds. THAT is the bar.

WHAT BAD LOOKS LIKE:
"Put together a breakdown of how Harvey's contract analysis agents can be manipulated through prompt injection attacks (inspired by your team's recent sandbox escape findings). Free pentest if we find nothing, like Amalfi's affair guarantee but for AI security."

That's bad because it just paraphrased the strategic direction notes. It reads like an AI summarizing instructions, not a human writing an email.

TONE: Direct, confident, slightly provocative. You're a founder making a real offer, not a marketer writing copy. Think bar conversation, not LinkedIn post. Short sentences. No filler.

FORMATTING:
- Start with "Hello [First Name]," or "Hey [First Name]," on its own line.
- End email follow-ups with exactly:
Best,
Daniel Chalco
CEO of Rocoto
- For LinkedIn/Twitter DMs, just "Daniel" or no sign-off.

HARD RULES:
- ABSOLUTELY NO EM DASHES. Never "\u2014" or "\u2013". Use commas, periods, "and", or parentheses. One em dash = rejected.
- BANNED: "just checking in," "circling back," "wanted to follow up," "bumping this," "I hope this finds you well," "in today's landscape," "at the intersection of," "game-changer," "I noticed that," "fascinating intersection," "inspired by"
- NEVER paraphrase or quote the strategic direction notes. Rewrite the idea completely in your own words as if you came up with it yourself.
- If they replied, match their energy and length exactly
- Two to four short paragraphs max. Each paragraph 1-2 sentences.
- The email should feel like Daniel dashed it off in 30 seconds because he had a good idea

Respond with ONLY valid JSON:
{"subject": "...", "body": "...", "channel": "email|linkedin|twitter"}`

function buildFullContext(input: z.infer<typeof requestSchema>): string {
  const { lead, emailThread, followUpNumber, customContext } = input

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
    sections.push(`=== SMYKM HOOKS (use these, they're details only this person would recognize) ===\n${lead.smykm_hooks.map((h, i) => `${i + 1}. ${h}`).join('\n')}`)
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

  if (customContext?.trim()) {
    sections.push(`=== STRATEGIC DIRECTION (this is the #1 priority, build the ENTIRE email around this) ===\nDaniel's notes on the angle/offer he wants to use. NEVER quote, paraphrase, or summarize these notes. Instead, write a completely original email that executes this strategy as if Daniel thought of it himself. The recipient must NEVER be able to guess these notes existed.\n\n${customContext.trim()}`)
  }

  const context = sections.join('\n\n')

  const hasReply = emailThread.some(e => e.direction === 'inbound')

  if (hasReply) {
    const lastInbound = [...emailThread].reverse().find(e => e.direction === 'inbound')
    return `${context}

=== TASK: THEY REPLIED ===
Match their length EXACTLY. If they wrote 2 sentences, you write 2 sentences.

Hormozi ACA framework:
- Acknowledge what they said (mirror, don't parrot)
- Compliment a character trait (genuine, not sycophantic)
- Ask toward next steps

${lead.type === 'investor' ? 'If they want more info: "I have a one-pager that says it better than I can. Want me to send it?"' : lead.type === 'partnership' ? 'If they want more info: "I have a quick overview of how this works together. Want me to send it?"' : 'If they want more info: "I put together a breakdown specific to [their product]. Want me to send it?"'}
If "let's chat": "What works for you? I'll send an invite."
If "not now": Be graceful. One sentence. Door open.

${hasStrategy ? 'The STRATEGIC DIRECTION above should inform your response angle.' : 'Weave in a SMYKM hook if it fits naturally. Don\'t force it.'}
${hasStrategy ? 'Length: as long as the strategy needs, but tight.' : 'MAX: 40-60 words.'}`
  }

  const hasStrategy = customContext?.trim()
  const lengthNote = hasStrategy
    ? 'Length: as long as the strategy needs, but no filler. Every sentence earns its place. Your example email was ~90 words and that was perfect.'
    : ''

  if (followUpNumber === 1) {
    return `${context}

=== TASK: FOLLOW-UP #1 (Day 4, The Bump) ===
${hasStrategy ? lengthNote : '40-60 words. Two sentences, maybe three.'}
- Do NOT reference the original email ("as I mentioned," "following up on my last email"). They know.
${hasStrategy ? '- The STRATEGIC DIRECTION above is your primary angle. Build the whole email around it.' : '- Lead with a NEW SMYKM hook you didn\'t use before. Something you found about them or their company that\'s interesting, funny, or impressive.'}
- Pivot to value in one sentence. Something new, not a pitch repeat.
- Be the person they'd want to grab coffee with.`
  }

  if (followUpNumber === 2) {
    const typeSpecific = hasStrategy
      ? 'The STRATEGIC DIRECTION above is your primary angle. Build the whole email around that offer/strategy.'
      : lead.type === 'investor'
      ? `Offer the one-page memo. Frame it casually: "easier to skim than another email from me."`
      : lead.type === 'partnership'
      ? `Offer a quick overview of the mutual value. Frame it around what's in it for THEM.`
      : `Offer something concrete using their attack surface notes. "I put together a breakdown of how [their specific agent] can be manipulated through [their specific channel]. Want it?"`

    return `${context}

=== TASK: FOLLOW-UP #2 (Day 9, Value Drop) ===
${hasStrategy ? lengthNote : '30-50 words. Two sentences.'}
${typeSpecific}
- New SMYKM hook. Don't recycle.
- Don't ask for a meeting. Just offer the thing.
- Slightly funny or clever framing. Not corporate.`
  }

  if (followUpNumber === 3) {
    return `${context}

=== TASK: FOLLOW-UP #3 (Day 14, Channel Switch) ===
Write for LinkedIn DM or Twitter DM. NOT email.
${hasStrategy ? 'Keep it short but let the strategy breathe. DMs are casual.' : '20-30 words. Two sentences max. DMs are SHORT.'}
- Acknowledge you emailed. Don't apologize for it.
${hasStrategy ? '- The STRATEGIC DIRECTION above is your primary angle.' : '- One SMYKM hook that proves you\'re not mass-blasting'}
- Offer value, not a meeting
- Tone: casual, like you're DMing someone you met at a conference`
  }

  return `${context}

=== TASK: BREAK-UP (Day 21+, The Graceful Exit) ===
${hasStrategy ? 'Short but make the offer land. Every word counts.' : '15-25 words. Two sentences max.'}
- Give them an easy out. Be memorable.
${hasStrategy ? '- Use the STRATEGIC DIRECTION as your final angle.' : '- One final cheeky SMYKM reference if it fits'}
- Leave the door open without being needy
- Example energy: "If [their specific situation] ever makes AI security a thing, you know where to find me."`
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
      temperature: 0.9,
      maxTokens: 400,
    })

    const stripEmDashes = (text: string) => text.replace(/[\u2013\u2014]/g, ',')
    result.subject = stripEmDashes(result.subject)
    result.body = stripEmDashes(result.body)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Generate follow-up error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate follow-up' },
      { status: 500 }
    )
  }
}
