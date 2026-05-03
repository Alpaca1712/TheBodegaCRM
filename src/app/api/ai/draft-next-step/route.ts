import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateJSON } from '@/lib/ai/anthropic'
import { checkEmailQuality } from '@/lib/ai/quality'
import { requireUser, rateLimitResponse } from '@/lib/api/auth-guard'
import { SupabaseClient } from '@supabase/supabase-js'
import { Lead, LeadEmail } from '@/types/leads'

const requestSchema = z.object({
  leadId: z.string().uuid(),
})

// --- SHARED PROMPT LOGIC (Simplified from generate routes) ---

const ROCOTO_IDENTITY = `=== ABOUT ROCOTO (use ONLY these facts, never invent capabilities or results) ===
What Rocoto does: We try to break AI agents before bad actors do. Think of it like hiring a burglar to test your locks, but for AI.

How it works: We talk to AI agents the same way their users do (email, text, chat, voice, Slack) and try to get them to do things they shouldn't.

What we find: We find ways to take over AI agents, pull out private data, change how they behave, and get around their safety rules. Then we help the company fix everything.

Real results: We worked with Mason, a company whose AI agent helps property managers. We took over their agent through its normal customer channels. Then we helped them fix every issue.

Team: Daniel Chalco (CEO) and David (co-founder). Both on Amazon's offensive security team.
===`

const SYSTEM_PROMPTS: Record<string, string> = {
  customer: `You are Daniel Chalco writing a cold email. ${ROCOTO_IDENTITY}`,
  investor: `You are Daniel Chalco writing a cold email to an investor. ${ROCOTO_IDENTITY}`,
  partnership: `You are Daniel Chalco writing a cold email to a potential partner. ${ROCOTO_IDENTITY}`,
}

async function getLeadContext(supabase: SupabaseClient, leadId: string, userId: string) {
  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .eq('user_id', userId)
    .single()

  if (!lead) return null

  const { data: emails } = await supabase
    .from('lead_emails')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })

  const { data: memories } = await supabase
    .from('agent_memory')
    .select('memory_type, content')
    .eq('lead_id', leadId)
    .order('relevance_score', { ascending: false })
    .limit(10)

  return { lead: lead as Lead, emails: (emails || []) as LeadEmail[], memories: (memories || []) as Array<{ memory_type: string, content: string }> }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireUser()
    if (guard instanceof NextResponse) return guard
    const limited = rateLimitResponse(guard.user.id, 'ai:draft-next-step', {
      limit: 10,
      windowMs: 60_000,
    })
    if (limited) return limited
    const { user, supabase } = guard

    const body = await request.json()
    const validation = requestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid leadId' }, { status: 400 })
    }

    const context = await getLeadContext(supabase, validation.data.leadId, user.id)
    if (!context) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const { lead, emails, memories } = context
    const outboundEmails = emails.filter((e) => e.direction === 'outbound')
    const hasInbound = emails.some((e) => e.direction === 'inbound')

    // Determine mode
    const mode: 'initial' | 'follow_up' = outboundEmails.length === 0 ? 'initial' : 'follow_up'

    // If they replied, we're in "reply_needed" mode which is a type of follow_up context-wise
    const isReply = hasInbound && (outboundEmails.length === 0 ||
      new Date(emails[emails.length - 1].created_at).getTime() > new Date(outboundEmails[outboundEmails.length - 1].created_at).getTime())

    // Use prompts similar to generate-email and generate-followup
    const systemPrompt = SYSTEM_PROMPTS[lead.type] || SYSTEM_PROMPTS.customer

    // Simple variant generation: generate 2, pick best
    const [varA, varB] = await Promise.all([
      generateJSON<{ subject: string; body: string }>(
        systemPrompt,
        `Draft a ${mode}${isReply ? ' (reply)' : ''} email for ${lead.contact_name} at ${lead.company_name}.
         Lead Type: ${lead.type}.
         Research: ${lead.company_description} ${lead.personal_details} ${lead.smykm_hooks?.join('; ')}.
         Strategic Angle: ${lead.battle_card?.our_angle || ''}
         Next Step Idea: ${lead.conversation_next_step || ''}
         Thread: ${emails.map((e) => `${e.direction}: ${e.body.slice(0, 200)}`).join('\n')}
         Memories: ${memories.map((m) => m.content).join('\n')}

         RULES: Under 150 words. No em dashes. Human, casual, direct. McKenna/Hormozi style.`,
        { temperature: 0.8, maxTokens: 1024 }
      ),
      generateJSON<{ subject: string; body: string }>(
        systemPrompt,
        `Draft a different ${mode}${isReply ? ' (reply)' : ''} email for ${lead.contact_name} at ${lead.company_name}.
         Lead Type: ${lead.type}.
         Research: ${lead.company_description} ${lead.personal_details} ${lead.smykm_hooks?.join('; ')}.
         Strategic Angle: ${lead.battle_card?.our_angle || ''}
         Next Step Idea: ${lead.conversation_next_step || ''}
         Thread: ${emails.map((e) => `${e.direction}: ${e.body.slice(0, 200)}`).join('\n')}
         Memories: ${memories.map((m) => m.content).join('\n')}

         RULES: Under 150 words. No em dashes. Human, casual, direct. McKenna/Hormozi style.`,
        { temperature: 0.9, maxTokens: 1024 }
      )
    ])

    const stripEmDashes = (text: string) => text.replace(/[\u2013\u2014]/g, ',')

    const vA = { ...varA, subject: stripEmDashes(varA.subject), body: stripEmDashes(varA.body) }
    const vB = { ...varB, subject: stripEmDashes(varB.subject), body: stripEmDashes(varB.body) }

    const qA = checkEmailQuality(vA.subject, vA.body, mode)
    const qB = checkEmailQuality(vB.subject, vB.body, mode)

    const best = qA.score >= qB.score ? vA : vB

    // Save draft
    const { data: profile } = await supabase.from('profiles').select('active_org_id').eq('user_id', user.id).single()

    const emailType = mode === 'initial' ? 'initial' :
                    isReply ? 'reply_response' :
                    `follow_up_${Math.min(outboundEmails.length + 1, 3)}`

    const { data: draft, error: draftError } = await supabase
      .from('lead_emails')
      .insert({
        lead_id: lead.id,
        user_id: user.id,
        org_id: profile?.active_org_id || null,
        subject: best.subject,
        body: best.body,
        direction: 'outbound',
        email_type: emailType,
        sent_at: null, // It's a draft
      })
      .select()
      .single()

    if (draftError) throw draftError

    // Update lead stage
    await supabase
      .from('leads')
      .update({ stage: 'email_drafted', updated_at: new Date().toISOString() })
      .eq('id', lead.id)

    return NextResponse.json({ success: true, draft })
  } catch (error) {
    console.error('Magic Draft error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create magic draft' },
      { status: 500 }
    )
  }
}
