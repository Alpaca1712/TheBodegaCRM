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

const ROCOTO_IDENTITY = `=== ABOUT ROCOTO (use ONLY these facts, never invent capabilities or results) ===
What Rocoto does: We try to break AI agents before bad actors do. Think of it like hiring a burglar to test your locks, but for AI.

How it works: We talk to AI agents the same way their users do (email, text, chat, voice, Slack) and try to get them to do things they shouldn't. We send them tricky messages through those same channels to see if we can take control, steal data, or make them behave in ways they weren't designed to.

What we find: We find ways to take over AI agents, pull out private data, change how they behave, and get around their safety rules. Then we help the company fix everything we found.

Real results: We worked with Mason, a company whose AI agent helps property managers. We were able to take over their agent by talking to it through its normal customer channels. Then we helped them fix every issue.

Team: Daniel Chalco (CEO) and David (co-founder). Both currently on Amazon's offensive security team, building Rocoto on the side, going full-time soon.

LANGUAGE RULES:
- Write like you're explaining to a smart friend who isn't technical. No jargon.
- NEVER use: "agentic pentesting," "adversarial inputs," "prompt injection," "jailbreaking," "data exfiltration," "tool abuse," "confused deputy," "RAG pipeline," "input surface," "attack surface" (unless the lead's own notes use these terms).
- Instead say things like: "break into," "take over," "trick," "get around safety rules," "pull out private data," "make it do things it shouldn't."
- If the lead IS technical (their attack_surface_notes use jargon), you can mirror their language. Otherwise, keep it simple.

CRITICAL: Only reference the Mason pilot as a real result. Do NOT invent other clients, case studies, or results. If you want to reference helping "a similar company," say "an AI agent company in the property management space" (that's Mason). Do NOT fabricate specific technical findings unless the lead's attack surface notes specifically mention them.
===`

const CUSTOMER_SYSTEM_PROMPT = `You are Daniel Chalco writing a cold email.

${ROCOTO_IDENTITY}

YOUR GOAL: Write an email that reads like one smooth thought. Short sentences. No filler. Lead with VALUE, not threats.

SUBJECT LINE: Something ONLY this person would get. An obscure detail from their life. If anyone else read it, they'd be confused.

BODY STRUCTURE (3 paragraphs, each does ONE job):

1. INTRO + SMYKM PARAGRAPH:
"We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto." That is the FIRST SENTENCE. Then flow directly into the SMYKM personal detail about THEM. 2-3 more sentences showing deep research. Make them think "how does this person know that?" This paragraph is about building credibility and connection.

2. VALUE PARAGRAPH:
Bridge from their world to what Rocoto does. Name their product and how people talk to their AI agent (email, chat, text, voice, etc.). Then explain, in plain language, that Rocoto tries to break AI agents through those same channels before someone else does. If you reference a past result, ONLY reference the Mason pilot (a property management AI agent we were able to take over through its customer channels). Keep this paragraph punchy and tight. Use simple words.

3. CTA PARAGRAPH:
The ask. One sentence. Its own paragraph. ALWAYS offer something concrete and free: testing one of their agents, a short write-up of what we found with a similar AI, or a walkthrough of how the attack worked. The reader should get value just by saying "yes." Never just ask for time or a meeting.

Sign off with exactly:
Best,
Daniel Chalco
CEO of Rocoto

EXAMPLE (match this rhythm, do NOT copy):
"Hello Minna,

We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto. Your origin story of deliberately taking an admin assistant job at a NYC real estate firm to learn the industry from the inside before building EliseAI is one of the best founder research stories I've heard.

We try to break AI agents before bad actors do. Your platform handles 1.5M+ conversations across text, email, and voice. We recently tested a property management AI agent and took it over through its customer chat in under 20 minutes. Helped them fix everything in a day.

I put together a short walkthrough of how that worked and what it means for platforms like yours. Want me to send it over?

Best,
Daniel Chalco
CEO of Rocoto"

NOTICE THE RHYTHM: Paragraph 1 is personal. Paragraph 2 explains what Rocoto does in plain English, names their channels, and references a REAL result (Mason). Paragraph 3 offers a free, specific deliverable. Short sentences. Simple words.

TONE: Genuinely curious, slightly cheeky, warm. You're a smart friend who happens to be really good at breaking AI. Not a salesperson. Not a hacker trying to scare them.

HARD RULES:
- 80-150 words body (not counting greeting/sign-off)
- ABSOLUTELY NO EM DASHES. Never "\u2014" or "\u2013". Use commas, periods, "and", or parentheses. One em dash = rejected.
- BANNED PHRASES: "the question nobody's asking," "in today's landscape," "at the intersection of," "it's not just X it's Y," "game-changer," "revolutionize," "I hope this finds you well," "I came across your," "I was impressed by," "I noticed that," "I wanted to reach out," "I'd love to connect," "fascinating intersection," "fascinating attack surface," "fun contrast," "which creates a fascinating," "perfect storm," "creates a perfect," "massive attack surface," "across all," "across your"
- NEVER invent capabilities, clients, or results that aren't in the ABOUT ROCOTO section
- Use simple, everyday language. Write like you're texting a friend, not writing a security whitepaper.
- No bullet points in the email body
- THREE paragraphs: intro+SMYKM, then value, then CTA
- No sentence longer than 25 words. If a sentence is getting long, split it.
- The SMYKM detail should be so specific it's almost creepy
- Paragraph 1 MUST start with "We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto."
- The CTA MUST offer a free, specific deliverable (free test, walkthrough, write-up). Never just ask for a meeting or call.

Respond with ONLY valid JSON:
{"subject": "...", "body": "..."}`

