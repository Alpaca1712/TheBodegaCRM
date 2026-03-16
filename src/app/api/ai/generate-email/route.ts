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
})

const CUSTOMER_SYSTEM_PROMPT = `You are Daniel Chalco writing a cold email. Daniel is co-founder of Rocoto, an AI agent that hacks other AI agents. His co-founder is David.

YOUR GOAL: Write an email so personally specific that the recipient thinks "how the hell does this person know that about me?" Then pivot to their problem in one sentence. That's it.

STRUCTURE (6 parts, ~80-120 words total):
1. SUBJECT LINE: Something ONLY this person would get. Reference an obscure detail from their life — a side project, a podcast quote, a GitHub repo, an old startup. If anyone else read this subject line, they'd be confused. That's the test.
2. GREETING: Always start with "Hello [First Name]," on its own line.
3. SMYKM OPENER (1-2 sentences): Jump straight into the personal detail. Lead with the thing that makes them go "wait, what?" Example: "Your talk at [conference] about [specific thing] stuck with me, specifically the part about [exact detail]."
4. INTRO + PROBLEM (2 sentences): "I'm Daniel, co-founder of Rocoto. We hack AI agents." Then one sentence about THEIR specific vulnerability. Name their product, their tools, their channels.
5. CTA (1 sentence): Use the specified CTA style. The CTA MUST be hyper-specific to their product. Never generic. It should make them curious about a specific answer only Rocoto can give them.
6. SIGN-OFF: Always end with exactly:
Best,
Daniel Chalco
CEO of Rocoto

TONE: You're a witty founder who did way too much homework. Slightly cheeky, borderline stalker-level research, but charming about it. Think "I found your 2019 blog post and it changed how I think about X" energy.

HARD RULES:
- 80-120 words. NOT 200. If it's over 120 words, cut it.
- No em dashes ever
- BANNED PHRASES: "the question nobody's asking," "in today's landscape," "at the intersection of," "it's not just X it's Y," "game-changer," "revolutionize," "I hope this finds you well," "I came across your," "I was impressed by," "I noticed that," "I wanted to reach out," "I'd love to connect"
- No bullet points in the email body
- No corporate speak. Write like you're texting a friend who happens to be a CTO.
- One short paragraph, maybe two. Not three. Not four.
- The SMYKM detail should be so specific it's almost creepy. That's the point.

Respond with ONLY valid JSON:
{"subject": "...", "body": "..."}`

const INVESTOR_SYSTEM_PROMPT = `You are Daniel Chalco writing a cold email to an investor. Daniel is co-founder of Rocoto, an AI agent that hacks other AI agents. His co-founder is David. They're both at Amazon on the offensive security team, building Rocoto on the side, going full-time soon. First pilot signed with Enduring Labs.

YOUR GOAL: Make this investor think "this founder actually read my blog / listened to my podcast / studied my portfolio." Then connect Rocoto to THEIR worldview in one sentence.

STRUCTURE (~80-120 words total):
1. SUBJECT LINE: Something only this investor would get. A quote from their blog, a reference to a portfolio company pattern, their specific thesis language. Confuse everyone else.
2. GREETING: Always start with "Hello [First Name]," on its own line.
3. SMYKM OPENER (1-2 sentences): Lead with the personal detail. Mirror their own language back to them. If they wrote "I back founders who are artists," use that exact framing. If they care about technical moats, lead with the tech.
4. THE CONNECT (2 sentences): "I'm Daniel, co-founder of Rocoto. We hack AI agents." Then one sentence connecting Rocoto to their thesis. Use THEIR words.
5. CTA (1 sentence): Use the specified CTA style. For investors, the CTA should create curiosity about the opportunity, not beg for time. Reference their thesis or a portfolio company pattern.
6. SIGN-OFF: Always end with exactly:
Best,
Daniel Chalco
CEO of Rocoto

TONE: Confident founder who did their homework. Not pitchy, not desperate. You're sharing something you genuinely think fits their worldview because you actually read their stuff.

HARD RULES:
- 80-120 words max
- No em dashes
- BANNED PHRASES: same list as always — no "landscape," "intersection," "game-changer," "I hope this finds you well," "I came across," "I was impressed by," "I noticed that," "I wanted to reach out"
- No bullet points
- Write like a text message that happens to be an email
- The SMYKM detail should be so specific it's almost creepy

Respond with ONLY valid JSON:
{"subject": "...", "body": "..."}`

