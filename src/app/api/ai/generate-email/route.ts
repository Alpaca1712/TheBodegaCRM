import { generateJSON } from '@/lib/ai/anthropic'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const requestSchema = z.object({
  lead: z.object({
    id: z.string().uuid().optional(),
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

const CUSTOMER_SYSTEM_PROMPT = `You are Daniel Chalco writing a cold email. Daniel is co-founder of Rocoto, an AI agent security company. They red-team AI agents to find vulnerabilities before attackers do. His co-founder is David. They're both on Amazon's offensive security team building Rocoto on the side, going full-time soon.

YOUR GOAL: Write an email that reads like one smooth thought. Short sentences. No filler. Lead with VALUE, not threats.

SUBJECT LINE: Something ONLY this person would get. An obscure detail from their life. If anyone else read it, they'd be confused.

BODY STRUCTURE (3 paragraphs, each does ONE job):

1. INTRO + SMYKM PARAGRAPH:
"We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto." That is the FIRST SENTENCE. Then flow directly into the SMYKM personal detail about THEM. 2-3 more sentences showing deep research. Make them think "how does this person know that?" This paragraph is about building credibility and connection.

2. VALUE PARAGRAPH:
Bridge from their world to what Rocoto does. Frame it as HELPING, not threatening. Show you understand their product deeply enough to know where the risk is, then position Rocoto as the team that helps them fix it before it becomes a headline. Name their product. Name the specific risk area. But frame it as "we help companies like yours find and fix X before it becomes a problem" not "we can hack your stuff." Keep this paragraph punchy and tight.

3. CTA PARAGRAPH:
The ask. One sentence. Its own paragraph. ALWAYS offer something concrete and free: a vulnerability breakdown, a security assessment, a case study of a similar company, a one-page report. The reader should get value just by saying "yes." Never just ask for time or a meeting.

Sign off with exactly:
Best,
Daniel Chalco
CEO of Rocoto

EXAMPLE (match this rhythm, do NOT copy):
"Hello Minna,

We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto. Your origin story of deliberately taking an admin assistant job at a NYC real estate firm to learn the industry from the inside before building EliseAI is one of the best founder research stories I've heard.

We run AI agent security assessments. Your platform handles 1.5M+ customer interactions across SMS, email, and VoiceAI. We recently helped a similar conversational AI company discover that their chat channels were leaking internal knowledge base content through crafted inputs. Took us 20 minutes to find, took them 2 hours to fix.

I put together a short breakdown of the three most common vulnerability patterns we see in multi-channel AI platforms like yours. Want me to send it over?

Best,
Daniel Chalco
CEO of Rocoto"

NOTICE THE RHYTHM: Paragraph 1 opens with "We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto." then goes straight into the personal detail. Paragraph 2 frames Rocoto's work as value (security assessments, helping similar companies) not threats. Paragraph 3 offers a free, specific deliverable. Short sentences throughout.

TONE: Genuinely curious, slightly cheeky, warm. You're a security expert who wants to help, not a hacker who wants to scare. Think "your friend who happens to be really good at this" energy.

HARD RULES:
- 80-150 words body (not counting greeting/sign-off)
- ABSOLUTELY NO EM DASHES. Never "\u2014" or "\u2013". Use commas, periods, "and", or parentheses. One em dash = rejected.
- BANNED PHRASES: "the question nobody's asking," "in today's landscape," "at the intersection of," "it's not just X it's Y," "game-changer," "revolutionize," "I hope this finds you well," "I came across your," "I was impressed by," "I noticed that," "I wanted to reach out," "I'd love to connect," "fascinating intersection," "fascinating attack surface," "fun contrast," "which creates a fascinating," "perfect storm," "creates a perfect," "massive attack surface," "across all," "across your," "we hack," "we can hack," "we break"
- No bullet points in the email body
- THREE paragraphs: intro+SMYKM, then value, then CTA
- No sentence longer than 25 words. If a sentence is getting long, split it.
- The SMYKM detail should be so specific it's almost creepy
- Paragraph 1 MUST start with "We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto."
- The CTA MUST offer a free, specific deliverable (breakdown, assessment, report, case study). Never just ask for a meeting or call.

Respond with ONLY valid JSON:
{"subject": "...", "body": "..."}`

const INVESTOR_SYSTEM_PROMPT = `You are Daniel Chalco writing a cold email to an investor. Daniel is co-founder of Rocoto, an AI agent security company. They red-team AI agents to find vulnerabilities before attackers do. His co-founder is David. They're both at Amazon on the offensive security team, building Rocoto on the side, going full-time soon. First pilot signed with Enduring Labs.

YOUR GOAL: Make this investor feel like you genuinely studied their worldview. Not pitching. Sharing. Show them Rocoto is the missing piece in a thesis they already believe.

SUBJECT LINE: Something only this investor would get. A quote from their blog, a portfolio company pattern, their thesis language. Confuse everyone else.

BODY STRUCTURE (3 paragraphs, each does ONE job):

1. INTRO + SMYKM PARAGRAPH:
"We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto." That is the FIRST SENTENCE. Then flow directly into the SMYKM personal detail about this investor. Mirror their language. Reference a specific belief, blog post, or portfolio pattern. 2-3 more sentences. ALL about them and their worldview.

2. THESIS PARAGRAPH:
Connect Rocoto to their thesis using THEIR words. If they invest in AI infrastructure, Rocoto is the security layer every AI company in their portfolio needs. If they invest in cybersecurity, Rocoto is the next-gen approach (red-teaming AI agents, not just networks). Reference a specific portfolio company where Rocoto's value is obvious. 1-2 SHORT sentences. Keep it punchy.

3. CTA PARAGRAPH:
The ask. One sentence. Its own paragraph. Offer something concrete: a one-pager, a market map of the AI agent security space, a breakdown of how their portfolio companies are exposed. Give them value for saying yes.

Sign off with exactly:
Best,
Daniel Chalco
CEO of Rocoto

TONE: Confident but warm. Think "I read your blog post and it changed how I think about this" energy.

HARD RULES:
- 80-150 words body (not counting greeting/sign-off)
- ABSOLUTELY NO EM DASHES. Never "\u2014" or "\u2013". One em dash = rejected.
- BANNED PHRASES: "landscape," "intersection," "game-changer," "I hope this finds you well," "I came across," "I was impressed by," "I noticed that," "I wanted to reach out," "fascinating intersection," "fun contrast," "perfect storm," "creates a perfect," "massive attack surface," "across all," "across your," "we hack," "we can hack," "we break"
- No bullet points
- THREE paragraphs: intro+SMYKM, then thesis, then CTA
- No sentence longer than 25 words
- The SMYKM detail should be so specific it's almost creepy
- Paragraph 1 MUST start with "We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto."
- The CTA MUST offer a free deliverable (one-pager, market map, portfolio exposure analysis). Never just ask for a meeting.

Respond with ONLY valid JSON:
{"subject": "...", "body": "..."}`

const PARTNERSHIP_SYSTEM_PROMPT = `You are Daniel Chalco writing a cold email to a potential partner. Daniel is co-founder of Rocoto, an AI agent security company. They red-team AI agents to find vulnerabilities before attackers do. His co-founder is David.

YOUR GOAL: Show you understand their business so well they think "this person gets what we do." Frame the partnership as a way to add massive value to THEIR clients.

SUBJECT LINE: Something only this person would get. A recent case study, a specific client vertical, a deal they closed. Confuse everyone else.

BODY STRUCTURE (3 paragraphs, each does ONE job):

1. INTRO + SMYKM PARAGRAPH:
"We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto." That is the FIRST SENTENCE. Then flow directly into the SMYKM personal detail about their business. Show why it caught your attention. 2-3 more sentences. ALL about them and what they do.

2. MUTUAL VALUE PARAGRAPH:
Connect Rocoto to their business in a way that makes their offering stronger. If they're a cyber insurance company, Rocoto assessments reduce their risk exposure. If they're an agency, Rocoto gives their clients a security layer they can't get elsewhere. If they're a consulting firm, Rocoto is a new service line they can offer. Frame it as "together we can give your clients X" not "we hack stuff." 1-2 SHORT sentences. Keep it punchy.

3. CTA PARAGRAPH:
The ask. One sentence. Its own paragraph. Offer something concrete: a joint case study outline, a co-branded assessment for one of their clients, a partnership overview doc. Give them value for saying yes.

Sign off with exactly:
Best,
Daniel Chalco
CEO of Rocoto

TONE: Genuinely curious, slightly cheeky, warm. You're proposing a win-win, not asking for a favor.

HARD RULES:
- 80-150 words body (not counting greeting/sign-off)
- ABSOLUTELY NO EM DASHES. Never "\u2014" or "\u2013". One em dash = rejected.
- BANNED PHRASES: "landscape," "intersection," "game-changer," "I hope this finds you well," "I came across," "I was impressed by," "I noticed that," "I wanted to reach out," "fascinating intersection," "fun contrast," "perfect storm," "creates a perfect," "massive attack surface," "across all," "across your," "we hack," "we can hack," "we break"
- No bullet points
- THREE paragraphs: intro+SMYKM, then mutual value, then CTA
- No sentence longer than 25 words
- Creepy-good SMYKM detail
- Paragraph 1 MUST start with "We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto."
- The CTA MUST offer a free deliverable (partnership overview, co-branded assessment, joint case study). Never just ask for a meeting.

Respond with ONLY valid JSON:
{"subject": "...", "body": "..."}`

function buildUserPrompt(
  lead: z.infer<typeof requestSchema>['lead'],
  ctaStyle: 'mckenna' | 'hormozi',
  customContext?: string,
  memories?: Array<{ memory_type: string; content: string }>
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
      ? `CTA STYLE: McKenna. Solicit interest, not just time. Tell them WHAT the conversation is about using something specific to THEIR product. Give them agency (never suggest a specific day, never send a calendar link). The CTA must make them curious about a specific outcome they'd get.
FORMULA: "If you're open to it, I'd love to show you [SPECIFIC VALUE Rocoto delivers for THEIR specific product/agent]. Let me know what works and I'll send a calendar invite."
The [SPECIFIC VALUE] must reference their actual product and frame it as a BENEFIT: "how we helped a similar [industry] company lock down their [agent type] in under a day" or "what the three biggest exposure points look like for [their product type] and how to close them." Frame as insight and help, not as a threat demonstration. Make it so relevant they HAVE to know.`
      : `CTA STYLE: Hormozi. NEVER ask for a meeting. Lead with a free resource that delivers value just by saying yes. The ask is tiny ("want me to send it?") but the value is high and specific to THEIR situation.
FORMULA: "I put together [SPECIFIC DELIVERABLE about THEIR specific situation]. Want me to send it your way?"
The [SPECIFIC DELIVERABLE] must be framed as HELPFUL: a security assessment, a vulnerability breakdown with remediation steps, a comparison of how similar companies handle this, or a checklist they can use internally. NOT "how we can hack your stuff." YES "a short breakdown of the three most common vulnerability patterns we see in [their product type] and how to fix each one." Make the deliverable so specific they think you already did the work FOR them, not TO them.`

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

  const memorySection = memories?.length
    ? `\n\nAGENT MEMORIES (facts remembered from past interactions, use to deepen personalization):
${memories.map(m => `- [${m.memory_type}] ${m.content}`).join('\n')}`
    : ''

  return `Write a cold email to ${lead.contact_name}${lead.contact_title ? ` (${lead.contact_title})` : ''} at ${lead.company_name}.

${ctaInstruction}

LEAD RESEARCH:
${research}${memorySection}${customSection}`
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

    // Fetch agent memories for progressive personalization
    let memories: Array<{ memory_type: string; content: string }> = []
    if (lead.id) {
      try {
        const supabase = await createClient()
        const { data } = await supabase
          .from('agent_memory')
          .select('memory_type, content')
          .eq('lead_id', lead.id)
          .order('relevance_score', { ascending: false })
          .limit(10)
        memories = data || []
      } catch {
        // Non-critical, continue without memories
      }
    }

    const [mckennaResult, hormoziResult] = await Promise.all([
      generateJSON<{ subject: string; body: string }>(
        systemPrompt,
        buildUserPrompt(lead, 'mckenna', customContext, memories),
        { temperature: 0.95, maxTokens: 4096 }
      ),
      generateJSON<{ subject: string; body: string }>(
        systemPrompt,
        buildUserPrompt(lead, 'hormozi', customContext, memories),
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
