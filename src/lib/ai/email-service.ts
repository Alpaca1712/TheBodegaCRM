import { generateJSON } from './anthropic'
import { checkEmailQuality, countWords, normalizeGeneratedEmail } from './quality'
import {
  buildEmailEvidence,
  EvidenceAwareDraft,
  EmailEvidence,
  formatEmailEvidence,
  UngroundedEmailError,
  validateEvidenceAwareDraft,
} from './email-grounding'
import {
  formatInitialOutreachPlan,
  InitialOutreachPlan,
  prepareInitialOutreach,
} from './outreach-prep'
import { Lead, LeadEmail, EmailVariant, CtaType, GeneratedEmail } from '@/types/leads'

export const PIGEON_IDENTITY = `=== ABOUT PIGEON (use ONLY these facts, never invent capabilities or results) ===
Company: Pigeon helps SaaS companies like Subgraph stay secure.

What Pigeon does: Pigeon finds practical security weaknesses in SaaS products before attackers do and helps the team fix them. This is especially relevant to products that use AI agents, automations, APIs, support tools, or sensitive customer data.

How Pigeon works: Pigeon tests the same product paths real users and connected systems can reach. For an AI product, those paths may include email, text, chat, voice, Slack, APIs, and tools the AI can use.

Founder context: Daniel Chalco has spent 14 years breaking into systems, including AI agents. Before software, Daniel worked in restaurants as a host, busser, and barback. Use the restaurant detail only when VERIFIED OUTREACH PREP explicitly allows that shared-experience hook.

Core offer: Pigeon offers a free pentest and delivers the findings within 48 hours. The call to action is a simple reply, never a call or calendar link.

Named resources:
- "We Hack AI Agents" covers three recurring AI-agent security issues and includes checks that take about 15 minutes.
- "Don't Let Security Reviews Kill Your Deals" explains compliance and pentest timing for SaaS teams before SOC 2 or a first enterprise security review.
- Never offer a named resource unless VERIFIED OUTREACH PREP selects that exact loaded resource.

Proof rule: You may say Pigeon helps SaaS companies like Subgraph stay secure. Do not claim a specific Subgraph finding, client result, vulnerability count, percentage, or outcome unless it appears in the lead research or Daniel's notes.

LANGUAGE RULES:
- Write like you're explaining to a smart friend who isn't technical. No jargon.
- NEVER use: "agentic pentesting," "adversarial inputs," "prompt injection," "jailbreaking," "data exfiltration," "tool abuse," "confused deputy," "RAG pipeline," "input surface," "attack surface" (unless the lead's own notes use these terms).
- Instead say things like: "break into," "take over," "trick," "get around safety rules," "pull out private data," "make it do things it shouldn't."
- If the lead IS technical (their attack_surface_notes use jargon), you can mirror their language. Otherwise, keep it simple.

CRITICAL: Never invent a completed test, client, case study, finding, or result. Describe what Pigeon would examine or what it helps prevent unless the supplied context contains the fact.
===`

