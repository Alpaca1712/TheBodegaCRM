import { generateJSON } from '@/lib/ai/anthropic'
import { checkEmailQuality, countWords } from '@/lib/ai/quality'
import type { Lead, GeneratedEmail } from '@/types/leads'

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

const INITIAL_SYSTEM_PROMPTS = {
  customer: `You are Daniel Chalco writing a cold email.

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

RULES:
- 80-150 words body
- ABSOLUTELY NO EM DASHES.
- BANNED PHRASES: "the question nobody's asking," "in today's landscape," "at the intersection of," "it's not just X it's Y," "game-changer," "revolutionize," "I hope this finds you well," "I came across your," "I was impressed by," "I noticed that," "I wanted to reach out," "I'd love to connect," "fascinating intersection," "fascinating attack surface," "fun contrast," "inspired by"
- Paragraph 1 MUST start with "We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto."
- Use "Best, Daniel Chalco" sign-off.
- The CTA MUST offer a free, specific deliverable.

Respond with ONLY valid JSON:
{"subject": "...", "body": "..."}`,

  investor: `You are Daniel Chalco writing a cold email to an investor.

${ROCOTO_IDENTITY}

YOUR GOAL: Make this investor feel like you genuinely studied their worldview. Not pitching. Sharing. Show them Rocoto is the missing piece in a thesis they already believe.

SUBJECT LINE: Something only this investor would get. A quote from their blog, a portfolio company pattern, their thesis language. Confuse everyone else.

BODY STRUCTURE (3 paragraphs, each does ONE job):

1. INTRO + SMYKM PARAGRAPH:
"We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto." That is the FIRST SENTENCE. Then flow directly into the SMYKM personal detail about this investor. Mirror their language. Reference a specific belief, blog post, or portfolio pattern. 2-3 more sentences. ALL about them and their worldview.

2. THESIS PARAGRAPH:
Connect Rocoto to their thesis using THEIR words. In plain language: Rocoto tries to break AI agents the same way a bad actor would (through email, text, chat, voice) and then helps fix what we find.

3. CTA PARAGRAPH:
The ask. One sentence. Its own paragraph. Offer something concrete: a one-pager, a market map, or a breakdown of which portfolio companies have AI agents that could be tested. Give them value for saying yes.

Sign off with exactly:
Best,
Daniel Chalco
CEO of Rocoto

RULES:
- 80-150 words body
- ABSOLUTELY NO EM DASHES.
- BANNED PHRASES: "landscape," "intersection," "game-changer," "I hope this finds you well," "I came across," "I was impressed by," "I noticed that," "I wanted to reach out," "inspired by"
- Paragraph 1 MUST start with "We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto."
- The CTA MUST offer a free deliverable.

Respond with ONLY valid JSON:
{"subject": "...", "body": "..."}`,

  partnership: `You are Daniel Chalco writing a cold email to a potential partner.

${ROCOTO_IDENTITY}

YOUR GOAL: Show you understand their business so well they think "this person gets what we do." Frame the partnership as a way to add massive value to THEIR clients.

SUBJECT LINE: Something only this person would get. A recent case study, a specific client vertical, a deal they closed. Confuse everyone else.

BODY STRUCTURE (3 paragraphs, each does ONE job):

1. INTRO + SMYKM PARAGRAPH:
"We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto." That is the FIRST SENTENCE. Then flow directly into the SMYKM personal detail about their business. Show why it caught your attention. 2-3 more sentences. ALL about them and what they do.

2. MUTUAL VALUE PARAGRAPH:
Connect Rocoto to their business in a way that makes their offering stronger.

3. CTA PARAGRAPH:
The ask. One sentence. Its own paragraph. Offer something concrete: a free test of one of their client's AI agents, a joint case study outline, or a partnership overview doc. Give them value for saying yes.

Sign off with exactly:
Best,
Daniel Chalco
CEO of Rocoto

RULES: Same as initial. ABSOLUTELY NO EM DASHES. Paragraph 1 MUST start with "We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto."

Respond with ONLY valid JSON:
{"subject": "...", "body": "..."}`
}

