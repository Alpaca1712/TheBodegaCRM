import { generateJSON } from './anthropic'
import { checkEmailQuality, countWords } from './quality'
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

const INITIAL_SYSTEM_PROMPTS: Record<string, string> = {
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

TONE: Genuinely curious, slightly cheeky, warm. You're a smart friend who happens to be really good at breaking AI. Not a salesperson. Not a hacker trying to scare them.

HARD RULES:
- 80-150 words body (not counting greeting/sign-off)
- ABSOLUTELY NO EM DASHES. Never "\u2014" or "\u2013". Use commas, periods, "and", or parentheses. One em dash = rejected.
- BANNED PHRASES: "the question nobody's asking," "in today's landscape," "at the intersection of," "it's not just X it's Y," "game-changer," "revolutionize," "I hope this finds you well," "I came across your," "I was impressed by," "I noticed that," "I wanted to reach out," "I'd love to connect," "fascinating intersection," "fascinating attack surface," "fun contrast," "which creates a fascinating," "perfect storm," "creates a perfect," "massive attack surface," "across all," "across your", "just checking in", "circling back", "wanted to follow up", "bumping this", "inspired by"
- NEVER invent capabilities, clients, or results that aren't in the ABOUT ROCOTO section
- Use simple, everyday language. Write like you're texting a friend, not writing a security whitepaper.
- THREE paragraphs: intro+SMYKM, then value, then CTA
- No sentence longer than 25 words.
- The SMYKM detail should be so specific it's almost creepy
- Paragraph 1 MUST start with "We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto."
- The CTA MUST offer a free, specific deliverable (free test, walkthrough, write-up). Never just ask for a meeting or call.

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
- BANNED PHRASES: "landscape," "intersection," "game-changer," "I hope this finds you well," "I came across," "I was impressed by," "I noticed that," "I wanted to reach out," "fascinating intersection," "fun contrast," "perfect storm," "creates a perfect," "massive attack surface," "across all," "across your", "just checking in", "circling back", "wanted to follow up", "bumping this", "inspired by"
- NEVER invent capabilities, clients, or results not in the ABOUT ROCOTO section
- Use simple, everyday language. No security jargon unless the investor uses it first.
- THREE paragraphs: intro+SMYKM, then thesis, then CTA
- No sentence longer than 25 words
- The SMYKM detail should be so specific it's almost creepy
- Paragraph 1 MUST start with "We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto."
- The CTA MUST offer a free deliverable (one-pager, market map, portfolio analysis). Never just ask for a meeting.

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
- THREE paragraphs: intro+SMYKM, then mutual value, then CTA
- No sentence longer than 25 words
- Creepy-good SMYKM detail
- Paragraph 1 MUST start with "We've yet to be properly introduced, but I'm Daniel, co-founder of Rocoto."
- The CTA MUST offer a free deliverable (free test, partnership overview, joint case study). Never just ask for a meeting.

Respond with ONLY valid JSON:
{"subject": "...", "body": "..."}`
}

const FOLLOW_UP_SYSTEM_PROMPT = `You are Daniel Chalco writing a follow-up.

${ROCOTO_IDENTITY}

LANGUAGE: Write like you're texting a smart friend. No jargon. No "agentic pentesting," "adversarial inputs," "prompt injection," "data exfiltration," or "attack surface" unless the lead uses those terms first.

CRITICAL: Only reference the Mason pilot as a real result. Do NOT invent other clients or results.
===

You have the FULL conversation history, deep research, SMYKM hooks, and sometimes STRATEGIC DIRECTION with a specific angle or offer Daniel wants to use.

CORE PRINCIPLE: Every follow-up must deliver or offer VALUE. Never just "check in." Each touchpoint should give them something useful: a relevant insight, a free resource, a case study, a specific finding, or a concrete offer. The reader should think "this person keeps giving me useful stuff" not "this person keeps asking for my time."

PRIORITY ORDER:
1. If STRATEGIC DIRECTION is provided, that IS the email. Build the entire follow-up around that strategy, offer, or angle. Don't just mention it. Make it the core pitch. Write it like Daniel would actually write it: direct, confident, a little provocative, with a clear offer that has teeth.
2. If no strategic direction, use SMYKM hooks and the conversation history to write a short, personally specific follow-up that STILL leads with value (a new insight, a relevant article, a finding about their product, a case study of a similar company).

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
- BANNED: "just checking in," "circling back," "wanted to follow up," "bumping this," "I hope this finds you well," "in today's landscape," "at the intersection of," "game-changer," "revolutionize," "I hope this finds you well," "I came across your," "I was impressed by," "I noticed that," "I wanted to reach out," "I'd love to connect," "fascinating intersection," "fascinating attack surface," "fun contrast," "inspired by," "we hack," "we can hack," "we break"
- NEVER paraphrase or quote the strategic direction notes. Rewrite the idea completely in your own words as if you came up with it yourself.
- If they replied, match their energy and length exactly
- Two to four short paragraphs max. Each paragraph 1-2 sentences.
- The email should feel like Daniel dashed it off in 30 seconds because he had a good idea
- Every follow-up MUST contain a value offer (free resource, insight, case study, assessment, finding). No empty asks.

Respond with ONLY valid JSON:
{"subject": "...", "body": "...", "channel": "email|linkedin|twitter"}`

function buildResearchContext(lead: Lead, memories?: Array<{ memory_type: string; content: string }>): string {
  const bc = lead.battle_card;
  const sections: string[] = []

  sections.push(`=== LEAD ===
Name: ${lead.contact_name}
Title: ${lead.contact_title || 'Unknown'}
Company: ${lead.company_name}
Type: ${lead.type}
Stage: ${lead.stage}${lead.icp_score ? `\nICP Score: ${lead.icp_score}/100` : ''}${lead.icp_reasons?.length ? `\nICP Reasons: ${lead.icp_reasons.join(', ')}` : ''}`)

  if (bc?.our_angle) {
    sections.push(`=== STRATEGIC GTM ANGLE (Use this to shape the pitch) ===\n${bc.our_angle}`)
  }

  if (lead.company_description) {
    sections.push(`=== COMPANY ===\n${lead.company_description}`)
  }

  if (bc?.our_angle || bc?.their_product || bc?.their_weaknesses?.length || bc?.trigger_events?.length) {
    sections.push(`=== BATTLE CARD / STRATEGY ===
${bc?.our_angle ? `OUR ANGLE: ${bc.our_angle}\n` : ''}${bc?.their_product ? `PRODUCT INTEL: ${bc.their_product}\n` : ''}${bc?.their_weaknesses?.length ? `TARGET WEAKNESSES: ${bc.their_weaknesses.join(', ')}\n` : ''}${bc?.trigger_events?.length ? `TRIGGER EVENTS (use for urgency): ${bc.trigger_events.join(', ')}\n` : ''}${bc?.decision_makers?.length ? `DECISION MAKERS: ${bc.decision_makers.map(dm => `${dm.role}: ${dm.concerns}`).join('; ')}` : ''}`)
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

  if (memories?.length) {
    sections.push(`=== AGENT MEMORIES (facts from past interactions, use for deeper personalization) ===\n${memories.map(m => `- [${m.memory_type}] ${m.content}`).join('\n')}`)
  }

  return sections.join('\n\n')
}

export async function generateInitialEmailVariants(
  lead: Lead,
  customContext?: string,
  memories?: Array<{ memory_type: string; content: string }>
): Promise<GeneratedEmail> {
  const systemPrompt = INITIAL_SYSTEM_PROMPTS[lead.type] || INITIAL_SYSTEM_PROMPTS.customer
  const research = buildResearchContext(lead, memories)

  const buildPrompt = (ctaStyle: 'mckenna' | 'hormozi') => {
    const ctaInstruction = ctaStyle === 'mckenna'
      ? `CTA STYLE: McKenna. Solicit interest, not just time. Tell them WHAT the conversation is about using something specific to THEIR product. Give them agency (never suggest a specific day, never send a calendar link). The CTA must make them curious about a specific outcome they'd get.
FORMULA: "If you're open to it, I'd love to show you [SPECIFIC THING about THEIR product]. Let me know what works and I'll send a calendar invite."`
      : `CTA STYLE: Hormozi. NEVER ask for a meeting. Lead with a free resource that delivers value just by saying yes. The ask is tiny ("want me to send it?") but the value is high and specific to THEIR situation.
FORMULA: "I put together [SPECIFIC DELIVERABLE about THEIR situation]. Want me to send it your way?"`

    const customSection = customContext?.trim()
      ? `\n\nSTRATEGIC DIRECTION (this is the #1 priority, build the ENTIRE email around this):
${customContext.trim()}`
      : ''

    return `Write a cold email to ${lead.contact_name}${lead.contact_title ? ` (${lead.contact_title})` : ''} at ${lead.company_name}.

${ctaInstruction}

LEAD RESEARCH:
${research}${customSection}`
  }

  const [mckennaResult, hormoziResult] = await Promise.all([
    generateJSON<{ subject: string; body: string }>(
      systemPrompt,
      buildPrompt('mckenna'),
      { temperature: 0.95, maxTokens: 4096 }
    ),
    generateJSON<{ subject: string; body: string }>(
      systemPrompt,
      buildPrompt('hormozi'),
      { temperature: 0.95, maxTokens: 4096 }
    ),
  ])

  const stripEmDashes = (text: string) => text.replace(/[\u2013\u2014]/g, ',')

  return {
    mckenna: {
      subject: stripEmDashes(mckennaResult.subject),
      body: stripEmDashes(mckennaResult.body),
      ctaType: 'mckenna',
      wordCount: countWords(mckennaResult.body),
      quality: checkEmailQuality(mckennaResult.subject, mckennaResult.body, 'initial'),
    },
    hormozi: {
      subject: stripEmDashes(hormoziResult.subject),
      body: stripEmDashes(hormoziResult.body),
      ctaType: 'hormozi',
      wordCount: countWords(hormoziResult.body),
      quality: checkEmailQuality(hormoziResult.subject, hormoziResult.body, 'initial'),
    },
  }
}

export async function generateFollowUpVariants(
  lead: Lead,
  emailThread: Array<{ direction: 'inbound' | 'outbound'; subject: string; body: string; sent_at?: string | null; created_at?: string }>,
  followUpNumber: number,
  customContext?: string,
  memories?: Array<{ memory_type: string; content: string }>
): Promise<GeneratedEmail> {
  const research = buildResearchContext(lead, memories)

  const buildFullContext = () => {
    const sections: string[] = [research]

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
      sections.push(`=== STRATEGIC DIRECTION (this is the #1 priority, build the ENTIRE email around this) ===
${customContext.trim()}`)
    }

    const context = sections.join('\n\n')
    const hasStrategy = customContext?.trim()
    const lengthNote = hasStrategy
      ? 'Length: as long as the strategy needs, but no filler. Every sentence earns its place. Your example email was ~90 words and that was perfect.'
      : ''

    if (lead.stage === 'replied') {
      return `${context}

=== TASK: THEY REPLIED ===
Match their length EXACTLY. If they wrote 2 sentences, you write 2 sentences.

Hormozi ACA framework:
- Acknowledge what they said (mirror, don't parrot)
- Compliment a character trait (genuine, not sycophantic)
- Ask toward next steps, but ALWAYS attach value to the next step

${lead.type === 'investor' ? 'If they want more info: "I have a one-pager with our traction data and the market map. Says it better than I can. Want me to send it?"' : lead.type === 'partnership' ? 'If they want more info: "I put together a quick overview of how this works together, including what it looks like for your clients. Want me to send it?"' : 'If they want more info: "I put together a breakdown specific to [their product], including the three areas we\'d assess first and what we typically find. Want me to send it?"'}
If "let's chat": "What works for you? I'll send an invite. In the meantime, here's a quick overview of what we'd cover so you can see if it's worth your time."
If "not now": Be graceful. One sentence. Leave a standing offer: "If you ever want a free assessment of [their agent], the offer stands."

${hasStrategy ? 'The STRATEGIC DIRECTION above should inform your response angle.' : 'Weave in a SMYKM hook if it fits naturally. Don\'t force it.'}
${hasStrategy ? 'Length: as long as the strategy needs, but tight.' : 'MAX: 40-60 words.'}`
    }

    if (lead.stage === 'meeting_held') {
      return `${context}

=== TASK: POST-MEETING FOLLOW-UP ===
Send within 24 hours of the meeting. This is NOT a cold follow-up, it's a warm continuation.
${hasStrategy ? lengthNote : '60-100 words. Three short paragraphs max.'}

Structure:
1. Open with energy from the meeting. Reference something specific they said or a moment that stood out. NOT "great meeting you" or "thanks for your time."
2. Deliver on a promise or add new value: send the thing you said you'd send, share a relevant finding, or offer a concrete next step with a deliverable attached. Be specific: what, who, when.
3. Close with a clear, low-friction ask. Always attach value: "I'll have the assessment results by Friday" or "Here's the case study I mentioned."

${hasStrategy ? 'The STRATEGIC DIRECTION above should shape the angle of this follow-up.' : 'Use SMYKM hooks from the meeting if you have them.'}
- Tone: warm but direct. You're building on momentum, not restarting.
- Do NOT summarize the entire meeting. Pick the one thing that matters most.
- The follow-up should make them feel like working with you is already underway, not like they still need to decide.`
    }

    if (followUpNumber === 1) {
      return `${context}

=== TASK: FOLLOW-UP #1 (Day 4, The Bump + New Insight) ===
${hasStrategy ? lengthNote : '40-70 words. Two to three sentences.'}
- Do NOT reference the original email ("as I mentioned," "following up on my last email"). They know.
${hasStrategy ? '- The STRATEGIC DIRECTION above is your primary angle. Build the whole email around it.' : `- Lead with a NEW piece of value: a relevant insight about their industry, a stat about AI agent vulnerabilities in their space, or something new you noticed about their product.
- Then connect it to a specific free resource or offer: "We just finished an assessment for a similar [their industry] company. Happy to share the anonymized findings if useful."`}
- Be the person they'd want to grab coffee with.
- The reader should learn something new or get offered something useful. No empty bumps.`
    }

    if (followUpNumber === 2) {
      const typeSpecific = hasStrategy
        ? 'The STRATEGIC DIRECTION above is your primary angle. Build the whole email around that offer/strategy.'
        : lead.type === 'investor'
        ? `Offer a concrete deliverable: a one-page market map of the AI agent security space, a breakdown of how their portfolio companies are exposed, or a memo on why this category is about to explode. Frame it casually: "easier to skim than another email from me."`
        : lead.type === 'partnership'
        ? `Offer a concrete deliverable: a co-branded assessment template, a joint case study outline, or a breakdown of how their clients' AI agents are exposed. Frame it around what THEIR clients get.`
        : `Offer a concrete deliverable: a free security assessment of one of their AI agents, a vulnerability report template, or a case study of how a similar company found and fixed critical issues. Frame it as "I already put this together" energy.`

      return `${context}

=== TASK: FOLLOW-UP #2 (Day 9, The Value Drop) ===
${hasStrategy ? lengthNote : '40-60 words. Two to three sentences.'}
${typeSpecific}
- New SMYKM hook. Don't recycle.
- Don't ask for a meeting. Just offer the deliverable.
- The deliverable must be SPECIFIC to their situation (name their product, their industry, their agent type). Not generic.
- Slightly funny or clever framing. Not corporate.`
    }

    if (followUpNumber === 3) {
      return `${context}

=== TASK: FOLLOW-UP #3 (Day 14, Channel Switch + Social Proof) ===
Write for LinkedIn DM or Twitter DM. NOT email.
${hasStrategy ? 'Keep it short but let the strategy breathe. DMs are casual.' : '20-40 words. Two to three sentences max. DMs are SHORT.'}
- Acknowledge you emailed. Don't apologize for it.
${hasStrategy ? '- The STRATEGIC DIRECTION above is your primary angle.' : `- Drop social proof: mention a similar company you helped, a result you got, or a relevant finding. "Just wrapped an assessment for a [similar company type], found 3 critical issues in their [agent type]. Made me think of your setup."
- One SMYKM hook that proves you're not mass-blasting.`}
- Offer value, not a meeting. Even the DM should give them something.
- Tone: casual, like you're DMing someone you met at a conference`
    }

    return `${context}

=== TASK: BREAK-UP (Day 21+, The Standing Offer) ===
${hasStrategy ? 'Short but make the offer land. Every word counts.' : '20-35 words. Two to three sentences.'}
- Give them an easy out. Be memorable.
${hasStrategy ? '- Use the STRATEGIC DIRECTION as your final angle.' : `- Leave a STANDING OFFER: something they can take you up on anytime. "If you ever want a free assessment of [their specific agent], the offer stands. No expiration."
- One final cheeky SMYKM reference if it fits.`}
- Leave the door open without being needy. The standing offer does the work.
- They should feel like they're losing access to something valuable, not being pestered.`
  }

  const [resA, resB] = await Promise.all([
    generateJSON<{ subject: string; body: string; channel: 'email' | 'linkedin' | 'twitter' }>(
      FOLLOW_UP_SYSTEM_PROMPT,
      buildFullContext(),
      { temperature: 0.95, maxTokens: 4096 }
    ),
    generateJSON<{ subject: string; body: string; channel: 'email' | 'linkedin' | 'twitter' }>(
      FOLLOW_UP_SYSTEM_PROMPT,
      buildFullContext(),
      { temperature: 0.95, maxTokens: 4096 }
    ),
  ])

  const stripEmDashes = (text: string) => text.replace(/[\u2013\u2014]/g, ',')

  return {
    mckenna: {
      subject: stripEmDashes(resA.subject),
      body: stripEmDashes(resA.body),
      ctaType: 'mckenna',
      wordCount: countWords(resA.body),
      quality: checkEmailQuality(resA.subject, resA.body, 'follow_up'),
    },
    hormozi: {
      subject: stripEmDashes(resB.subject),
      body: stripEmDashes(resB.body),
      ctaType: 'hormozi',
      wordCount: countWords(resB.body),
      quality: checkEmailQuality(resB.subject, resB.body, 'follow_up'),
    },
  }
}