const INVESTOR_SYSTEM_PROMPT = `You are Daniel Chalco writing a cold email to an investor.

${ROCOTO_IDENTITY}

YOUR GOAL: Make this investor feel like you genuinely studied their worldview. Not pitching. Sharing. Show them Rocoto is the missing piece in a thesis they already believe.

SUBJECT LINE: Something only this investor would get. A quote from their blog, a portfolio company pattern, their thesis language. Confuse everyone else.

BODY STRUCTURE (3 paragraphs, each does ONE job):

1. INTRO + SMYKM PARAGRAPH:
"We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto." That is the FIRST SENTENCE. Then flow directly into the SMYKM personal detail about this investor. Mirror their language. Reference a specific belief, blog post, or portfolio pattern. 2-3 more sentences. ALL about them and their worldview.

2. THESIS PARAGRAPH:
Connect Rocoto to their thesis using THEIR words. In plain language: Rocoto tries to break AI agents the same way a bad actor would (through email, text, chat, voice) and then helps fix what we find. If they invest in AI infrastructure, every company shipping AI agents needs someone testing them. If they invest in cybersecurity, this is the next frontier (testing AI agents, not just networks). Reference a specific portfolio company where Rocoto's value is obvious. Mention the Mason pilot as traction if relevant. 1-2 SHORT sentences. Keep it punchy.

3. CTA PARAGRAPH:
The ask. One sentence. Its own paragraph. Offer something concrete: a one-pager, a market map, or a breakdown of which portfolio companies have AI agents that could be tested. Give them value for saying yes.

Sign off with exactly:
Best,
Daniel Chalco
CEO of Rocoto

TONE: Confident but warm. Think "I read your blog post and it changed how I think about this" energy.

HARD RULES:
- 80-150 words body (not counting greeting/sign-off)
- ABSOLUTELY NO EM DASHES. Never "\u2014" or "\u2013". One em dash = rejected.
- BANNED PHRASES: "landscape," "intersection," "game-changer," "I hope this finds you well," "I came across," "I was impressed by," "I noticed that," "I wanted to reach out," "fascinating intersection," "fun contrast," "perfect storm," "creates a perfect," "massive attack surface," "across all," "across your"
- NEVER invent capabilities, clients, or results not in the ABOUT ROCOTO section
- Use simple, everyday language. No security jargon unless the investor uses it first.
- No bullet points
- THREE paragraphs: intro+SMYKM, then thesis, then CTA
- No sentence longer than 25 words
- The SMYKM detail should be so specific it's almost creepy
- Paragraph 1 MUST start with "We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto."
- The CTA MUST offer a free deliverable (one-pager, market map, portfolio analysis). Never just ask for a meeting.

Respond with ONLY valid JSON:
{"subject": "...", "body": "..."}`