const INITIAL_OUTREACH_RULES = `RESEARCH AND RELEVANCE PRINCIPLES:
- Follow VERIFIED OUTREACH PREP. It has already ranked the hooks and selected the offer.
- Use the top safe hook when one exists. Product decisions beat authored writing, authored writing beats owned social posts, and ambiguous likes or reshares are never usable.
- Show Me You Know Me: use one verifiable detail that proves this was written for the recipient. A second detail is allowed only in a short P.S.
- Do not force the personal detail to explain the security problem. Personalization earns attention; relevance earns the reply.
- Lead with the problem the buyer feels and the useful outcome, not a description of Pigeon.
- Use the recipient's language only when it appears in VERIFIED EVIDENCE. Never embellish a fact or pretend you used their product.
- Treat VERIFIED EVIDENCE as a closed book. Do not add facts from memory, training data, assumptions, or likely-sounding biography.
- If VERIFIED EVIDENCE has no personal detail, skip personal biography and use only their CRM role, company, or product.
- Copy every factual detail used in the subject or body into evidence_used exactly as it appears in VERIFIED EVIDENCE.
- The offer must match the requested mode: either a lead magnet or Pigeon's core security offer.

SUBJECT:
- 2 to 6 words.
- Lowercase and boring on purpose, like a real person's email.
- Reference the recipient, their product, or the selected problem, never Pigeon.
- No clickbait, fake reply prefixes, vague "quick question," or company-name mashups.
- No colon.

BODY:
- 75 to 145 words, excluding greeting and sign-off.
- Start with "Hi [First name]," or "Hey [First name],".
- Write in this order: hook about them, one-line Daniel/Pigeon intro, empathetic product tradeoff, the selected give or pentest, one reply CTA, optional P.S.
- Agree with why the product decision is useful before naming the risk it can create.
- Never diagnose their product. Generalize from what Pigeon tests and let the lead verify the point.
- Use at most one plausible consequence in plain language. Never include an attack walkthrough.
- Keep each sentence under 25 words.
- Sound like Daniel typed it in one sitting and read it out loud. Use simple spoken words and contractions.
- Include one natural transition such as "Anyway," "Here's the thing," or "Quick backstory so this makes sense."
- Include one small self-aware aside. It should feel human, not clever.
- No bullets, em dashes, colons, jargon, flattery, or biography dump.
- No mirrored parallel pairs, stacked punchy fragments, mic-drop lines, or landing-page language.
- If a P.S. helps, make it a slightly dumb callback or genuine aside, not a crafted zinger.
- Never use "We've yet to be properly introduced" as a required template. Introduce Daniel only when it helps the flow.

Sign off with exactly:
Best,
Daniel Chalco
Founder, Pigeon

BANNED PHRASES: "the question nobody's asking," "in today's landscape," "at the intersection of," "game-changer," "revolutionize," "unlock," "seamless," "at the end of the day," "I hope this finds you well," "I came across your," "I was impressed by," "I noticed that," "I wanted to reach out," "I'd love to connect," "fascinating intersection," "fascinating attack surface," "fun contrast," "perfect storm," "massive attack surface," "just checking in," "circling back," "wanted to follow up," "bumping this," "inspired by."

Respond with ONLY valid JSON:
{"subject": "...", "body": "...", "evidence_used": ["exact fact copied from VERIFIED EVIDENCE"]}`

export const CUSTOMER_SYSTEM_PROMPT = `You are Daniel Chalco, CEO of Pigeon, writing a first cold email to a SaaS buyer.

${PIGEON_IDENTITY}

${INITIAL_OUTREACH_RULES}
`

export const INVESTOR_SYSTEM_PROMPT = `You are Daniel Chalco, CEO of Pigeon, writing a first cold email to an investor.

${PIGEON_IDENTITY}

Connect Pigeon to a belief, portfolio pattern, or market problem the investor has actually discussed. Do not force a SaaS buyer pitch onto an investor.

${INITIAL_OUTREACH_RULES}`

export const PARTNERSHIP_SYSTEM_PROMPT = `You are Daniel Chalco, CEO of Pigeon, writing a first cold email to a potential partner.

${PIGEON_IDENTITY}

Frame the offer around the useful security outcome their clients or portfolio companies receive. Do not make the partner do work to understand the fit.

${INITIAL_OUTREACH_RULES}`

