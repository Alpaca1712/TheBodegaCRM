import { generateJSON } from './anthropic'
import { checkEmailQuality, countWords } from './quality'
import type { Lead, LeadEmail, EmailVariant, CtaType } from '@/types/leads'

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

const INITIAL_CUSTOMER_SYSTEM_PROMPT = `You are Daniel Chalco writing a cold email.

${ROCOTO_IDENTITY}

YOUR GOAL: Write an email that reads like one smooth thought. Short sentences. No filler. Lead with VALUE, not threats.

SUBJECT LINE: Something ONLY this person would get. An obscure detail from their life. If anyone else read it, they'd be confused.

BODY STRUCTURE (3 paragraphs, each does ONE job):

1. INTRO + SMYKM PARAGRAPH:
"We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto." That is the FIRST SENTENCE. Then flow directly into the SMYKM personal detail about THEM. 2-3 more sentences showing deep research. Make them think "how does this person know that?" This paragraph is about building credibility and connection.

2. VALUE PARAGRAPH:
Bridge from their world to what Rocoto does. Name their product and how people talk to their AI agent (email, chat, text, voice, etc.). Then explain, in plain language, that Rocoto tries to break AI agents through those same channels before someone else does. If you reference a past result, ONLY reference the Mason pilot (a property management AI agent we were able to take over through its customer chat in under 20 minutes). Keep this paragraph punchy and tight. Use simple words.

3. CTA PARAGRAPH:
The ask. One sentence. Its own paragraph. ALWAYS offer something concrete and free: testing one of their agents, a short write-up of what we found with a similar AI, or a walkthrough of how the attack worked. The reader should get value just by saying "yes." Never just ask for time or a meeting.

Sign off with exactly:
Best,
Daniel Chalco
CEO of Rocoto

TONE: Genuinely curious, slightly cheeky, warm. You're a smart friend who happens to be really good at breaking AI. Not a salesperson. Not a hacker trying to scare them.

HARD RULES:
- 80-150 words body (not counting greeting/sign-off)
- ABSOLUTELY NO EM DASHES. Never "\u2014" or "\u2013". One em dash = rejected.
- BANNED PHRASES: "the question nobody's asking," "in today's landscape," "at the intersection of," "it's not just X it's Y," "game-changer," "revolutionize," "I hope this finds you well," "I came across your," "I was impressed by," "I noticed that," "I wanted to reach out," "I'd love to connect," "fascinating intersection," "fascinating attack surface," "fun contrast," "which creates a fascinating," "perfect storm," "creates a perfect," "massive attack surface," "across all," "across your", "just checking in", "circling back", "wanted to follow up", "bumping this", "inspired by"
- NEVER invent capabilities, clients, or results that aren't in the ABOUT ROCOTO section
- Use simple, everyday language. Write like you're texting a friend, not writing a security whitepaper.
- No bullet points in the email body
- THREE paragraphs: intro+SMYKM, then value, then CTA
- No sentence longer than 25 words. If a sentence is getting long, split it.
- Paragraph 1 MUST start with "We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto."
- The CTA MUST offer a free, specific deliverable (free test, walkthrough, write-up). Never just ask for a meeting or call.`

const INITIAL_INVESTOR_SYSTEM_PROMPT = `You are Daniel Chalco writing a cold email to an investor.

${ROCOTO_IDENTITY}

YOUR GOAL: Make this investor feel like you genuinely studied their worldview. Not pitching. Sharing. Show them Rocoto is the missing piece in a thesis they already believe.

SUBJECT LINE: Something only this investor would get. A quote from their blog, a portfolio company pattern, their thesis language. Confuse everyone else.

BODY STRUCTURE (3 paragraphs, each does ONE job):

1. INTRO + SMYKM PARAGRAPH:
"We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto." That is the FIRST SENTENCE. Then flow directly into the SMYKM personal detail about this investor. Mirror their language. Reference a specific belief, blog post, or portfolio pattern. 2-3 more sentences. ALL about them and their worldview.

2. THESIS PARAGRAPH:
Connect Rocoto to their thesis using THEIR words. In plain language: Rocoto tries to break AI agents the same way a bad actor would (through email, text, chat, voice) and then helps fix what we find. Mention the Mason pilot as traction if relevant. 1-2 SHORT sentences. Keep it punchy.

3. CTA PARAGRAPH:
The ask. One sentence. Its own paragraph. Offer something concrete: a one-pager, a market map, or a breakdown of which portfolio companies have AI agents that could be tested. Give them value for saying yes.

Sign off with exactly:
Best,
Daniel Chalco
CEO of Rocoto

TONE: Confident but warm. Think "I read your blog post and it changed how I think about this" energy.

HARD RULES:
- 80-150 words body
- ABSOLUTELY NO EM DASHES. One em dash = rejected.
- BANNED PHRASES: "landscape," "intersection," "game-changer," "I hope this finds you well," "I came across," "I was impressed by," "I noticed that," "I wanted to reach out," "fascinating intersection," "fun contrast," "perfect storm," "creates a perfect," "massive attack surface," "across all," "across your", "just checking in", "circling back", "wanted to follow up", "bumping this", "inspired by"
- NEVER invent capabilities, clients, or results not in the ABOUT ROCOTO section
- Use simple, everyday language. No security jargon unless the investor uses it first.
- No bullet points
- THREE paragraphs: intro+SMYKM, then thesis, then CTA
- No sentence longer than 25 words
- Paragraph 1 MUST start with "We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto."
- The CTA MUST offer a free deliverable (one-pager, market map, portfolio analysis). Never just ask for a meeting.`