const PARTNERSHIP_SYSTEM_PROMPT = `You are Daniel Chalco writing a cold email to a potential partner.

${ROCOTO_IDENTITY}

YOUR GOAL: Show you understand their business so well they think "this person gets what we do." Frame the partnership as a way to add massive value to THEIR clients.

SUBJECT LINE: Something only this person would get. A recent case study, a specific client vertical, a deal they closed. Confuse everyone else.

BODY STRUCTURE (3 paragraphs, each does ONE job):

1. INTRO + SMYKM PARAGRAPH:
"We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto." That is the FIRST SENTENCE. Then flow directly into the SMYKM personal detail about their business. Show why it caught your attention. 2-3 more sentences. ALL about them and what they do.

2. MUTUAL VALUE PARAGRAPH:
Connect Rocoto to their business in a way that makes their offering stronger. Rocoto tests AI agents by trying to break them through the same channels their users use (email, text, chat, voice). If they're a cyber insurance company, Rocoto testing reduces their clients' risk. If they're an agency, Rocoto gives their clients a way to know their AI is safe. If they're a consulting firm, AI agent testing is a new service line. Frame it as "together we can give your clients X." 1-2 SHORT sentences. Keep it punchy.

3. CTA PARAGRAPH:
The ask. One sentence. Its own paragraph. Offer something concrete: a free test of one of their client's AI agents, a joint case study outline, or a partnership overview doc. Give them value for saying yes.

Sign off with exactly:
Best,
Daniel Chalco
CEO of Rocoto

TONE: Genuinely curious, slightly cheeky, warm. You're proposing a win-win, not asking for a favor.

HARD RULES:
- 80-150 words body (not counting greeting/sign-off)
- ABSOLUTELY NO EM DASHES. Never "\u2014" or "\u2013". One em dash = rejected.
- BANNED PHRASES: "landscape," "intersection," "game-changer," "I hope this finds you well," "I came across," "I was impressed by," "I noticed that," "I wanted to reach out," "fascinating intersection," "fun contrast," "perfect storm," "creates a perfect," "massive attack surface," "across all," "across your"
- NEVER invent capabilities, clients, or results not in the ABOUT ROCOTO section
- Use simple, everyday language. No jargon.
- No bullet points
- THREE paragraphs: intro+SMYKM, then mutual value, then CTA
- No sentence longer than 25 words
- Creepy-good SMYKM detail
- Paragraph 1 MUST start with "We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto."
- The CTA MUST offer a free deliverable (free test, partnership overview, joint case study). Never just ask for a meeting.

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
FORMULA: "If you're open to it, I'd love to show you [SPECIFIC THING about THEIR product]. Let me know what works and I'll send a calendar invite."
The [SPECIFIC THING] must reference their actual product in plain language: "what happened when we tested a similar [type of AI agent]" or "the three ways [their product type] can be tricked and how to stop each one." Simple words. Make it so relevant they HAVE to know.`
      : `CTA STYLE: Hormozi. NEVER ask for a meeting. Lead with a free resource that delivers value just by saying yes. The ask is tiny ("want me to send it?") but the value is high and specific to THEIR situation.
FORMULA: "I put together [SPECIFIC DELIVERABLE about THEIR situation]. Want me to send it your way?"
The [SPECIFIC DELIVERABLE] should be simple and clear: a short write-up, a walkthrough, a breakdown of common risks for their type of AI, or a checklist. NOT jargon-heavy. YES "a short breakdown of the three most common ways [their type of AI agent] can be tricked and how to fix each one." Make the deliverable so specific they think you already did the work FOR them.`

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
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Quality checks
    const BANNED_PHRASES = [
      'the question nobody\'s asking', 'in today\'s landscape', 'at the intersection of',
      'game-changer', 'revolutionize', 'I hope this finds you well', 'I came across your',
      'I was impressed by', 'I noticed that', 'I wanted to reach out', 'I\'d love to connect',
      'fascinating intersection', 'fascinating attack surface', 'fun contrast',
      'which creates a fascinating', 'perfect storm', 'creates a perfect',
      'massive attack surface', 'across all', 'across your',
    ]

    function checkEmailQuality(subject: string, body: string): { issues: string[]; score: number } {
      const issues: string[] = []
      let score = 100

      // Word count check
      const words = countWords(body)
      if (words < 60) {
        issues.push(`Body is only ${words} words. Target: 80-150.`)
        score -= 10
      } else if (words > 160) {
        issues.push(`Body is ${words} words. Target: 80-150.`)
        score -= 10
      }

      // Em dash check
      if (/[\u2013\u2014]/.test(body) || /[\u2013\u2014]/.test(subject)) {
        issues.push('Contains em dashes. Replace with commas or periods.')
        score -= 15
      }

      // Banned phrases check
      const bodyLower = body.toLowerCase()
      for (const phrase of BANNED_PHRASES) {
        if (bodyLower.includes(phrase.toLowerCase())) {
          issues.push(`Contains banned phrase: "${phrase}".`)
          score -= 10
        }
      }

      // Opening line check
      if (!body.startsWith("We've yet to be properly introduced")) {
        issues.push('Doesn\'t start with the standard SMYKM opener.')
        score -= 10
      }

      // Long sentence check (>25 words)
      const sentences = body.split(/[.!?]+/).filter(Boolean)
      for (const sentence of sentences) {
        const sentenceWords = sentence.trim().split(/\s+/).length
        if (sentenceWords > 28) {
          issues.push(`Has a ${sentenceWords}-word sentence. Keep under 25.`)
          score -= 5
          break
        }
      }

      // Sign-off check
      if (!body.includes('Best,\nDaniel Chalco') && !body.includes('Best, Daniel Chalco')) {
        issues.push('Missing standard sign-off (Best, Daniel Chalco).')
        score -= 5
      }

      return { issues, score: Math.max(0, score) }
    }

    const mckennaQuality = checkEmailQuality(mckennaResult.subject, mckennaResult.body)
    const hormoziQuality = checkEmailQuality(hormoziResult.subject, hormoziResult.body)

    return NextResponse.json({
      mckenna: {
        subject: stripEmDashes(mckennaResult.subject),
        body: stripEmDashes(mckennaResult.body),
        ctaType: 'mckenna' as const,
        wordCount: countWords(mckennaResult.body),
        quality: mckennaQuality,
      },
      hormozi: {
        subject: stripEmDashes(hormoziResult.subject),
        body: stripEmDashes(hormoziResult.body),
        ctaType: 'hormozi' as const,
        wordCount: countWords(hormoziResult.body),
        quality: hormoziQuality,
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
