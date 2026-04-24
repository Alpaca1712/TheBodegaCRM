import { generateJSON } from '@/lib/ai/anthropic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, rateLimitResponse } from '@/lib/api/auth-guard'
import { checkEmailQuality, countWords } from '@/lib/ai/quality'

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
    icp_score: z.number().optional().nullable(),
    icp_reasons: z.array(z.string()).optional().default([]),
    battle_card: z.record(z.unknown()).optional().nullable(),
    stage: z.enum(['researched', 'email_drafted', 'email_sent', 'replied', 'meeting_booked', 'meeting_held', 'follow_up', 'closed_won', 'closed_lost', 'no_response']),
    conversation_summary: z.string().optional().nullable(),
    conversation_next_step: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  }),
  emailThread: z.array(emailSchema).optional().default([]),
  followUpNumber: z.number().int().min(1).max(4),
  customContext: z.string().optional().default(''),
})

const SYSTEM_PROMPT = `You are Daniel Chalco writing a follow-up.

=== ABOUT ROCOTO (use ONLY these facts, never invent capabilities or results) ===
What Rocoto does: We try to break AI agents before bad actors do. Think of it like hiring a burglar to test your locks, but for AI.

How it works: We talk to AI agents the same way their users do (email, text, chat, voice, Slack) and try to get them to do things they shouldn't.

What we find: We find ways to take over AI agents, pull out private data, change how they behave, and get around their safety rules. Then we help the company fix everything.

Real results: We worked with Mason, a company whose AI agent helps property managers. We took over their agent through its normal customer channels. Then we helped them fix every issue.

Team: Daniel Chalco (CEO) and David (co-founder). Both on Amazon's offensive security team.

LANGUAGE: Write like you're texting a smart friend. No jargon. No "agentic pentesting," "adversarial inputs," "prompt injection," "data exfiltration," or "attack surface" unless the lead uses those terms first.

CRITICAL: Only reference the Mason pilot as a real result. Do NOT invent other clients or results.
===

You have the FULL conversation history, deep research, SMYKM hooks, and sometimes STRATEGIC DIRECTION with a specific angle or offer Daniel wants to use.

CORE PRINCIPLE: Every follow-up must deliver or offer VALUE. Never just "check in." Each touchpoint should give them something useful: a relevant insight, a free resource, a case study, a specific finding, or a concrete offer. The reader should think "this person keeps giving me useful stuff" not "this person keeps asking for my time."

PRIORITY ORDER:
1. If STRATEGIC DIRECTION is provided, that IS the email. Build the entire follow-up around that strategy, offer, or angle. Don't just mention it. Make it the core pitch. Write it like Daniel would actually write it: direct, confident, a little provocative, with a clear offer that has teeth.
2. If no strategic direction, use SMYKM hooks and the conversation history to write a short, personally specific follow-up that STILL leads with value (a new insight, a relevant article, a finding about their product, a case study of a similar company).

WHAT GOOD LOOKS LIKE (when given strategic direction like "free pentest, Amalfi affair style"):
"Hey Nick,

If your pentest vendor sucks, why not have some fun and cheat on them with us.

Till the end of the month, show us a pentest report from the last six months and we'll waive our fee entirely for one AI agent scan. If we find nothing critical or you hate the report, you owe us nothing.

Got a recent report and an AI agent in production?

Best,
Daniel Chalco
CEO of Rocoto"

WHAT GOOD LOOKS LIKE (value drop without strategic direction):
"Hey Sarah,

We just published a breakdown of the top 5 prompt injection patterns hitting legal AI tools this quarter. Two of them are specific to contract analysis agents like yours.

Happy to send it over if useful. No strings.

Best,
Daniel Chalco
CEO of Rocoto"

Notice: both examples lead with something the reader GETS, not something the reader has to GIVE (their time). THAT is the bar.

WHAT BAD LOOKS LIKE:
"Just wanted to circle back on my last email. Would love to find time to chat about how Rocoto can help."

That's bad because there's zero value. It's asking for time without offering anything new.

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
- BANNED: "just checking in," "circling back," "wanted to follow up," "bumping this," "I hope this finds you well," "in today's landscape," "at the intersection of," "game-changer," "I noticed that," "fascinating intersection," "inspired by," "we hack," "we can hack," "we break"
- NEVER paraphrase or quote the strategic direction notes. Rewrite the idea completely in your own words as if you came up with it yourself.
- If they replied, match their energy and length exactly
- Two to four short paragraphs max. Each paragraph 1-2 sentences.
- The email should feel like Daniel dashed it off in 30 seconds because he had a good idea
- Every follow-up MUST contain a value offer (free resource, insight, case study, assessment, finding). No empty asks.

Respond with ONLY valid JSON:
{"subject": "...", "body": "...", "channel": "email|linkedin|twitter"}`

