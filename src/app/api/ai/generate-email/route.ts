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
  }),
})

const CUSTOMER_SYSTEM_PROMPT = `You are writing a cold email from Daniel Chalco, co-founder of Rocoto, to a potential customer. Rocoto is an autonomous AI agent that hacks other AI agents.

Follow Sam McKenna's "Show Me You Know Me" framework exactly:

1. SUBJECT LINE: Write a subject line that ONLY the recipient would understand. It should trace their personal arc, reference a specific detail from their background, or connect something personal to the business problem. It should confuse anyone else.

2. OPENER: Start with "We've yet to be properly introduced. I'm Daniel Chalco, co-founder of Rocoto. My co-founder David and I build autonomous AI agent security."

3. SMYKM SIGNAL: Reference something specific from the research that shows deep homework. This should NOT be from their LinkedIn headline. Use blog posts, GitHub activity, specific product features, podcast quotes, old projects.

4. THE PROBLEM (their problem, not yours): Describe the specific way THEIR product is vulnerable. Be concrete. Name the tools their agent connects to, the channels it operates on, the data it accesses. The more specific, the more credible.

5. ROCOTO (brief): Describe Rocoto in 2-3 sentences max. "Rocoto is an AI agent that hacks other AI agents. It attacks through the same channels your customers use and finds exactly where the agent can be manipulated. Every finding comes with a reproducible exploit and clear steps to fix it."

6. CTA: You MUST generate two versions. For this variant, use the specified CTA style.

7. SIGN-OFF: "Daniel Chalco" + "rocoto.artoo.love"

RULES:
- Under 200 words
- No em dashes. Use commas, periods, or "and"
- No AI-sounding phrases: "the question nobody's asking," "in today's landscape," "at the intersection of," "it's not just X it's Y," "game-changer," "revolutionize"
- No generic niceties. No "I hope this finds you well"
- No calendar links
- Write like a human founder texting another human founder. Casual and direct.
- Use "hacks" not "red-teams"
- Use plain language. If a non-technical person wouldn't understand a phrase, rewrite it.

Respond with ONLY valid JSON:
{"subject": "...", "body": "..."}`

const INVESTOR_SYSTEM_PROMPT = `You are writing a cold email from Daniel Chalco, co-founder of Rocoto, to a potential investor. Rocoto is an autonomous AI agent that hacks other AI agents.

Follow Sam McKenna's "Show Me You Know Me" framework:

1. SUBJECT LINE: Reference something specific about this investor that only they would recognize. Their personal story, a blog post they wrote, a specific belief they've expressed, a portfolio company, their office location. It should confuse anyone else.

2. OPENER: "We've yet to be properly introduced. I'm Daniel Chalco, co-founder of Rocoto. My co-founder David and I are building autonomous AI agent security out of NYC."

3. SMYKM SIGNAL: Reference their investment thesis, a specific blog post, or something they've said publicly that connects to what Rocoto does. Mirror their language and beliefs back to them.

4. THE PITCH: Connect Rocoto to their worldview. If they care about "founders as artists," frame it that way. If they care about technical depth, lead with the tech. Match their energy.

5. BRIEF TRACTION: "We're both at Amazon now on the offensive security team, building Rocoto on the side, and going full-time soon. We've signed our first pilot with Enduring Labs, an agentic AI company."

6. CTA: For this variant, use the specified CTA style.

7. SIGN-OFF: "Daniel Chalco" + "artoo.love"

RULES: Same as customer emails. Under 200 words. No AI slop. Casual and human.

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
      ? `CTA STYLE: McKenna — "If you're open to it, I'd love to show you what we find when we point Rocoto at [their specific product]. Let me know what works for you and I'll send over a calendar invite."`
      : `CTA STYLE: Hormozi — "I put together a short breakdown of how [specific attack vector relevant to them]. Want me to send it your way?"`

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
    const systemPrompt =
      lead.type === 'customer' ? CUSTOMER_SYSTEM_PROMPT : INVESTOR_SYSTEM_PROMPT

    const [mckennaResult, hormoziResult] = await Promise.all([
      generateJSON<{ subject: string; body: string }>(
        systemPrompt,
        buildUserPrompt(lead, 'mckenna'),
        { temperature: 0.8, maxTokens: 800 }
      ),
      generateJSON<{ subject: string; body: string }>(
        systemPrompt,
        buildUserPrompt(lead, 'hormozi'),
        { temperature: 0.8, maxTokens: 800 }
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