const INITIAL_PARTNERSHIP_SYSTEM_PROMPT = `You are Daniel Chalco writing a cold email to a potential partner.

${ROCOTO_IDENTITY}

YOUR GOAL: Show you understand their business so well they think "this person gets what we do." Frame the partnership as a way to add massive value to THEIR clients.

SUBJECT LINE: Something only this person would get. A recent case study, a specific client vertical, a deal they closed. Confuse everyone else.

BODY STRUCTURE (3 paragraphs, each does ONE job):

1. INTRO + SMYKM PARAGRAPH:
"We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto." That is the FIRST SENTENCE. Then flow directly into the SMYKM personal detail about their business. Show why it caught your attention. 2-3 more sentences. ALL about them and what they do.

2. MUTUAL VALUE PARAGRAPH:
Connect Rocoto to their business in a way that makes their offering stronger. Rocoto tests AI agents by trying to break them through the same channels their users use (email, text, chat, voice). Frame it as "together we can give your clients X." 1-2 SHORT sentences. Keep it punchy.

3. CTA PARAGRAPH:
The ask. One sentence. Its own paragraph. Offer something concrete: a free test of one of their client's AI agents, a joint case study outline, or a partnership overview doc. Give them value for saying yes.

Sign off with exactly:
Best,
Daniel Chalco
CEO of Rocoto

TONE: Genuinely curious, slightly cheeky, warm. You're a win-win, not a favor.

HARD RULES:
- 80-150 words body
- ABSOLUTELY NO EM DASHES.
- BANNED PHRASES: "landscape," "intersection," "game-changer," "I hope this finds you well," "I came across," "I was impressed by," "I noticed that," "I wanted to reach out," "fascinating intersection," "fun contrast," "perfect storm," "creates a perfect," "massive attack surface," "across all," "across your"
- NEVER invent capabilities, clients, or results not in the ABOUT ROCOTO section
- THREE paragraphs: intro+SMYKM, then mutual value, then CTA
- No sentence longer than 25 words
- Paragraph 1 MUST start with "We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto."
- The CTA MUST offer a free deliverable. Never just ask for a meeting.`

const FOLLOWUP_SYSTEM_PROMPT = `You are Daniel Chalco writing a follow-up.

${ROCOTO_IDENTITY}

You have the FULL conversation history, deep research, SMYKM hooks, and sometimes STRATEGIC DIRECTION with a specific angle or offer Daniel wants to use.

CORE PRINCIPLE: Every follow-up must deliver or offer VALUE. Never just "check in." Each touchpoint should give them something useful: a relevant insight, a free resource, a case study, a specific finding, or a concrete offer. The reader should think "this person keeps giving me useful stuff" not "this person keeps asking for my time."

PRIORITY ORDER:
1. If STRATEGIC DIRECTION is provided, that IS the email. Build the entire follow-up around that strategy, offer, or angle. Don't just mention it. Make it the core pitch. Write it like Daniel would actually write it: direct, confident, a little provocative, with a clear offer that has teeth.
2. If no strategic direction, use SMYKM hooks and the conversation history to write a short, personally specific follow-up that STILL leads with value.

TONE: Direct, confident, slightly provocative. You're a founder making a real offer, not a marketer writing copy. Think bar conversation, not LinkedIn post. Short sentences. No filler.

FORMATTING:
- Start with "Hello [First Name]," or "Hey [First Name]," on its own line.
- End email follow-ups with exactly:
Best,
Daniel Chalco
CEO of Rocoto
- For LinkedIn/Twitter DMs, just "Daniel" or no sign-off.

HARD RULES:
- ABSOLUTELY NO EM DASHES.
- BANNED: "just checking in," "circling back," "wanted to follow up," "bumping this," "I hope this finds you well," "in today's landscape," "at the intersection of," "game-changer," "I noticed that," "fascinating intersection," "fascinating attack surface," "fun contrast," "inspired by"
- NEVER paraphrase or quote the strategic direction notes. Rewrite the idea completely.
- If they replied, match their energy and length exactly
- Two to four short paragraphs max. Each paragraph 1-2 sentences.
- Every follow-up MUST contain a value offer. No empty asks.`

