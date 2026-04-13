import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateCompletion } from '@/lib/ai/anthropic'
import { z } from 'zod'

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function getFollowUpPosition(stage: string, emailsOut: number): string {
  if (stage === 'researched' || stage === 'email_drafted') return 'Pre-outreach'
  if (stage === 'email_sent' && emailsOut <= 1) return 'Initial email sent (awaiting reply)'
  if (emailsOut === 2) return 'Follow-up #1 sent (Day 4 bump)'
  if (emailsOut === 3) return 'Follow-up #2 sent (Day 9 value drop)'
  if (emailsOut === 4) return 'Follow-up #3 sent (Day 14 channel switch)'
  if (emailsOut >= 5) return 'Break-up territory (Day 21+)'
  return `${emailsOut} emails sent`
}

function getStageAdvice(stage: string): string {
  const advice: Record<string, string> = {
    researched: 'First email must be hyper-personalized with SMYKM hooks. Lead with value, not threats. Offer something free.',
    email_drafted: 'Review the draft against SMYKM and Hormozi frameworks. Does it lead with value? Is the CTA specific?',
    email_sent: 'Wait 3-4 days before follow-up #1. Do NOT bump early. When you do follow up, lead with NEW value, not "just checking in."',
    replied: 'Match their energy and length exactly. If they want info, send a specific deliverable. If they want a meeting, confirm with a low-friction CTA.',
    meeting_booked: 'Prepare by reviewing their attack surface notes and SMYKM hooks. Have a concrete finding or offer ready for the meeting.',
    meeting_held: 'Send follow-up within 24 hours. Reference a specific moment from the meeting. Attach a deliverable you promised.',
    follow_up: 'Each touchpoint must deliver NEW value. Never just "check in." Offer an insight, case study, or free resource.',
    no_response: 'Consider a channel switch (LinkedIn DM or Twitter). Leave a standing offer with no expiration.',
    closed_won: 'Celebrate. Set up onboarding and first deliverable timeline.',
    closed_lost: 'Add to re-engagement list for 3-6 months. Respect their decision.',
  }
  return advice[stage] || ''
}

const requestSchema = z.object({
  question: z.string().min(1),
  leadId: z.string().uuid().optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().default([]),
})

const SYSTEM_PROMPT = `You are the Rocoto CRM Co-pilot, an elite AI sales strategist.

ABOUT ROCOTO (use ONLY these facts):
What Rocoto does: We try to break AI agents before bad actors do. We talk to AI agents the same way their users do (email, text, chat, voice, Slack) and try to get them to do things they shouldn't.
What we find: Ways to take over AI agents, pull out private data, change how they behave, and get around their safety rules. Then we help fix everything.
Real results: Worked with Mason (AI agent for property managers). Took over their agent through its customer channels. Helped them fix everything.
Team: Daniel Chalco (CEO) and David (co-founder). Both on Amazon's offensive security team.

You have full access to CRM data. Use it aggressively.

PERSONALITY:
- Direct, specific, actionable. No fluff. No generic advice.
- You are a world-class SDR coach who knows the McKenna SMYKM and Hormozi $100M Leads frameworks deeply.
- You always reference specific data points from the CRM (names, days, email counts, stages).
- You suggest the NEXT concrete action, not just information.
- You flag urgency and timing issues proactively.
- When the context includes a TIMING ALERT, address it immediately.

RULES:
- If asked about a specific lead, lead with the most urgent insight (timing, stage position, missed opportunity).
- If asked about pipeline/strategy, prioritize the NEEDS IMMEDIATE ATTENTION and READY FOR FOLLOW-UP sections.
- Keep answers concise (2-5 sentences for simple questions, more for complex strategy).
- No em dashes. Use commas or periods.
- When suggesting email copy, follow the SMYKM format exactly.
- Cite specific data: "You sent 3 emails to Nick at Mason, last one 9 days ago" not vague references.
- When a lead is going stale, be direct about it. "This lead is dying. Here's how to revive it."
- For follow-up suggestions, reference which step in the sequence they're on and what VALUE to lead with.
- NEVER invent capabilities, clients, or results not listed above.
- If asked to draft copy, write it in Daniel's voice: short sentences, simple words, no jargon, no em dashes.`