export const FOLLOWUP_SYSTEM_PROMPT = `You are Daniel Chalco writing a follow-up.

${PIGEON_IDENTITY}

LANGUAGE: Write like you're texting a smart friend. No jargon. No "agentic pentesting," "adversarial inputs," "prompt injection," "data exfiltration," or "attack surface" unless the lead uses those terms first.

CRITICAL: Never invent clients, findings, results, biography, quotes, numbers, employers, hobbies, or life events.
GROUNDING: Treat VERIFIED EVIDENCE and the FULL EMAIL THREAD as a closed book. Do not use facts from training data, old unsourced hooks, assumptions, or likely-sounding biography. Copy every factual detail used in the draft into evidence_used exactly as it appears in VERIFIED EVIDENCE.
===

You have the FULL conversation history, source-linked research, and sometimes STRATEGIC DIRECTION with a specific angle or offer Daniel wants to use.

CORE PRINCIPLE: Every follow-up must deliver or offer VALUE. Never just "check in." Each touchpoint should give them something useful: a relevant insight, a free resource, a case study, a specific finding, or a concrete offer. The reader should think "this person keeps giving me useful stuff" not "this person keeps asking for my time."

PRIORITY ORDER:
1. If STRATEGIC DIRECTION is provided, that IS the email. Build the entire follow-up around that strategy, offer, or angle. Don't just mention it. Make it the core pitch. Write it like Daniel would actually write it: direct, confident, a little provocative, with a clear offer that has teeth.
2. If no strategic direction, use VERIFIED EVIDENCE and the conversation history to write a short, personally specific follow-up that STILL leads with value.

TONE: Direct, confident, slightly provocative. You're a founder making a real offer, not a marketer writing copy. Think bar conversation, not LinkedIn post. Short sentences. No filler.

FORMATTING:
- Start with "Hello [First Name]," or "Hey [First Name]," on its own line.
- End email follow-ups with exactly:
Best,
Daniel Chalco
CEO, Pigeon
- For LinkedIn/Twitter DMs, just "Daniel" or no sign-off.

HARD RULES:
- ABSOLUTELY NO EM DASHES. Never "\u2014" or "\u2013". Use commas, periods, "and", or parentheses. One em dash = rejected.
- BANNED: "just checking in," "circling back," "wanted to follow up," "bumping this," "I hope this finds you well," "in today's landscape," "at the intersection of," "game-changer," "I noticed that," "fascinating intersection," "fascinating attack surface," "fun contrast," "inspired by," "we hack," "we can hack," "we break"
- NEVER paraphrase or quote the strategic direction notes. Rewrite the idea completely in your own words as if you came up with it yourself.
- If they replied, match their energy and length exactly
- Two to four short paragraphs max. Each paragraph 1-2 sentences.
- The email should feel like Daniel dashed it off in 30 seconds because he had a good idea
- Every follow-up MUST contain a value offer (free resource, insight, case study, assessment, finding). No empty asks.

Respond with ONLY valid JSON:
{"subject": "...", "body": "...", "channel": "email|linkedin|twitter", "evidence_used": ["exact fact copied from VERIFIED EVIDENCE"]}`

export function buildInitialUserPrompt(
  lead: Lead,
  ctaStyle: CtaType,
  customContext?: string,
): string {
  const evidence = buildEmailEvidence({ lead, customContext })
  const plan = prepareInitialOutreach({
    lead,
    evidence,
    customContext,
    ctaType: ctaStyle,
  })

  const offerInstruction = plan.offerMode === 'lead_magnet'
    ? `OFFER MODE: ATTACHED LEAD MAGNET
- Offer "${plan.offerName}" as an attachment. Use that exact name.
- It is free, has no signup, and does not require a call.
- Do not say what is inside it or how long it takes unless that statement appears in VERIFIED EVIDENCE or the offer constraints below.
- The final CTA is still the free Pigeon pentest. Ask them to reply if they want it, and state that findings arrive within 48 hours.
- Do not ask permission to send the resource because it is already attached.`
    : `OFFER MODE: FREE PIGEON PENTEST
- Offer Pigeon's free pentest directly. Do not invent or mention a downloadable resource.
- Frame it as a way to verify the product path discussed in the email, never as proof their product is vulnerable.
- Ask them to reply if they want the pentest. State that findings arrive within 48 hours.
- Do not send a calendar link, suggest a meeting time, or hide the offer behind "learn more."`

  return `Write a cold email to ${lead.contact_name}${lead.contact_title ? ` (${lead.contact_title})` : ''} at ${lead.company_name}.

VERIFIED OUTREACH PREP:
${formatInitialOutreachPlan(plan)}

${offerInstruction}

VERIFIED EVIDENCE:
${formatEmailEvidence(evidence)}

Use no recipient or company facts outside that list. Old personal details, SMYKM hooks, battle cards, ICP analysis, and agent memories are intentionally excluded because they are not source-level evidence.`
}