interface GenerateOptions {
  customContext?: string
  memories?: Array<{ memory_type: string; content: string }>
  temperature?: number
}

export class EmailService {
  static async generateInitial(
    lead: Lead,
    ctaStyle: CtaType,
    options: GenerateOptions = {}
  ): Promise<EmailVariant> {
    const systemPromptMap: Record<string, string> = {
      customer: INITIAL_CUSTOMER_SYSTEM_PROMPT,
      investor: INITIAL_INVESTOR_SYSTEM_PROMPT,
      partnership: INITIAL_PARTNERSHIP_SYSTEM_PROMPT,
    }
    const systemPrompt = systemPromptMap[lead.type] || INITIAL_CUSTOMER_SYSTEM_PROMPT

    const userPrompt = this.buildInitialUserPrompt(lead, ctaStyle, options)

    const result = await generateJSON<{ subject: string; body: string }>(
      systemPrompt,
      userPrompt,
      { temperature: options.temperature ?? 0.95, maxTokens: 4096 }
    )

    const stripEmDashes = (text: string) => text.replace(/[\u2013\u2014]/g, ',')
    const finalSubject = stripEmDashes(result.subject)
    const finalBody = stripEmDashes(result.body)

    return {
      subject: finalSubject,
      body: finalBody,
      ctaType: ctaStyle,
      wordCount: countWords(finalBody),
      quality: checkEmailQuality(finalSubject, finalBody, 'initial'),
    }
  }

  static async generateFollowup(
    lead: Lead,
    emailThread: Array<Partial<LeadEmail>>,
    followUpNumber: number,
    options: GenerateOptions = {}
  ): Promise<EmailVariant & { channel: 'email' | 'linkedin' | 'twitter' }> {
    const fullContext = this.buildFollowupContext({
      lead,
      emailThread,
      followUpNumber,
      customContext: options.customContext,
      memories: options.memories
    })

    const result = await generateJSON<{
      subject: string
      body: string
      channel: 'email' | 'linkedin' | 'twitter'
    }>(FOLLOWUP_SYSTEM_PROMPT, fullContext, {
      temperature: options.temperature ?? 0.95,
      maxTokens: 4096,
    })

    const stripEmDashes = (text: string) => text.replace(/[\u2013\u2014]/g, ',')
    const finalSubject = stripEmDashes(result.subject)
    const finalBody = stripEmDashes(result.body)

    return {
      ...result,
      subject: finalSubject,
      body: finalBody,
      ctaType: (result.body.toLowerCase().includes('send it') || result.body.toLowerCase().includes('want me to send')) ? 'hormozi' : 'mckenna',
      wordCount: countWords(finalBody),
      quality: checkEmailQuality(finalSubject, finalBody, 'follow_up'),
    }
  }

  private static buildInitialUserPrompt(
    lead: Lead,
    ctaStyle: CtaType,
    options: GenerateOptions
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
      bc?.their_product && `PRODUCT INTEL: ${bc.their_product}`,
      bc?.tech_stack?.length && `TECH STACK: ${bc.tech_stack.join(', ')}`,
      bc?.their_weaknesses?.length && `TARGET WEAKNESSES: ${bc.their_weaknesses.join(', ')}`,
      bc?.competitive_landscape?.length && `COMPETITIVE LANDSCAPE: ${bc.competitive_landscape.join(', ')}`,
      bc?.trigger_events?.length && `TRIGGER EVENTS (use for urgency): ${bc.trigger_events.join(', ')}`,
      bc?.decision_makers?.length && `DECISION MAKERS & CONCERNS: ${bc.decision_makers.map(dm => `${dm.role}: ${dm.concerns}`).join('; ')}`,
    ]
      .filter(Boolean)
      .join('\n')

