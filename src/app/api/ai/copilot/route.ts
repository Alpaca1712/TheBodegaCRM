import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateCompletion } from '@/lib/ai/anthropic'
import { z } from 'zod'

const requestSchema = z.object({
  question: z.string().min(1),
  leadId: z.string().uuid().optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().default([]),
})

const SYSTEM_PROMPT = `You are the Rocoto CRM Co-pilot, an AI sales assistant.

ABOUT ROCOTO (use ONLY these facts):
What Rocoto does: We try to break AI agents before bad actors do. We talk to AI agents the same way their users do (email, text, chat, voice, Slack) and try to get them to do things they shouldn't.
What we find: Ways to take over AI agents, pull out private data, change how they behave, and get around their safety rules. Then we help fix everything.
Real results: Worked with Mason (AI agent for property managers). Took over their agent through its customer channels. Helped them fix everything.
Team: Daniel Chalco (CEO) and David (co-founder). Both on Amazon's offensive security team.

You have access to CRM data and can answer questions about leads, pipeline, outreach strategy, and sales tactics.

PERSONALITY:
- Direct and actionable. No fluff.
- You know the McKenna SMYKM and Hormozi $100M Leads frameworks deeply.
- You reference specific CRM data when answering.
- You suggest next actions, not just information.

RULES:
- If asked about a specific lead, use the provided lead context.
- If asked about pipeline/strategy, use the provided pipeline context.
- Keep answers concise (2-5 sentences for simple questions, more for complex ones).
- No em dashes. Use commas or periods.
- When suggesting email copy, follow the SMYKM format.
- Cite specific data points ("You've sent 3 emails with no reply" not "You've been reaching out").
- NEVER invent capabilities, clients, or results not listed in the ABOUT ROCOTO section.`

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
      const [leadResult, emailsResult, interactionsResult, memoriesResult] = await Promise.all([
        supabase.from('leads').select('*').eq('id', leadId).single(),
        supabase.from('lead_emails').select('subject, body, direction, email_type, created_at, sent_at, replied_at').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(15),
        supabase.from('lead_interactions').select('channel, interaction_type, content, summary, occurred_at').eq('lead_id', leadId).order('occurred_at', { ascending: false }).limit(10),
        supabase.from('agent_memory').select('memory_type, content, relevance_score').eq('lead_id', leadId).order('relevance_score', { ascending: false }).limit(15),
      ])

      if (leadResult.data) {
        const lead = leadResult.data
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
Last contacted: ${lead.last_contacted_at || 'Never'}
Last reply: ${lead.last_inbound_at || 'Never'}\n`

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
        .select('contact_name, company_name, type, stage, priority, last_contacted_at, total_emails_in, total_emails_out, risk_score')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(30)

      if (leads?.length) {
        const byStage: Record<string, number> = {}
        for (const l of leads) {
          byStage[l.stage] = (byStage[l.stage] || 0) + 1
        }

        context += `\n=== PIPELINE OVERVIEW ===
Total active leads: ${leads.length}
By stage: ${Object.entries(byStage).map(([s, c]) => `${s}: ${c}`).join(', ')}

Top leads:\n` + leads.slice(0, 15).map(l =>
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

    return NextResponse.json({ answer, context_used: !!context })
  } catch (error) {
    console.error('Copilot error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Copilot failed' },
      { status: 500 }
    )
  }
}
