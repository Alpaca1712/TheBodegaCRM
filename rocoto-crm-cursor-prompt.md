# ROCOTO COLD EMAIL CRM — CURSOR PROMPT

## WHAT YOU'RE BUILDING

Build me a CRM web application that manages cold email outreach for two audiences: **potential customers** (companies shipping AI agents) and **potential investors** (pre-seed/seed VCs). The system should:

1. Store and manage leads (customers and investors)
2. Research leads and generate personalized cold emails using two proven frameworks
3. Track email pipeline stages from initial email → reply → meeting booked → closed
4. Suggest the next email in the sequence based on where the lead is in the pipeline
5. Integrate with my email to check for replies and update pipeline status

---

## THE COMPANY

**Rocoto** (by artoo) is an autonomous AI agent that hacks other AI agents.

### What Rocoto Does
- Maps the full attack surface of AI agents: prompt injection, jailbreaking, data exfiltration, tool abuse, MCP exploitation
- Attacks continuously across every channel the target agent exposes: voice (via VAPI), SMS (via Twilio), and email (via Resend)
- Every finding is delivered with a reproducible exploit and clear steps to fix it
- Purpose-built for the AI-native threat model from day one

### What Rocoto Is NOT
- It is NOT a traditional pentesting tool that tests web apps for SQL injection and XSS
- It is NOT an open-source checklist scanner like PyRIT, Garak, or Promptfoo
- It does NOT run a static checklist. It probes continuously and chains attacks together the way a real attacker would

### Competitive Positioning
- New wave of AI-powered pentesting companies (like Xbow) are pointing their agents at traditional web app vulnerabilities, not at other AI agents
- Open-source tools require a dedicated security engineer most teams don't have
- Traditional pentest firms could learn this space but it's not their focus

### Roadmap (current vs future)
- TODAY: Rocoto autonomously finds vulnerabilities across the full AI agent attack surface. Every finding comes with a reproducible exploit and actionable remediation guidance. The offensive engine is live and working.
- FUTURE: Closed-loop security platform. Source Code Agent that opens fix PRs automatically. Security Gate that reviews every PR before it ships. Watchtower that monitors production agents in real time. Find → Fix → Prevent → Verify.

### Team
- **Daniel Chalco Lopez — CEO.** Amazon (4 yrs), Offensive Security Engineer. Led penetration testing and red team operations. CPTC 2nd place, 20+ CTFs.
- **David Kim — CTO.** Amazon (4 yrs), Security Engineer. Cloud security architecture, infrastructure hardening, co-architect of Rocoto.
- Both currently at Amazon, raising pre-seed to go full-time
- Based in NYC

### Traction
- First pilot engagement signed with Enduring Labs (agentic AI company building Mason). Going onsite in San Francisco, March 2026.
- Active conversations with prospects across legal AI, EdTech, and developer tools

### Links
- artoo.love
- rocoto.artoo.love
- danielchalco17@gmail.com

---

## EMAIL FRAMEWORK 1: SAM McKENNA's "SHOW ME YOU KNOW ME" (SMYKM)

This is the PRIMARY framework for writing cold emails. Every email the system generates MUST follow these 7 elements:

### Element 1: Subject Line
- Must be something ONLY the recipient would understand
- Should confuse anyone else who sees it
- Often traces the recipient's personal arc or references something specific about them
- Examples:
  - "Jugend Hackt → boring machines → breaking AI agents" (traces Felix Schlegel's career from childhood hackathon → TUM Boring → AI)
  - "Bedford L + breaking AI agents" (references Nick Chirls' studio location by the Bedford L stop in Williamsburg)
  - "4 apps in high school, 0% churn, one bad support ticket" (traces Mads Liechti's journey)
  - "Kensho transcripts → Bark → who's testing the filters?" (traces Georg Kucsko's career arc)
- NEVER use generic subject lines like "Quick question" or "Partnership opportunity"

### Element 2: Opener — Tie to Subject Line
- First line must connect to the subject line
- Use this exact template: "We've yet to be properly introduced. I'm Daniel Chalco, co-founder of Rocoto."
- That's approximately 14 words. It tells them who you are immediately.
- The psychology: "I don't know this person, but they seem to know something about me. Maybe we should be introduced."

### Element 3: Show Your Homework (The SMYKM Signal)
- Reference something specific you found in your research that shows deep homework
- This should NOT be from their LinkedIn headline or company About page
- Good sources: personal blog posts, GitHub contributions, specific product features, technical blog posts, podcast appearances, old projects
- Examples:
  - "I read your prompt design blog post and you can tell you and Anker are thinking really carefully about how Parahelp reasons through tickets."
  - "I noticed you added a fake classifier to Bark, which tells me you're already thinking about adversarial risks."
  - "Your courage post hit home. You wrote that every VC reads the same books, applies the same heuristics, and drowns in a sea of sameness."

### Element 4: The Transition to Your Pitch
- Bridge from their world to the problem you solve
- Do NOT explain what your product does. Explain the challenge THEY face.
- Surface a specific vulnerability or risk that is unique to THEIR product/company
- McKenna says: "The majority of sales emails tell readers what their company does rather than the challenges they solve."

### Element 5: Value Proposition (Challenge-Based)
- Frame Rocoto in terms of the specific problem it solves for THIS recipient
- Customize the attack surface description to match their product
- Examples by target type:
  - Support agent (Parahelp): "The support ticket is the attack surface" — user-generated text goes into the agent which then processes refunds, accesses customer data
  - AI assistant (Poke): "The iMessage thread is the attack surface" — agent reads emails, pays invoices, reschedules meetings through messaging channels an attacker would use
  - Music AI (Suno): "The content filters are the attack surface" — guardrails blocking copyrighted content are enforced through prompt-level controls that prompt injection breaks
  - For INVESTORS: Mirror their investment thesis back to them and show how Rocoto fits

### Element 6: The CTA (Call to Action)
- NEVER suggest a specific day or time
- NEVER send a calendar link (too pushy, asks them to do extra work)
- Give the buyer agency by asking when THEY are available
- Two CTA styles to offer:

**McKenna-style (sell the conversation):**
"If you're open to it, I'd love to show you what we find when we point Rocoto at [their specific product]. Let me know what works for you and I'll send over a calendar invite."

**Hormozi-style (lead with value):**
"I put together a short breakdown of how [specific attack vector relevant to them]. Want me to send it your way?"

The Hormozi CTA is a smaller ask (just say "sure, send it") and works better for cold leads. The McKenna CTA is more direct and gets closer to a meeting.

### Element 7: Sign-Off
- Simple. No niceties.
- "Daniel Chalco" + "rocoto.artoo.love" (for customers) or "artoo.love" (for investors)
- NO "Best regards," NO "Looking forward to hearing from you," NO "Thanks for your time"

### SMYKM Rules Summary
- NO generic niceties upfront
- NO calendar links
- NO "I hope this email finds you well"
- Under 200 words of substance (ideally under 150)
- NO em dashes (use commas, periods, or "and" instead)
- NO phrases that sound AI-generated: "the question nobody's asking," "in today's landscape," "at the intersection of," "it's not just X, it's Y"
- Write like a human founder emailing another human founder. Casual, direct, no polish.
- Quality over quantity: 20 perfect emails per week beats 200 generic ones

---

## EMAIL FRAMEWORK 2: ALEX HORMOZI's COLD OUTREACH ($100M LEADS)

Use Hormozi's framework to complement SMYKM, especially for follow-ups and lead magnets.

### Core Hormozi Principles for Cold Outreach

1. **Lead with value, not a meeting request.** Hormozi's CTA in cold outreach points to a free resource (lead magnet) that demonstrates value. Give something valuable before asking for time.

2. **The lead magnet strategy.** Hormozi says: "Your lead magnet should be valuable enough on its own that you could charge for it." For Rocoto, lead magnets include:
   - Free AI agent threat assessment (automated scan of their public-facing agent)
   - Short breakdown of how [specific attack vector] works against [their type of agent]
   - Case study from the Enduring Labs engagement (once completed)
   - System prompt analyzer results
   - Prompt injection scan results

3. **Write below a 3rd grade reading level.** Hormozi found that rewriting cold outreach at a simpler reading level got 50% more responses. Avoid jargon when possible. Use "hacks" not "red-teams." Use "tricks the agent" not "exploits the reasoning layer." Exception: when writing to deeply technical recipients, specificity builds credibility.

4. **ACA Framework for warm follow-ups** (Acknowledge → Compliment → Ask):
   - Acknowledge: Mirror back what they said
   - Compliment: Tie it to a positive character trait
   - Ask: Lead the conversation toward your offer
   - Example: They reply "yeah security is something we've been thinking about" → "That's smart, most teams don't think about it until something breaks. (Acknowledge + Compliment) Would it be useful if I sent over a quick breakdown of the most common attack patterns we see against support agents? (Ask)"

5. **Good CTAs have two things:** (1) what to do and (2) reasons to do it right now.

6. **Multi-channel momentum.** Don't rely on one email. Follow up across channels: email, then LinkedIn DM, then Twitter DM.

### Hormozi Lead Magnet Types (applied to Rocoto)
1. **Reveal a problem they didn't know they had:** Free threat scan of their public agent that shows specific vulnerabilities
2. **Free trial/sample:** Limited free offensive engagement against one of their agents
3. **Step 1 of a multi-step process:** "Here's a breakdown of the 5 most common ways AI agents get manipulated" (Step 1). Full engagement is the paid offer.

---

## CRM DATA MODEL

### Lead Object
```
{
  id: string,
  type: "customer" | "investor",
  company_name: string,
  product_name: string, // what they're building (for customers)
  fund_name: string, // fund name (for investors)
  contact_name: string,
  contact_title: string,
  contact_email: string,
  contact_twitter: string,
  contact_linkedin: string,
  
  // Research fields
  company_description: string, // what they do
  attack_surface_notes: string, // how their product is vulnerable (customers)
  investment_thesis_notes: string, // what they invest in and why (investors)
  personal_details: string, // blog posts, podcast quotes, GitHub activity, personal story
  smykm_hooks: string[], // specific details that only they would recognize
  
  // Pipeline
  stage: "researched" | "email_drafted" | "email_sent" | "replied" | "meeting_booked" | "meeting_held" | "follow_up" | "closed_won" | "closed_lost" | "no_response",
  
  // Email history
  emails: [
    {
      id: string,
      type: "initial" | "follow_up_1" | "follow_up_2" | "follow_up_3" | "reply_response" | "meeting_request" | "lead_magnet",
      subject: string,
      body: string,
      sent_at: timestamp,
      replied_at: timestamp | null,
      reply_content: string | null,
      cta_type: "mckenna" | "hormozi",
    }
  ],
  
  // Metadata
  source: string, // how we found them
  priority: "high" | "medium" | "low",
  notes: string,
  created_at: timestamp,
  updated_at: timestamp,
}
```

### Pipeline Stages & Next Actions

| Stage | Description | Next Action |
|-------|-------------|-------------|
| researched | Lead info gathered, research complete | Draft initial SMYKM email |
| email_drafted | Email written, ready to review | Review and send |
| email_sent | Initial email sent | Wait 3-5 days, then follow up |
| replied | They replied (positive or neutral) | Use ACA framework to respond. If they asked for more info, send memo or lead magnet. If they want to meet, book it. |
| meeting_booked | Meeting scheduled | Prep SMYKM research for the call. Know their product deeply. |
| meeting_held | Meeting completed | Send follow-up within 24 hours with next steps |
| follow_up | In active follow-up sequence | Continue Hormozi multi-channel follow-up |
| closed_won | Deal done (pilot signed or investment committed) | Onboard / close |
| closed_lost | Not interested | Archive, revisit in 3 months |
| no_response | No reply after full follow-up sequence | Move to next channel (LinkedIn, Twitter) or archive |

---

## FOLLOW-UP SEQUENCE (McKenna + Hormozi Hybrid)

### For Customers

**Day 0: Initial SMYKM Email**
- Full SMYKM framework as described above
- CTA: Either McKenna-style (show you what we find) or Hormozi-style (send a free breakdown)

**Day 4: Follow-Up 1 — The Bump**
- Short. 2-3 sentences max.
- Reference the original email. Add one new piece of value.
- Example: "Hey [Name], wanted to bump this up in your inbox. Since I sent this, we actually found a new attack pattern against [type of agent they build] that I think you'd find interesting. Happy to share if you're curious."

**Day 9: Follow-Up 2 — Lead Magnet Drop**
- Don't ask for a meeting. Just deliver value.
- Example: "Hey [Name], I put together a one-page breakdown of the top 3 ways [their type of agent] can be manipulated through [their specific input channel]. No strings attached — just thought it'd be useful given what you're building. Want me to send it over?"

**Day 14: Follow-Up 3 — Channel Switch**
- Move to LinkedIn or Twitter DM
- Much shorter. Reference the email.
- Example DM: "Hey [Name], I sent you a note about AI agent security a couple weeks ago. Didn't want to be annoying in your inbox but thought this might be a better channel. We're finding some really interesting vulnerabilities in [their type of agent]. Happy to share what we're seeing if you're curious."

**Day 21+: Break-Up Email (McKenna style)**
- Last email. Give them an easy out.
- Example: "Hey [Name], I've reached out a couple of times and I know you're busy. If AI agent security isn't a priority right now, totally understand. If it ever becomes one, I'm easy to find. Cheers, Daniel"

### For Investors

**Day 0: Initial SMYKM Email**
- Same SMYKM framework but tailored to their investment thesis
- Reference their blog posts, portfolio companies, stated beliefs about what they look for
- CTA: "Would you have time in the next couple of weeks to chat? Happy to work around your schedule."

**Day 4: Follow-Up 1 — The Bump + Traction Update**
- Short bump + any new traction
- Example: "Hey [Name], bumping this up. Since I sent this we [new development — new pilot, new finding, new customer conversation]. Would love to tell you about it."

**Day 9: Follow-Up 2 — Memo Drop**
- Send the investor memo (the one-page Amazon-style doc we built)
- Example: "Hey [Name], I put together a one-page memo on what we're building. Figured it might be easier than a cold email to get a feel for the opportunity. [Attach memo] Happy to go deeper on anything."

**Day 14: Follow-Up 3 — Channel Switch to Twitter/LinkedIn**
- Same as customer sequence

**Day 21+: Break-Up Email**
- Same as customer sequence

---

## EMAIL GENERATION PROMPTS

When the user clicks "Generate Email" for a lead, use the following prompts depending on the stage and audience:

### Prompt: Generate Initial SMYKM Email (Customer)

```
You are writing a cold email from Daniel Chalco, co-founder of Rocoto, to a potential customer. Rocoto is an autonomous AI agent that hacks other AI agents.

Follow Sam McKenna's "Show Me You Know Me" framework exactly:

1. SUBJECT LINE: Write a subject line that ONLY the recipient would understand. It should trace their personal arc, reference a specific detail from their background, or connect something personal to the business problem. It should confuse anyone else.

2. OPENER: Start with "We've yet to be properly introduced. I'm Daniel Chalco, co-founder of Rocoto. My co-founder David and I build autonomous AI agent security."

3. SMYKM SIGNAL: Reference something specific from the research that shows deep homework. This should NOT be from their LinkedIn headline. Use blog posts, GitHub activity, specific product features, podcast quotes, old projects.

4. THE PROBLEM (their problem, not yours): Describe the specific way THEIR product is vulnerable. Be concrete. Name the tools their agent connects to, the channels it operates on, the data it accesses. The more specific, the more credible.

5. ROCOTO (brief): Describe Rocoto in 2-3 sentences max. "Rocoto is an AI agent that hacks other AI agents. It attacks through the same channels your customers use and finds exactly where the agent can be manipulated. Every finding comes with a reproducible exploit and clear steps to fix it."

6. CTA: Use one of these two styles:
   - McKenna: "If you're open to it, I'd love to show you what we find when we point Rocoto at [their product]. Let me know what works for you and I'll send over a calendar invite."
   - Hormozi: "I put together a short breakdown of how [specific attack relevant to them]. Want me to send it your way?"

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

LEAD RESEARCH:
{lead.company_description}
{lead.product_name}
{lead.attack_surface_notes}
{lead.personal_details}
{lead.smykm_hooks}
```

### Prompt: Generate Initial SMYKM Email (Investor)

```
You are writing a cold email from Daniel Chalco, co-founder of Rocoto, to a potential investor. Rocoto is an autonomous AI agent that hacks other AI agents.

Follow Sam McKenna's "Show Me You Know Me" framework:

1. SUBJECT LINE: Reference something specific about this investor that only they would recognize. Their personal story, a blog post they wrote, a specific belief they've expressed, a portfolio company, their office location. It should confuse anyone else.

2. OPENER: "We've yet to be properly introduced. I'm Daniel Chalco, co-founder of Rocoto. My co-founder David and I are building autonomous AI agent security out of NYC."

3. SMYKM SIGNAL: Reference their investment thesis, a specific blog post, or something they've said publicly that connects to what Rocoto does. Mirror their language and beliefs back to them.

4. THE PITCH: Connect Rocoto to their worldview. If they care about "founders as artists," frame it that way. If they care about technical depth, lead with the tech. Match their energy.

5. BRIEF TRACTION: "We're both at Amazon now on the offensive security team, building Rocoto on the side, and going full-time [month]. We've signed our first pilot with Enduring Labs, an agentic AI company."

6. CTA: "Would you have time in the next couple of weeks to chat? Happy to work around your schedule." (McKenna says: never suggest a specific day/time, never send a calendar link, give the buyer agency)

7. SIGN-OFF: "Daniel Chalco" + "artoo.love"

RULES: Same as customer emails. Under 200 words. No AI slop. Casual and human.

INVESTOR RESEARCH:
{lead.fund_name}
{lead.investment_thesis_notes}
{lead.personal_details}
{lead.smykm_hooks}
```

### Prompt: Generate Follow-Up Email

```
You are writing a follow-up email from Daniel Chalco. This is follow-up #{follow_up_number} in the sequence.

Context:
- Original email was sent on {original_email.sent_at}
- Original subject: {original_email.subject}
- Original body: {original_email.body}
- Any reply received: {reply_content or "No reply"}
- Lead type: {lead.type}
- Lead stage: {lead.stage}

If this is follow-up #1 (Day 4):
- Keep it to 2-3 sentences
- Reference the original email
- Add one new piece of value or a new development
- Don't repeat the pitch

If this is follow-up #2 (Day 9):
- Lead with a free lead magnet (Hormozi approach)
- Don't ask for a meeting. Just offer value.
- "I put together a [specific resource]. No strings attached. Want me to send it over?"

If this is follow-up #3 (Day 14):
- This should be written for LinkedIn DM or Twitter DM
- Much shorter. 2-3 sentences.
- Reference that you emailed them. Acknowledge they're busy.
- Offer value, not a meeting.

If this is the break-up email (Day 21+):
- Give them an easy out
- "If this isn't a priority right now, totally understand. If it ever becomes one, I'm easy to find."

If they REPLIED and you're responding:
- Use Hormozi's ACA framework: Acknowledge what they said, Compliment something about it, Ask a question that moves toward next steps
- If they asked for more info: send the one-page memo (investor) or a specific breakdown of their vulnerabilities (customer)
- If they said "let's chat": suggest they pick a time. "What works for you? I'll send over an invite."
- If they said "not right now": thank them, leave the door open, move to follow_up stage
- Keep it SHORT. Match the length and energy of their reply.

RULES:
- Reply on the same thread (Re: original subject)
- No em dashes
- No AI slop
- Shorter than the original email
- Human and casual
```

---

## FEATURES TO BUILD

### Dashboard
- Pipeline view showing all leads by stage (kanban style)
- Separate views for Customers and Investors
- Count of leads at each stage
- Emails sent this week, replies received, meetings booked

### Lead Management
- Add new lead (manual entry)
- Import from CSV
- Research assistant: when adding a lead, auto-populate fields by searching their website, LinkedIn, blog, GitHub, Twitter
- Edit lead details at any time

### Email Generation
- "Generate Email" button on each lead
- Shows 2 variants (McKenna CTA and Hormozi CTA) side by side
- User can edit before sending
- "Regenerate" button if they don't like the output

### Email Tracking
- Log when emails are sent
- Check for replies (integrate with Gmail API)
- Auto-update lead stage when reply detected
- Show full email thread for each lead

### Follow-Up Suggestions
- Dashboard notification: "3 leads need follow-up today"
- Auto-suggest which follow-up type based on days since last email
- One-click generate for follow-up emails

### Analytics
- Open rate, reply rate, meeting conversion rate
- Which subject line patterns work best
- Average time from initial email to meeting booked
- Pipeline velocity by lead source

---

## TECH STACK SUGGESTIONS
- Frontend: React + Tailwind (or Next.js)
- Backend: Node.js or Python (FastAPI)
- Database: PostgreSQL or Supabase
- AI: Anthropic Claude API for email generation (use the prompts above as system prompts)
- Email: Gmail API for send/receive tracking
- Auth: Clerk or NextAuth

---

## IMPORTANT NOTES
- Every email must feel like a human wrote it. If it sounds like AI, it fails.
- The SMYKM research is the most important part. A perfectly structured email with generic research is worse than a rough email with deep, specific homework.
- The system should make it EASY to do research and HARD to skip it. Don't let the user generate an email without filling in the research fields first.
- Always generate 2 variants for initial emails. Let the user pick.
- The follow-up sequence is not optional. The system should nag the user to follow up on time.