    const ctaInstruction =
      ctaStyle === 'mckenna'
        ? `CTA STYLE: McKenna. Solicit interest, not just time. Tell them WHAT the conversation is about using something specific to THEIR product. Give them agency.
FORMULA: "If you're open to it, I'd love to show you [SPECIFIC THING about THEIR product]. Let me know what works and I'll send a calendar invite."`
        : `CTA STYLE: Hormozi. NEVER ask for a meeting. Lead with a free resource that delivers value just by saying yes.
FORMULA: "I put together [SPECIFIC DELIVERABLE about THEIR situation]. Want me to send it your way?"`

    const customSection = options.customContext?.trim()
      ? `\n\nSTRATEGIC DIRECTION (this is the #1 priority):
DANIEL'S NOTES:
${options.customContext.trim()}`
      : ''

    const memorySection = options.memories?.length
      ? `\n\nAGENT MEMORIES:
${options.memories.map(m => `- [${m.memory_type}] ${m.content}`).join('\n')}`
      : ''

    return `Write a cold email to ${lead.contact_name}${lead.contact_title ? ` (${lead.contact_title})` : ''} at ${lead.company_name}.

${ctaInstruction}

LEAD RESEARCH:
${research}${memorySection}${customSection}`
  }

  private static buildFollowupContext(input: {
    lead: Lead
    emailThread: Array<Partial<LeadEmail>>
    followUpNumber: number
    customContext?: string
    memories?: Array<{ memory_type: string; content: string }>
  }): string {
    const { lead, emailThread, followUpNumber, customContext, memories } = input
    const bc = lead.battle_card;
    const sections: string[] = []

    sections.push(`=== LEAD ===
Name: ${lead.contact_name}
Title: ${lead.contact_title || 'Unknown'}
Company: ${lead.company_name}
Type: ${lead.type}
Stage: ${lead.stage}${lead.icp_score ? `\nICP Score: ${lead.icp_score}/100` : ''}`)

    if (bc?.our_angle) {
      sections.push(`=== STRATEGIC GTM ANGLE ===\n${bc.our_angle}`)
    }

    if (lead.company_description) {
      sections.push(`=== COMPANY ===\n${lead.company_description}`)
    }

    if (lead.type === 'customer' && lead.attack_surface_notes) {
      sections.push(`=== ATTACK SURFACE ===\n${lead.attack_surface_notes}`)
    }
    if (lead.type === 'investor' && lead.investment_thesis_notes) {
      sections.push(`=== INVESTMENT THESIS ===\n${lead.investment_thesis_notes}`)
    }
    if (lead.type === 'partnership' && lead.investment_thesis_notes) {
      sections.push(`=== PARTNERSHIP NOTES ===\n${lead.investment_thesis_notes}`)
    }

    if (lead.personal_details) {
      sections.push(`=== PERSONAL DETAILS ===\n${lead.personal_details}`)
    }

    if (lead.smykm_hooks?.length) {
      sections.push(`=== SMYKM HOOKS ===\n${lead.smykm_hooks.map((h, i) => `${i + 1}. ${h}`).join('\n')}`)
    }

    if (lead.conversation_summary) {
      sections.push(`=== AI CONVERSATION SUMMARY ===\n${lead.conversation_summary}`)
    }

    if (memories?.length) {
      sections.push(`=== AGENT MEMORIES ===\n${memories.map(m => `- [${m.memory_type}] ${m.content}`).join('\n')}`)
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
      sections.push(`=== STRATEGIC DIRECTION (this is the #1 priority) ===
DANIEL'S NOTES:
${customContext.trim()}`)
    }

    const context = sections.join('\n\n')

    if (lead.stage === 'replied') {
      return `${context}

=== TASK: THEY REPLIED ===
Hormozi ACA framework: Acknowledge, Compliment, Ask. Match their length.`
    }

    if (lead.stage === 'meeting_held') {
      return `${context}

=== TASK: POST-MEETING FOLLOW-UP ===
Send within 24 hours. Reference something specific they said.`
    }

    if (followUpNumber === 1) {
      return `${context}

=== TASK: FOLLOW-UP #1 (Day 4, The Bump + New Insight) ===
Short (40-70 words). Do NOT reference original email. Lead with a NEW piece of value.`
    }

    if (followUpNumber === 2) {
      return `${context}

=== TASK: FOLLOW-UP #2 (Day 9, The Value Drop) ===
Offer a concrete deliverable (free assessment, memo, map). Don't ask for a meeting.`
    }

    if (followUpNumber === 3) {
      return `${context}

=== TASK: FOLLOW-UP #3 (Day 14, Channel Switch) ===
Write for LinkedIn or Twitter DM. SHORT (20-40 words).`
    }

    return `${context}

=== TASK: BREAK-UP (Day 21+, The Standing Offer) ===
Give them an easy out. Leave a standing offer.`
  }
}