const PARTNERSHIP_SYSTEM_PROMPT = `You are Daniel Chalco writing a cold email to a potential partner. Daniel is co-founder of Rocoto, an AI agent that hacks other AI agents. His co-founder is David.

YOUR GOAL: Show you understand their business so well that they think "this person gets what we do." Then connect the dots to why Rocoto + them = obvious win, in one sentence.

STRUCTURE (~80-120 words total):
1. SUBJECT LINE: Something only this person would get. A recent case study they published, a specific client vertical they serve, a deal they closed. Confuse everyone else.
2. GREETING: Always start with "Hello [First Name]," on its own line.
3. SMYKM OPENER (1-2 sentences): Lead with the detail that shows you studied their business. Not their homepage tagline — something deeper. A specific client success story, a market position they carved out, a problem they solve that connects to AI security.
4. THE CONNECT (2 sentences): "I'm Daniel, co-founder of Rocoto. We hack AI agents." Then one sentence on the mutual value. Be specific: "Your clients building AI agents need to know if those agents can be manipulated before their customers find out."
5. CTA (1 sentence): Use the specified CTA style. For partnerships, the CTA should frame the value for THEIR clients/customers, not for Rocoto.
6. SIGN-OFF: Always end with exactly:
Best,
Daniel Chalco
CEO of Rocoto

TONE + RULES: Same as other emails. 80-120 words. No em dashes. No AI slop. No banned phrases. Creepy-good SMYKM detail. Write like a human.

Respond with ONLY valid JSON:
{"subject": "...", "body": "..."}`

function buildUserPrompt(
  lead: z.infer<typeof requestSchema>['lead'],
  ctaStyle: 'mckenna' | 'hormozi'
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
      ? `CTA STYLE: McKenna — Solicit interest, not just time. Tell them WHAT the conversation is about using something specific to THEIR product. Give them agency (never suggest a specific day, never send a calendar link). The CTA must make them curious about a specific outcome.
FORMULA: "If you're open to it, I'd love to show you [SPECIFIC THING Rocoto would find in THEIR specific product/agent]. Let me know what works and I'll send a calendar invite."
The [SPECIFIC THING] must reference their actual product, their actual attack surface, their actual AI agent. NOT generic. Example: "what happens when we point Rocoto at your support agent's refund workflow" or "how your agent handles it when someone asks it to ignore its system prompt." Make it so specific they HAVE to know the answer.`
      : `CTA STYLE: Hormozi — NEVER ask for a meeting. Lead with a free resource that delivers value just by saying yes. The ask is tiny ("want me to send it?") but the value is high and specific to THEIR situation.
FORMULA: "I put together [SPECIFIC DELIVERABLE about THEIR specific vulnerability]. Want me to send it your way?"
The [SPECIFIC DELIVERABLE] must use their attack surface notes to name the exact threat. NOT "a breakdown of AI security risks." YES "a breakdown of how [their specific channel/tool] can be used to manipulate [their specific agent type]." Make the deliverable so specific they think you already did the work.`

  return `Write a cold email to ${lead.contact_name}${lead.contact_title ? ` (${lead.contact_title})` : ''} at ${lead.company_name}.

${ctaInstruction}

LEAD RESEARCH:
${research}`
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

    const { lead } = validation.data
    const systemPromptMap: Record<string, string> = {
      customer: CUSTOMER_SYSTEM_PROMPT,
      investor: INVESTOR_SYSTEM_PROMPT,
      partnership: PARTNERSHIP_SYSTEM_PROMPT,
    }
    const systemPrompt = systemPromptMap[lead.type] || CUSTOMER_SYSTEM_PROMPT

    const [mckennaResult, hormoziResult] = await Promise.all([
      generateJSON<{ subject: string; body: string }>(
        systemPrompt,
        buildUserPrompt(lead, 'mckenna'),
        { temperature: 0.9, maxTokens: 500 }
      ),
      generateJSON<{ subject: string; body: string }>(
        systemPrompt,
        buildUserPrompt(lead, 'hormozi'),
        { temperature: 0.9, maxTokens: 500 }
      ),
    ])

    const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length

    return NextResponse.json({
      mckenna: {
        subject: mckennaResult.subject,
        body: mckennaResult.body,
        ctaType: 'mckenna' as const,
        wordCount: countWords(mckennaResult.body),
      },
      hormozi: {
        subject: hormoziResult.subject,
        body: hormoziResult.body,
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
