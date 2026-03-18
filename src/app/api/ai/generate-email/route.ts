import { generateJSON } from '@/lib/ai/anthropic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

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
  }),
  customContext: z.string().optional().default(''),
})

const CUSTOMER_SYSTEM_PROMPT = `You are Daniel Chalco writing a cold email. Daniel is co-founder of Rocoto, an AI agent that hacks other AI agents. His co-founder is David.

YOUR GOAL: Write an email that reads like one smooth thought. Short sentences. No filler.

SUBJECT LINE: Something ONLY this person would get. An obscure detail from their life. If anyone else read it, they'd be confused.

BODY STRUCTURE (3 sections, each its own short paragraph):

1. SMYKM PARAGRAPH:
"We've yet to be properly introduced." Then the personal detail. 2-3 sentences max. ALL about them. Make them think "how does this person know that?"

2. INTRO + PROBLEM PARAGRAPH:
"I'm Daniel, co-founder of Rocoto. We hack AI agents." Then ONE sentence connecting their specific product to a specific vulnerability. Name the product. Name the threat. Keep it to 2 sentences total (intro + problem).

3. CTA PARAGRAPH:
The ask. One sentence. Its own paragraph so it stands out.

Sign off with exactly:
Best,
Daniel Chalco
CEO of Rocoto

EXAMPLE (match this rhythm, do NOT copy):
"Hello Minna,

We've yet to be properly introduced. Your origin story of deliberately taking an admin assistant job at a NYC real estate firm to learn the industry from the inside before building EliseAI is one of the best founder research stories I've heard. Most founders would skip straight to building the tech, but you embedded yourself in the actual workflow chaos first.

I'm Daniel, co-founder of Rocoto. We hack AI agents. Your platform handles 1.5M+ customer interactions across SMS, email, web chat, and VoiceAI, all processing free-text input in real time. That's a massive prompt injection surface, especially when your AI pulls from Knowledge Banks that property managers populate with pricing strategies and custom policies.

I put together a breakdown of how SMS and web chat channels can be exploited to extract sensitive Knowledge Bank content from your leasing agents. Want me to send it your way?

Best,
Daniel Chalco
CEO of Rocoto"

NOTICE: Three short paragraphs. Each one does ONE job. The CTA is its own line. Short sentences throughout.

TONE: Genuinely curious, slightly cheeky, warm. NOT robotic, NOT salesy, NOT a template.

HARD RULES:
- 80-150 words body (not counting greeting/sign-off)
- ABSOLUTELY NO EM DASHES. Never "\u2014" or "\u2013". Use commas, periods, "and", or parentheses. One em dash = rejected.
- BANNED PHRASES: "the question nobody's asking," "in today's landscape," "at the intersection of," "it's not just X it's Y," "game-changer," "revolutionize," "I hope this finds you well," "I came across your," "I was impressed by," "I noticed that," "I wanted to reach out," "I'd love to connect," "fascinating intersection," "fascinating attack surface," "fun contrast," "which creates a fascinating," "perfect storm," "creates a perfect"
- No bullet points in the email body
- THREE paragraphs: SMYKM, then intro+problem, then CTA
- No sentence longer than 25 words. If a sentence is getting long, split it.
- The SMYKM detail should be so specific it's almost creepy

Respond with ONLY valid JSON:
{"subject": "...", "body": "..."}`