function buildFullContext(input: z.infer<typeof requestSchema> & { memories?: Array<{ memory_type: string; content: string }> }): string {
  const { lead, emailThread, followUpNumber, customContext } = input
  const bc = lead.battle_card as {
    our_angle?: string; their_product?: string; competitive_landscape?: string[];
  } | null;

  const sections: string[] = []

  sections.push(`=== LEAD ===
Name: ${lead.contact_name}
Title: ${lead.contact_title || 'Unknown'}
Company: ${lead.company_name}
Type: ${lead.type}
Stage: ${lead.stage}${lead.icp_score ? `\nICP Score: ${lead.icp_score}/100` : ''}${lead.icp_reasons?.length ? `\nICP Reasons: ${lead.icp_reasons.join(', ')}` : ''}`)

  if (lead.icp_score != null) {
    sections.push(`=== GTM FIT ===
ICP Score: ${lead.icp_score}/100
Reasons: ${lead.icp_reasons.join('; ')}`)
  }

  if (bc?.our_angle) {
    sections.push(`=== STRATEGIC GTM ANGLE (Use this to shape the pitch) ===\n${bc.our_angle}`)
  }

  if (lead.company_description) {
    sections.push(`=== COMPANY ===\n${lead.company_description}`)
  }

  if (bc?.our_angle || bc?.their_product) {
    sections.push(`=== BATTLE CARD / STRATEGY ===
${bc.our_angle ? `OUR ANGLE: ${bc.our_angle}\n` : ''}${bc.their_product ? `PRODUCT INTEL: ${bc.their_product}` : ''}`)
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

  const bc = lead.battle_card as Record<string, unknown> | null;
  if (bc || lead.icp_score != null) {
    const techStack = bc?.tech_stack as string[] | undefined;
    const competitiveLandscape = bc?.competitive_landscape as string[] | undefined;
    const strategy = [
      lead.icp_score != null && `ICP Score: ${lead.icp_score}/100`,
      lead.icp_reasons?.length && `ICP Fit Reasons: ${lead.icp_reasons.join(', ')}`,
      bc?.our_angle && `STRATEGIC ANGLE: ${bc.our_angle}`,
      bc?.their_product && `PRODUCT INTEL: ${bc.their_product}`,
      techStack?.length && `TECH STACK: ${techStack.join(', ')}`,
      competitiveLandscape?.length && `COMPETITIVE LANDSCAPE: ${competitiveLandscape.join('; ')}`,
    ].filter(Boolean).join('\n');
    if (strategy) sections.push(`=== GTM STRATEGY & INTEL ===\n${strategy}`);
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

  if (input.memories?.length) {
    sections.push(`=== AGENT MEMORIES (facts from past interactions, use for deeper personalization) ===\n${input.memories.map(m => `- [${m.memory_type}] ${m.content}`).join('\n')}`)
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
INSTRUCTIONS: Below are Daniel's notes. They might be a strategy description, an example email to a different person, a link, or raw ideas. Your job:
1. Extract the CORE STRATEGY or OFFER from these notes (e.g. "free pentest if we find nothing" or "cheat on your current vendor" angle).
2. Apply that strategy to THIS lead (${lead.contact_name} at ${lead.company_name}), using THEIR specific product, attack surface, and situation.
3. Write a completely original email. Do NOT copy any sentences from the notes. Do NOT reference the notes. The recipient must never know these notes existed.
4. If the notes contain an example email to someone else, extract the strategy and rewrite it for this person. Do NOT reuse any phrasing.

DANIEL'S NOTES:
${customContext.trim()}`)
  }

  const context = sections.join('\n\n')

  const hasStrategy = customContext?.trim()
  const lengthNote = hasStrategy
    ? 'Length: as long as the strategy needs, but no filler. Every sentence earns its place. Your example email was ~90 words and that was perfect.'
    : ''

  // Stage-driven routing: the frontend explicitly sets lead.stage to 'replied' or 'meeting_held'
  // when the user picks reply_needed or post_meeting mode. This prevents the old bug where
  // ANY inbound email in the thread would hijack the prompt into "THEY REPLIED" mode
  // even when the user wanted a cold follow-up sequence step.

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

export async function POST(request: NextRequest) {
  try {
    const guard = await requireUser()
    if (guard instanceof NextResponse) return guard
    const limited = rateLimitResponse(guard.user.id, 'ai:generate-followup', {
      limit: 20,
      windowMs: 60_000,
    })
    if (limited) return limited
    const supabase = guard.supabase

    const body = await request.json()
    const validation = requestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      )
    }

    // Fetch agent memories for progressive personalization
    let memories: Array<{ memory_type: string; content: string }> = []
    if (validation.data.lead.id) {
      try {
        const { data } = await supabase
          .from('agent_memory')
          .select('memory_type, content')
          .eq('lead_id', validation.data.lead.id)
          .order('relevance_score', { ascending: false })
          .limit(10)
        memories = data || []
      } catch {
        // Non-critical
      }
    }

    const fullContext = buildFullContext({ ...validation.data, memories })
    const hasCustomContext = !!validation.data.customContext?.trim()

    console.log('[Follow-up] customContext present:', hasCustomContext, 'length:', validation.data.customContext?.length || 0)

    const result = await generateJSON<{
      subject: string
      body: string
      channel: 'email' | 'linkedin' | 'twitter'
    }>(SYSTEM_PROMPT, fullContext, {
      temperature: 0.95,
      maxTokens: 4096,
    })

    const stripEmDashes = (text: string) => text.replace(/[\u2013\u2014]/g, ',')
    result.subject = stripEmDashes(result.subject)
    result.body = stripEmDashes(result.body)

    const quality = checkEmailQuality(result.subject, result.body, 'follow_up')

    return NextResponse.json({
      ...result,
      wordCount: countWords(result.body),
      quality,
    })
  } catch (error) {
    console.error('Generate follow-up error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate follow-up' },
      { status: 500 }
    )
  }
}