export function buildFollowupUserPrompt(input: {
  lead: Lead;
  emailThread: LeadEmail[];
  followUpNumber: number;
  customContext?: string;
}): string {
  const { lead, emailThread, followUpNumber, customContext } = input
  const sections: string[] = []

  sections.push(`=== LEAD ===
Name: ${lead.contact_name}
Title: ${lead.contact_title || 'Unknown'}
Company: ${lead.company_name}
Type: ${lead.type}
Stage: ${lead.stage}`)

  const evidence = buildEmailEvidence({ lead, customContext, emailThread })
  sections.push(`=== VERIFIED EVIDENCE (closed book) ===
${formatEmailEvidence(evidence)}

Do not add recipient or company facts outside this list and the literal email thread below. Old personal details, SMYKM hooks, battle cards, summaries, and agent memories are intentionally excluded because they are not source-level evidence.`)

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
DANIEL'S NOTES:
${customContext.trim()}`)
  }

  const context = sections.join('\n\n')
  const hasStrategy = customContext?.trim()

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

${hasStrategy ? 'The STRATEGIC DIRECTION above should inform your response angle.' : 'Use verified evidence if it fits naturally. Do not force personalization.'}
${hasStrategy ? 'Length: as long as the strategy needs, but tight.' : 'MAX: 40-60 words.'}`
  }

  if (lead.stage === 'meeting_held') {
    return `${context}

=== TASK: POST-MEETING FOLLOW-UP ===
Send within 24 hours of the meeting. This is NOT a cold follow-up, it's a warm continuation.
${hasStrategy ? 'Length: as long as the strategy needs, but tight.' : '60-100 words. Three short paragraphs max.'}

Structure:
1. Open with energy from the meeting. Reference something specific they said or a moment that stood out. NOT "great meeting you" or "thanks for your time."
2. Deliver on a promise or add new value: send the thing you said you'd send, share a relevant finding, or offer a concrete next step with a deliverable attached. Be specific: what, who, when.
3. Close with a clear, low-friction ask. Always attach value: "I'll have the assessment results by Friday" or "Here's the case study I mentioned."

${hasStrategy ? 'The STRATEGIC DIRECTION above should shape the angle of this follow-up.' : 'Use only details from verified evidence or the literal email thread.'}
- Tone: warm but direct. You're building on momentum, not restarting.
- Do NOT summarize the entire meeting. Pick the one thing that matters most.
- The follow-up should make them feel like working with you is already underway, not like they still need to decide.`
  }

  if (followUpNumber === 1) {
    return `${context}

=== TASK: FOLLOW-UP #1 (Day 4, The Bump + New Insight) ===
${hasStrategy ? 'Length: as long as the strategy needs, but tight.' : '40-70 words. Two to three sentences.'}
- Do NOT reference the original email ("as I mentioned," "following up on my last email"). They know.
${hasStrategy ? '- The STRATEGIC DIRECTION above is your primary angle. Build the whole email around it.' : `- Lead with a useful general risk pattern Pigeon would test. Do not add a statistic, product observation, case study, or completed finding unless it is in VERIFIED EVIDENCE.
- Then connect it to a specific free resource or offer without claiming it came from a completed client assessment.`}
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
      : `Offer a concrete deliverable: a free security assessment outline, a report template, or a checklist for the product path named in VERIFIED EVIDENCE. Mention a case study only if that case study is explicitly present in VERIFIED EVIDENCE.`

    return `${context}

=== TASK: FOLLOW-UP #2 (Day 9, The Value Drop) ===
${hasStrategy ? 'Length: as long as the strategy needs, but tight.' : '40-60 words. Two to three sentences.'}
${typeSpecific}
- Use a different verified detail only if one is available. Do not recycle or invent one.
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
${hasStrategy ? '- The STRATEGIC DIRECTION above is your primary angle.' : `- Drop grounded proof only. Use a verified example from the supplied context, or share a general risk pattern you would test without claiming a completed finding.
- Never invent a completed assessment, client result, or specific vulnerability count. Say "we would test" or "I can send a checklist" unless the fact appears in the thread or lead research.
- One source-linked detail that proves you're not mass-blasting, if one is available.`}
- Offer value, not a meeting. Even the DM should give them something.
- Tone: casual, like you're DMing someone you met at a conference`
  }

  return `${context}

=== TASK: BREAK-UP (Day 21+, The Standing Offer) ===
${hasStrategy ? 'Short but make the offer land. Every word counts.' : '20-35 words. Two to three sentences.'}
- Give them an easy out. Be memorable.
${hasStrategy ? '- Use the STRATEGIC DIRECTION as your final angle.' : `- Leave a STANDING OFFER: something they can take you up on anytime. "If you ever want a free assessment of [their specific agent], the offer stands. No expiration."
- One final source-linked reference if it fits.`}
- Leave the door open without being needy. The standing offer does the work.
- They should feel like they're losing access to something valuable, not being pestered.`
}