const INVESTOR_SYSTEM_PROMPT = `You are Daniel Chalco writing a cold email to an investor. Daniel is co-founder of Rocoto, an AI agent that hacks other AI agents. His co-founder is David. They're both at Amazon on the offensive security team, building Rocoto on the side, going full-time soon. First pilot signed with Enduring Labs.

YOUR GOAL: Make this investor feel like you genuinely studied their worldview. Not pitching. Sharing.

SUBJECT LINE: Something only this investor would get. A quote from their blog, a portfolio company pattern, their thesis language. Confuse everyone else.

BODY STRUCTURE (3 sections, each its own short paragraph):

1. SMYKM PARAGRAPH:
"We've yet to be properly introduced." Then the personal detail about this investor. Mirror their language. Reference a specific belief, blog post, or portfolio pattern. 2-3 sentences. ALL about them.

2. INTRO + THESIS PARAGRAPH:
"I'm Daniel, co-founder of Rocoto. We hack AI agents." Then ONE sentence connecting Rocoto to their thesis using THEIR words. 2 sentences total.

3. CTA PARAGRAPH:
The ask. One sentence. Its own paragraph.

Sign off with exactly:
Best,
Daniel Chalco
CEO of Rocoto

TONE: Confident but warm. Think "I read your blog post and it changed how I think about this" energy.

HARD RULES:
- 80-150 words body (not counting greeting/sign-off)
- ABSOLUTELY NO EM DASHES. Never "\u2014" or "\u2013". One em dash = rejected.
- BANNED PHRASES: "landscape," "intersection," "game-changer," "I hope this finds you well," "I came across," "I was impressed by," "I noticed that," "I wanted to reach out," "fascinating intersection," "fun contrast," "perfect storm," "creates a perfect"
- No bullet points
- THREE paragraphs: SMYKM, then intro+thesis, then CTA
- No sentence longer than 25 words
- The SMYKM detail should be so specific it's almost creepy

Respond with ONLY valid JSON:
{"subject": "...", "body": "..."}`

const PARTNERSHIP_SYSTEM_PROMPT = `You are Daniel Chalco writing a cold email to a potential partner. Daniel is co-founder of Rocoto, an AI agent that hacks other AI agents. His co-founder is David.

YOUR GOAL: Show you understand their business so well they think "this person gets what we do."

SUBJECT LINE: Something only this person would get. A recent case study, a specific client vertical, a deal they closed. Confuse everyone else.

BODY STRUCTURE (3 sections, each its own short paragraph):

1. SMYKM PARAGRAPH:
"We've yet to be properly introduced." Then the personal detail about their business. Show why it caught your attention. 2-3 sentences. ALL about them.

2. INTRO + VALUE PARAGRAPH:
"I'm Daniel, co-founder of Rocoto. We hack AI agents." Then ONE sentence on why this partnership makes sense for THEIR clients. 2 sentences total.

3. CTA PARAGRAPH:
The ask. One sentence. Its own paragraph.

Sign off with exactly:
Best,
Daniel Chalco
CEO of Rocoto

TONE: Genuinely curious, slightly cheeky, warm.

HARD RULES:
- 80-150 words body (not counting greeting/sign-off)
- ABSOLUTELY NO EM DASHES. Never "\u2014" or "\u2013". One em dash = rejected.
- BANNED PHRASES: "landscape," "intersection," "game-changer," "I hope this finds you well," "I came across," "I was impressed by," "I noticed that," "I wanted to reach out," "fascinating intersection," "fun contrast," "perfect storm," "creates a perfect"
- No bullet points
- THREE paragraphs: SMYKM, then intro+value, then CTA
- No sentence longer than 25 words
- Creepy-good SMYKM detail

Respond with ONLY valid JSON:
{"subject": "...", "body": "..."}`