const FOLLOWUP_SYSTEM_PROMPT = `You are Daniel Chalco writing a follow-up.

${ROCOTO_IDENTITY}

YOUR GOAL: Every follow-up must deliver or offer VALUE. Never just "check in." Each touchpoint should give them something useful.

TONE: Direct, confident, slightly provocative. Think bar conversation, not LinkedIn post. Short sentences. No filler.

FORMATTING:
- Start with "Hello [First Name]," or "Hey [First Name]," on its own line.
- End email follow-ups with exactly:
Best,
Daniel Chalco
CEO of Rocoto
- For LinkedIn/Twitter DMs, just "Daniel" or no sign-off.

HARD RULES:
- ABSOLUTELY NO EM DASHES.
- BANNED: "just checking in," "circling back," "wanted to follow up," "bumping this," "I hope this finds you well," "inspired by"
- Never paraphrase or quote the strategic direction notes. Rewrite the idea completely.
- Every follow-up MUST contain a value offer. No empty asks.

Respond with ONLY valid JSON:
{"subject": "...", "body": "...", "channel": "email|linkedin|twitter"}`

export class EmailService {
  private static stripEmDashes(text: string) {
    return text.replace(/[\u2013\u2014]/g, ',')
  }

  private static buildInitialUserPrompt(
    lead: Lead,
    ctaStyle: 'mckenna' | 'hormozi',
    customContext?: string,
    memories?: Array<{ memory_type: string; content: string }>
  ): string {
    const bc = lead.battle_card;

    const research = [
      lead.company_description && `Company: ${lead.company_description}`,
      lead.product_name && `Product: ${lead.product_name}`,
      lead.fund_name && `Fund: ${lead.fund_name}`,
      lead.attack_surface_notes && `Attack Surface: ${lead.attack_surface_notes}`,
      lead.investment_thesis_notes && `Investment Thesis: ${lead.investment_thesis_notes}`,
      lead.personal_details && `Personal Details: ${lead.personal_details}`,
      lead.smykm_hooks?.length && `SMYKM Hooks: ${lead.smykm_hooks.join('; ')}`,
      lead.icp_score != null && `ICP Score: ${lead.icp_score}/100`,
      lead.icp_reasons?.length && `ICP Fit Reasons: ${lead.icp_reasons.join(', ')}`,
      bc?.our_angle && `STRATEGIC ANGLE: ${bc.our_angle}`,
    ].filter(Boolean).join('\n')

    const ctaInstruction = ctaStyle === 'mckenna'
      ? `CTA STYLE: McKenna. Solicit interest, not just time. Tell them WHAT the conversation is about using something specific to THEIR product. Formula: "If you're open to it, I'd love to show you [SPECIFIC THING about THEIR product]. Let me know what works and I'll send a calendar invite."`
      : `CTA STYLE: Hormozi. NEVER ask for a meeting. Lead with a free resource. Formula: "I put together [SPECIFIC DELIVERABLE about THEIR situation]. Want me to send it your way?"`

    const memorySection = memories?.length
      ? `\n\nAGENT MEMORIES:\n${memories.map(m => `- [${m.memory_type}] ${m.content}`).join('\n')}`
      : ''

    const customSection = customContext?.trim() ? `\n\nSTRATEGIC DIRECTION:\n${customContext.trim()}` : ''

    return `Write a cold email to ${lead.contact_name} at ${lead.company_name}.

${ctaInstruction}

LEAD RESEARCH:
${research}${memorySection}${customSection}`
  }