interface HumanizedInitialDraft extends EvidenceAwareDraft {
  real_detail_prompts?: string[]
}

const INITIAL_HUMANIZER_SYSTEM_PROMPT = `You edit a grounded cold email so it sounds like Daniel typed it in one sitting.

Do not add content, facts, examples, claims, numbers, links, or offers. Do not make the email longer. Preserve the exact meaning, selected offer, greeting, reply CTA, and sign-off.

Rewrite only what sounds artificial:
- mirrored or parallel sentence pairs
- stacked short fragments used for punch
- tagline or mic-drop closers
- perfectly even paragraph rhythm
- landing-page language
- em dashes or colons
- jokes that sound crafted instead of slightly dumb

Use simple spoken words and contractions. Keep the subject lowercase, boring, and about the recipient. Keep evidence_used exactly unchanged.

Return exactly three short suggestions for where Daniel could later add a true lived detail. Do not insert placeholders into the email itself.

Respond with ONLY valid JSON:
{"subject":"...","body":"...","evidence_used":["exact unchanged facts"],"real_detail_prompts":["...","...","..."]}`

const DEFAULT_REAL_DETAIL_PROMPTS = [
  'After the opening, add the honest reason this product detail caught your attention.',
  'After the Pigeon introduction, add one true lesson from your own security work.',
  'In the P.S., add a real callback you would actually say out loud.',
]

function sameEvidenceClaims(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false
  const sortedLeft = [...left].sort()
  const sortedRight = [...right].sort()
  return sortedLeft.every((claim, index) => claim === sortedRight[index])
}

function normalizeInitialEmailText(value: string): string {
  return normalizeGeneratedEmail(value).replace(/:/g, ',')
}

async function humanizeInitialDraft(input: {
  draft: EvidenceAwareDraft
  evidence: EmailEvidence[]
  plan: InitialOutreachPlan
}): Promise<HumanizedInitialDraft> {
  const { draft, evidence, plan } = input

  try {
    const result = await generateJSON<HumanizedInitialDraft>(
      INITIAL_HUMANIZER_SYSTEM_PROMPT,
      `Clean this draft without changing its facts or offer.

SELECTED OFFER:
${plan.offerName}

DRAFT:
${JSON.stringify(draft, null, 2)}`,
      { temperature: 0.45, maxTokens: 3072 },
    )

    if (
      !result ||
      !sameEvidenceClaims(result.evidence_used, draft.evidence_used) ||
      countWords(result.body) > countWords(draft.body)
    ) {
      return { ...draft, real_detail_prompts: DEFAULT_REAL_DETAIL_PROMPTS }
    }

    validateEvidenceAwareDraft(result, evidence)
    return {
      ...result,
      real_detail_prompts:
        Array.isArray(result.real_detail_prompts) &&
        result.real_detail_prompts.length === 3 &&
        result.real_detail_prompts.every(item => typeof item === 'string' && item.trim())
          ? result.real_detail_prompts.map(item => item.trim())
          : DEFAULT_REAL_DETAIL_PROMPTS,
    }
  } catch {
    return { ...draft, real_detail_prompts: DEFAULT_REAL_DETAIL_PROMPTS }
  }
}