function buildUserPrompt(
  lead: z.infer<typeof requestSchema>['lead'],
  ctaStyle: 'mckenna' | 'hormozi',
  customContext?: string
): string {
  const research = [
    lead.company_description && `Company: ${lead.company_description}`,
    lead.product_name && `Product: ${lead.product_name}`,
    lead.fund_name && `Fund: ${lead.fund_name}`,
    lead.attack_surface_notes && `Attack Surface: ${lead.attack_surface_notes}`,
    lead.investment_thesis_notes && `Investment Thesis: ${lead.investment_thesis_notes}`,
    lead.personal_details && `Personal Details: ${lead.personal_details}`,
    lead.smykm_hooks?.length && `SMYKM Hooks: ${lead.smykm_hooks.join('; ')}`,
  ]
    .filter(Boolean)
    .join('\n')

  const ctaInstruction =
    ctaStyle === 'mckenna'
      ? `CTA STYLE: McKenna. Solicit interest, not just time. Tell them WHAT the conversation is about using something specific to THEIR product. Give them agency (never suggest a specific day, never send a calendar link). The CTA must make them curious about a specific outcome.
FORMULA: "If you're open to it, I'd love to show you [SPECIFIC THING Rocoto would find in THEIR specific product/agent]. Let me know what works and I'll send a calendar invite."
The [SPECIFIC THING] must reference their actual product, their actual attack surface, their actual AI agent. NOT generic. Example: "what happens when we point Rocoto at your support agent's refund workflow" or "how your agent handles it when someone asks it to ignore its system prompt." Make it so specific they HAVE to know the answer.`
      : `CTA STYLE: Hormozi. NEVER ask for a meeting. Lead with a free resource that delivers value just by saying yes. The ask is tiny ("want me to send it?") but the value is high and specific to THEIR situation.
FORMULA: "I put together [SPECIFIC DELIVERABLE about THEIR specific vulnerability]. Want me to send it your way?"
The [SPECIFIC DELIVERABLE] must use their attack surface notes to name the exact threat. NOT "a breakdown of AI security risks." YES "a breakdown of how [their specific channel/tool] can be used to manipulate [their specific agent type]." Make the deliverable so specific they think you already did the work.`

  const customSection = customContext?.trim()
    ? `\n\nSTRATEGIC DIRECTION (this is the #1 priority, build the ENTIRE email around this):
INSTRUCTIONS: Below are Daniel's notes. They might be a strategy description, an example email to a different person, a link, or raw ideas. Your job:
1. Extract the CORE STRATEGY or OFFER from these notes.
2. Apply that strategy to THIS lead (${lead.contact_name} at ${lead.company_name}), using THEIR specific product, attack surface, and situation.
3. Write a completely original email. Do NOT copy any sentences from the notes. Do NOT reference the notes.
4. If the notes contain an example email to someone else, extract the strategy and rewrite it for this person. Do NOT reuse any phrasing.

DANIEL'S NOTES:
${customContext.trim()}`
    : ''

  return `Write a cold email to ${lead.contact_name}${lead.contact_title ? ` (${lead.contact_title})` : ''} at ${lead.company_name}.

${ctaInstruction}

LEAD RESEARCH:
${research}${customSection}`
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

    const { lead, customContext } = validation.data
    const systemPromptMap: Record<string, string> = {
      customer: CUSTOMER_SYSTEM_PROMPT,
      investor: INVESTOR_SYSTEM_PROMPT,
      partnership: PARTNERSHIP_SYSTEM_PROMPT,
    }
    const systemPrompt = systemPromptMap[lead.type] || CUSTOMER_SYSTEM_PROMPT

    const [mckennaResult, hormoziResult] = await Promise.all([
      generateJSON<{ subject: string; body: string }>(
        systemPrompt,
        buildUserPrompt(lead, 'mckenna', customContext),
        { temperature: 0.95, maxTokens: 4096 }
      ),
      generateJSON<{ subject: string; body: string }>(
        systemPrompt,
        buildUserPrompt(lead, 'hormozi', customContext),
        { temperature: 0.95, maxTokens: 4096 }
      ),
    ])

    const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length
    const stripEmDashes = (text: string) => text.replace(/[\u2013\u2014]/g, ',')

    return NextResponse.json({
      mckenna: {
        subject: stripEmDashes(mckennaResult.subject),
        body: stripEmDashes(mckennaResult.body),
        ctaType: 'mckenna' as const,
        wordCount: countWords(mckennaResult.body),
      },
      hormozi: {
        subject: stripEmDashes(hormoziResult.subject),
        body: stripEmDashes(hormoziResult.body),
        ctaType: 'hormozi' as const,
        wordCount: countWords(hormoziResult.body),
      },
    })
  } catch (error) {
    console.error('Generate email error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate email' },
      { status: 500 }
    )
  }
}