function getSuggestedPrompts(leadId: string | undefined, context: string): string[] {
  if (!leadId) {
    return [
      'What needs my attention today?',
      'Which leads are going stale?',
      'Who should I follow up with?',
      'How is my pipeline health?',
    ]
  }

  const prompts: string[] = []

  // Stage-aware suggestions
  if (context.includes('TIMING ALERT: URGENT')) {
    prompts.push('Draft a reply for this lead')
    prompts.push('What should I say in my response?')
  } else if (context.includes('TIMING ALERT: Ready for Follow-up')) {
    prompts.push('Draft follow-up #1 with a value angle')
    prompts.push('What SMYKM hook should I use?')
  } else if (context.includes('TIMING ALERT: WARNING')) {
    prompts.push('Draft my post-meeting follow-up')
    prompts.push('What should I reference from the meeting?')
  } else if (context.includes('GOING STALE')) {
    prompts.push('How do I revive this lead?')
    prompts.push('Draft a LinkedIn DM to reconnect')
  }

  // Always-available suggestions
  if (prompts.length < 4) {
    prompts.push('What should my next move be?')
  }
  if (prompts.length < 4) {
    prompts.push('Grade my outreach so far')
  }
  if (prompts.length < 4 && context.includes('SMYKM hooks')) {
    prompts.push('Which SMYKM hook is strongest?')
  }
  if (prompts.length < 4) {
    prompts.push('Draft a follow-up email')
  }

  return prompts.slice(0, 4)
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
      return NextResponse.json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 })
    }

    const { question, leadId, conversationHistory } = validation.data

    let context = ''

    if (leadId) {
      // Verify lead ownership first
      const { data: leadCheck } = await supabase
        .from('leads')
        .select('id')
        .eq('id', leadId)
        .eq('user_id', user.id)
        .single()

      if (!leadCheck) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
      }

      const [leadResult, emailsResult, interactionsResult, memoriesResult] = await Promise.all([
        supabase.from('leads').select('*').eq('id', leadId).eq('user_id', user.id).single(),
        supabase.from('lead_emails').select('subject, body, direction, email_type, created_at, sent_at, replied_at').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(15),
        supabase.from('lead_interactions').select('channel, interaction_type, content, summary, occurred_at').eq('lead_id', leadId).order('occurred_at', { ascending: false }).limit(10),
        supabase.from('agent_memory').select('memory_type, content, relevance_score').eq('lead_id', leadId).order('relevance_score', { ascending: false }).limit(15),
      ])

      if (leadResult.data) {
        const lead = leadResult.data
        const daysSinceContact = daysSince(lead.last_contacted_at)
        const daysSinceReply = daysSince(lead.last_inbound_at)
        const followUpPos = getFollowUpPosition(lead.stage, lead.total_emails_out || 0)
        const stageAdvice = getStageAdvice(lead.stage)

        // Timing urgency
        let timingAlert = ''
        if (lead.stage === 'replied' && daysSinceReply !== null && daysSinceReply > 1) {
          timingAlert = `URGENT: They replied ${daysSinceReply} day(s) ago and you haven't responded. Reply ASAP.`
        } else if (lead.stage === 'meeting_held' && daysSinceContact !== null && daysSinceContact > 1) {
          timingAlert = `WARNING: Meeting was ${daysSinceContact} day(s) ago. Post-meeting follow-up should go out within 24 hours.`
        } else if (lead.stage === 'email_sent' && daysSinceContact !== null && daysSinceContact >= 4) {
          timingAlert = `Ready for Follow-up #1. It's been ${daysSinceContact} days since initial email. Lead with new value.`
        } else if (lead.stage === 'email_sent' && daysSinceContact !== null && daysSinceContact < 3) {
          timingAlert = `Too early to follow up. Wait until day 4. It's been ${daysSinceContact} day(s).`
        }

        context += `\n=== CURRENT LEAD: ${lead.contact_name} at ${lead.company_name} ===
Type: ${lead.type} | Stage: ${lead.stage} | Priority: ${lead.priority}
Email: ${lead.contact_email || 'N/A'} | Phone: ${lead.contact_phone || 'N/A'}
Company: ${lead.company_description || 'N/A'}
Attack surface: ${lead.attack_surface_notes || 'N/A'}
Investment thesis: ${lead.investment_thesis_notes || 'N/A'}
Personal details: ${lead.personal_details || 'N/A'}
SMYKM hooks: ${(lead.smykm_hooks || []).join('; ') || 'None'}
Conversation summary: ${lead.conversation_summary || 'None'}
Next step: ${lead.conversation_next_step || 'None'}
Emails sent: ${lead.total_emails_out || 0} | Replies: ${lead.total_emails_in || 0}
Last contacted: ${lead.last_contacted_at || 'Never'}${daysSinceContact !== null ? ` (${daysSinceContact} days ago)` : ''}
Last reply: ${lead.last_inbound_at || 'Never'}${daysSinceReply !== null ? ` (${daysSinceReply} days ago)` : ''}

SEQUENCE POSITION: ${followUpPos}
STAGE GUIDANCE: ${stageAdvice}${timingAlert ? `\nTIMING ALERT: ${timingAlert}` : ''}\n`

        if (emailsResult.data?.length) {
          context += '\nRecent emails:\n' + emailsResult.data.map((e, i) =>
            `${i + 1}. [${e.direction}] ${e.email_type} | ${e.created_at} | ${e.subject}\n${(e.body || '').slice(0, 300)}`
          ).join('\n')
        }

        if (interactionsResult.data?.length) {
          context += '\nRecent interactions:\n' + interactionsResult.data.map((i, idx) =>
            `${idx + 1}. ${i.channel}/${i.interaction_type} | ${i.occurred_at} | ${i.summary || i.content || '(no content)'}`
          ).join('\n')
        }

        if (memoriesResult.data?.length) {
          context += '\nAgent memories:\n' + memoriesResult.data.map(m =>
            `- [${m.memory_type}] ${m.content}`
          ).join('\n')
        }
      }
    } else {
      // General pipeline context
      const { data: leads } = await supabase
        .from('leads')
        .select('contact_name, company_name, type, stage, priority, last_contacted_at, last_inbound_at, total_emails_in, total_emails_out, risk_score')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(30)

      if (leads?.length) {
        const byStage: Record<string, number> = {}
        for (const l of leads) {
          byStage[l.stage] = (byStage[l.stage] || 0) + 1
        }

        // Detect urgent leads
        const urgentLeads = leads.filter(l => {
          if (l.stage === 'replied') {
            const d = daysSince(l.last_inbound_at)
            return d !== null && d > 1
          }
          if (l.stage === 'meeting_held') {
            const d = daysSince(l.last_contacted_at)
            return d !== null && d > 1
          }
          return false
        })

        // Detect ready-to-follow-up leads
        const readyForFollowUp = leads.filter(l => {
          if (l.stage === 'email_sent') {
            const d = daysSince(l.last_contacted_at)
            return d !== null && d >= 4
          }
          return false
        })

        // Detect stale leads (no contact in 14+ days, active stage)
        const staleLeads = leads.filter(l => {
          const activeStages = ['email_sent', 'replied', 'meeting_booked', 'follow_up']
          if (!activeStages.includes(l.stage)) return false
          const d = daysSince(l.last_contacted_at)
          return d !== null && d >= 14
        })

        context += `\n=== PIPELINE OVERVIEW ===
Total active leads: ${leads.length}
By stage: ${Object.entries(byStage).map(([s, c]) => `${s}: ${c}`).join(', ')}`

        if (urgentLeads.length) {
          context += `\n\nNEEDS IMMEDIATE ATTENTION:\n` + urgentLeads.map(l => {
            const daysReply = daysSince(l.last_inbound_at)
            const daysContact = daysSince(l.last_contacted_at)
            const ago = l.stage === 'replied' ? `${daysReply}d since reply` : `${daysContact}d since meeting`
            return `  - ${l.contact_name} (${l.company_name}) | ${l.stage} | ${ago}`
          }).join('\n')
        }

        if (readyForFollowUp.length) {
          context += `\n\nREADY FOR FOLLOW-UP (4+ days since initial email):\n` + readyForFollowUp.map(l => {
            const d = daysSince(l.last_contacted_at)
            return `  - ${l.contact_name} (${l.company_name}) | ${d} days since email | ${l.total_emails_out || 0} emails sent`
          }).join('\n')
        }

        if (staleLeads.length) {
          context += `\n\nGOING STALE (14+ days no contact):\n` + staleLeads.map(l => {
            const d = daysSince(l.last_contacted_at)
            return `  - ${l.contact_name} (${l.company_name}) | ${l.stage} | ${d} days since last contact`
          }).join('\n')
        }

        context += `\n\nTop leads:\n` + leads.slice(0, 15).map(l =>
          `- ${l.contact_name} (${l.company_name}) | ${l.stage} | ${l.priority} priority | Risk: ${l.risk_score ?? 'N/A'} | Emails: ${l.total_emails_out || 0} sent, ${l.total_emails_in || 0} received`
        ).join('\n')
      }
    }

    const messages = [
      ...conversationHistory.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      {
        role: 'user' as const,
        content: context
          ? `CRM CONTEXT:${context}\n\nQUESTION: ${question}`
          : question,
      },
    ]

    const fullPrompt = messages.map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`).join('\n\n')

    const answer = await generateCompletion(
      SYSTEM_PROMPT,
      fullPrompt,
      { maxTokens: 2048, temperature: 0.5 }
    )

    // Generate context-aware suggested prompts
    const suggestedPrompts = getSuggestedPrompts(leadId, context)

    return NextResponse.json({ answer, context_used: !!context, suggested_prompts: suggestedPrompts })
  } catch (error) {
    console.error('Copilot error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Copilot failed' },
      { status: 500 }
    )
  }
}