  private static buildFollowupUserPrompt(
    lead: Lead,
    emailThread: Array<Record<string, unknown>>,
    followUpNumber: number,
    customContext?: string,
    memories?: Array<{ memory_type: string; content: string }>
  ): string {
    const bc = lead.battle_card;
    const sections: string[] = []

    sections.push(`=== LEAD ===\nName: ${lead.contact_name}\nCompany: ${lead.company_name}\nType: ${lead.type}\nStage: ${lead.stage}`)

    if (bc?.our_angle) sections.push(`=== STRATEGIC ANGLE ===\n${bc.our_angle}`)
    if (lead.smykm_hooks?.length) sections.push(`=== SMYKM HOOKS ===\n${lead.smykm_hooks.join('\n')}`)

    if (memories?.length) {
      sections.push(`=== AGENT MEMORIES ===\n${memories.map(m => `- [${m.memory_type}] ${m.content}`).join('\n')}`)
    }

    if (emailThread.length > 0) {
      const threadStr = emailThread
        .map((e, i) => `[${i + 1}] ${e.direction === 'outbound' ? 'YOU →' : '← THEM'} | ${e.subject}\n${e.body}`)
        .join('\n\n---\n\n')
      sections.push(`=== FULL EMAIL THREAD ===\n${threadStr}`)
    }

    if (customContext?.trim()) sections.push(`=== STRATEGIC DIRECTION ===\n${customContext.trim()}`)

    const context = sections.join('\n\n')

    const taskMap: Record<number, string> = {
      1: 'FOLLOW-UP #1 (Day 4, The Bump + New Insight). Do NOT reference the original email. Lead with a NEW piece of value.',
      2: 'FOLLOW-UP #2 (Day 9, The Value Drop). Offer a concrete deliverable (free assessment, case study, etc.).',
      3: 'FOLLOW-UP #3 (Day 14, Channel Switch). Write for LinkedIn/Twitter DM. Casual, acknowledging you emailed.',
      4: 'BREAK-UP (Day 21+, The Standing Offer). Give them an easy out, leave a standing offer.'
    }

    let task = taskMap[followUpNumber] || taskMap[1]

    if (lead.stage === 'replied') {
      task = 'THEY REPLIED. Match their length. Use Hormozi ACA framework: Acknowledge, Compliment, Ask.'
    } else if (lead.stage === 'meeting_held') {
      task = 'POST-MEETING FOLLOW-UP. Reference something specific from the meeting. Deliver on a promise or add new value.'
    }

    return `${context}\n\n=== TASK: ${task} ===`
  }

  static async generateInitial(
    lead: Lead,
    options: { customContext?: string; memories?: Array<{ memory_type: string; content: string }> } = {}
  ): Promise<GeneratedEmail> {
    const systemPrompt = INITIAL_SYSTEM_PROMPTS[lead.type] || INITIAL_SYSTEM_PROMPTS.customer

    const [mckenna, hormozi] = await Promise.all([
      generateJSON<{ subject: string; body: string }>(
        systemPrompt,
        this.buildInitialUserPrompt(lead, 'mckenna', options.customContext, options.memories),
        { temperature: 0.95, maxTokens: 1024 }
      ),
      generateJSON<{ subject: string; body: string }>(
        systemPrompt,
        this.buildInitialUserPrompt(lead, 'hormozi', options.customContext, options.memories),
        { temperature: 0.95, maxTokens: 1024 }
      ),
    ])

    return {
      mckenna: {
        subject: this.stripEmDashes(mckenna.subject),
        body: this.stripEmDashes(mckenna.body),
        ctaType: 'mckenna',
        wordCount: countWords(mckenna.body),
        quality: checkEmailQuality(mckenna.subject, mckenna.body, 'initial'),
      },
      hormozi: {
        subject: this.stripEmDashes(hormozi.subject),
        body: this.stripEmDashes(hormozi.body),
        ctaType: 'hormozi',
        wordCount: countWords(hormozi.body),
        quality: checkEmailQuality(hormozi.subject, hormozi.body, 'initial'),
      },
    }
  }

  static async generateFollowup(
    lead: Lead,
    emailThread: Array<Record<string, unknown>>,
    followUpNumber: number,
    options: { customContext?: string; memories?: Array<{ memory_type: string; content: string }> } = {}
  ): Promise<GeneratedEmail> {
    const userPrompt = this.buildFollowupUserPrompt(
      lead,
      emailThread,
      followUpNumber,
      options.customContext,
      options.memories
    )

    const [resA, resB] = await Promise.all([
      generateJSON<{ subject: string; body: string; channel: string }>(
        FOLLOWUP_SYSTEM_PROMPT,
        userPrompt,
        { temperature: 0.95, maxTokens: 1024 }
      ),
      generateJSON<{ subject: string; body: string; channel: string }>(
        FOLLOWUP_SYSTEM_PROMPT,
        userPrompt,
        { temperature: 0.95, maxTokens: 1024 }
      ),
    ])

    return {
      mckenna: {
        subject: this.stripEmDashes(resA.subject),
        body: this.stripEmDashes(resA.body),
        ctaType: 'mckenna',
        wordCount: countWords(resA.body),
        quality: checkEmailQuality(resA.subject, resA.body, 'follow_up'),
      },
      hormozi: {
        subject: this.stripEmDashes(resB.subject),
        body: this.stripEmDashes(resB.body),
        ctaType: 'hormozi',
        wordCount: countWords(resB.body),
        quality: checkEmailQuality(resB.subject, resB.body, 'follow_up'),
      },
    }
  }
}