export async function generateInitialOutreach(
  lead: Lead,
  customContext?: string,
): Promise<GeneratedEmail> {
  const systemPromptMap: Record<string, string> = {
    customer: CUSTOMER_SYSTEM_PROMPT,
    investor: INVESTOR_SYSTEM_PROMPT,
    partnership: PARTNERSHIP_SYSTEM_PROMPT,
  }
  const systemPrompt = systemPromptMap[lead.type] || CUSTOMER_SYSTEM_PROMPT
  const evidence = buildEmailEvidence({ lead, customContext })
  const plans: Record<CtaType, InitialOutreachPlan> = {
    mckenna: prepareInitialOutreach({
      lead,
      evidence,
      customContext,
      ctaType: 'mckenna',
    }),
    hormozi: prepareInitialOutreach({
      lead,
      evidence,
      customContext,
      ctaType: 'hormozi',
    }),
  }

  const [mckennaResult, hormoziResult] = await Promise.all([
    generateJSON<EvidenceAwareDraft>(
      systemPrompt,
      buildInitialUserPrompt(lead, 'mckenna', customContext),
      { temperature: 0.95, maxTokens: 4096 }
    ),
    generateJSON<EvidenceAwareDraft>(
      systemPrompt,
      buildInitialUserPrompt(lead, 'hormozi', customContext),
      { temperature: 0.95, maxTokens: 4096 }
    ),
  ])

  const conservativeDraft = (
    ctaType: CtaType,
    plan: InitialOutreachPlan,
  ): EvidenceAwareDraft => {
    const firstName = lead.contact_name.trim().split(/\s+/)[0] || lead.contact_name
    const give = plan.offerMode === 'lead_magnet'
      ? `${plan.offerName} is attached. It's free, and there's no signup or call.`
      : `Here's the thing, the fastest way to settle that question is to test the product path itself.`

    return {
      subject: ctaType === 'mckenna' ? 'a product security question' : 'one useful security check',
      body: `Hi ${firstName},

The useful product paths are usually the ones worth protecting most. They make the product easier to use, and they give security teams more to check.

I'm Daniel, founder of Pigeon. I've spent 14 years breaking into systems, including AI agents.

${give}

Reply here if you want the free pentest. Pigeon will send the findings within 48 hours.

Best,
Daniel Chalco
Founder, Pigeon`,
      evidence_used: [
        'Daniel Chalco has spent 14 years breaking into systems, including AI agents.',
        'Pigeon offers a free pentest and delivers the findings within 48 hours.',
      ],
    }
  }

  const getGroundedDraft = (
    result: EvidenceAwareDraft,
    ctaType: CtaType,
  ): EvidenceAwareDraft => {
    let safeResult = result
    try {
      validateEvidenceAwareDraft(safeResult, evidence)
    } catch (error) {
      if (!(error instanceof UngroundedEmailError)) throw error
      safeResult = conservativeDraft(ctaType, plans[ctaType])
      validateEvidenceAwareDraft(safeResult, evidence)
    }

    return safeResult
  }

  const groundedDrafts: Record<CtaType, EvidenceAwareDraft> = {
    mckenna: getGroundedDraft(mckennaResult, 'mckenna'),
    hormozi: getGroundedDraft(hormoziResult, 'hormozi'),
  }
  const [mckennaHumanized, hormoziHumanized] = await Promise.all([
    humanizeInitialDraft({
      draft: groundedDrafts.mckenna,
      evidence,
      plan: plans.mckenna,
    }),
    humanizeInitialDraft({
      draft: groundedDrafts.hormozi,
      evidence,
      plan: plans.hormozi,
    }),
  ])

  const normalizeResult = (
    result: HumanizedInitialDraft,
    ctaType: CtaType,
  ): EmailVariant => {
    const subject = normalizeInitialEmailText(result.subject).trim().toLowerCase()
    const body = normalizeInitialEmailText(result.body)
    const plan = plans[ctaType]
    return {
      subject,
      body,
      ctaType,
      offerMode: plan.offerMode,
      offerName: plan.offerName,
      realDetailPrompts: result.real_detail_prompts || DEFAULT_REAL_DETAIL_PROMPTS,
      wordCount: countWords(body),
      quality: checkEmailQuality(subject, body, 'initial'),
    }
  }

  return {
    mckenna: normalizeResult(mckennaHumanized, 'mckenna'),
    hormozi: normalizeResult(hormoziHumanized, 'hormozi'),
  }
}

export async function generateFollowupOutreach(input: {
  lead: Lead;
  emailThread: LeadEmail[];
  followUpNumber: number;
  customContext?: string;
}): Promise<{ subject: string; body: string; channel: string; quality: ReturnType<typeof checkEmailQuality>; wordCount: number }> {
  const result = await generateJSON<EvidenceAwareDraft>(
    FOLLOWUP_SYSTEM_PROMPT,
    buildFollowupUserPrompt(input),
    {
      temperature: 0.95,
      maxTokens: 4096,
    },
  )

  validateEvidenceAwareDraft(
    result,
    buildEmailEvidence({
      lead: input.lead,
      customContext: input.customContext,
      emailThread: input.emailThread,
    }),
  )
  const subject = normalizeGeneratedEmail(result.subject)
  const body = normalizeGeneratedEmail(result.body)
  const quality = checkEmailQuality(subject, body, 'follow_up')

  return {
    channel: result.channel || 'email',
    subject,
    body,
    wordCount: countWords(body),
    quality,
  }
}
