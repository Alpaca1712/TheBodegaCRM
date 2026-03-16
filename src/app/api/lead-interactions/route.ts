import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateJSON } from '@/lib/ai/anthropic'
import { INTERACTION_CHANNELS, INTERACTION_TYPES } from '@/types/leads'
import type { PipelineStage, ConversationSignal } from '@/types/leads'

const createSchema = z.object({
  lead_id: z.string().uuid(),
  channel: z.enum(INTERACTION_CHANNELS),
  interaction_type: z.enum(INTERACTION_TYPES),
  content: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  occurred_at: z.string().optional(),
})

interface MultiChannelAnalysis {
  conversation_summary: string
  next_step: string
  next_step_channel: 'email' | 'linkedin' | 'twitter' | 'phone' | 'in_person'
  warmth: 'cold' | 'warm' | 'hot'
  framework_tag: string
  tactical_move: string | null
  suggested_stage: PipelineStage
  stage_confidence: 'high' | 'medium' | 'low'
  stage_reason: string
  signals: Array<{
    type: 'positive' | 'negative' | 'neutral' | 'action_needed'
    signal: string
    source: string
  }>
}

const MULTI_CHANNEL_SYSTEM_PROMPT = `You are a multi-channel sales strategist for Rocoto, an autonomous AI agent that hacks other AI agents. You follow two frameworks religiously:

1. SAM McKENNA "SHOW ME YOU KNOW ME" (SMYKM):
   - Every recommendation MUST reference something specific about the lead — their blog post, podcast quote, GitHub repo, company news, or something from a past conversation.
   - NEVER suggest generic outreach like "just checking in" or "wanted to follow up." Every touchpoint must demonstrate homework.
   - Use the lead's SMYKM hooks to craft specific, personalized suggestions.

2. ALEX HORMOZI "$100M LEADS" FRAMEWORK:
   - Lead with VALUE, not asks. Suggest free breakdowns, resources, or insights before requesting meetings.
   - ACA Framework for replies on ANY channel (email, LinkedIn DM, Twitter): Acknowledge what they said, Compliment a character trait (genuine, not sycophantic), Ask to advance the conversation.
   - Break-up logic: If they've gone silent across multiple channels, suggest a Hormozi-style break-up on the channel they were most active on.
   - Dream 100 persistence: Count total touchpoints across ALL channels to determine sequence position.

CHANNEL STRATEGY RULES:
- If they engage on LinkedIn (likes, comments, DM replies) but ignore emails → recommend LinkedIn as primary channel
- If they accepted a connection request → they're warmer than a cold email lead; adjust tone accordingly
- If they liked/commented on a post → suggest referencing that specific post in the next DM
- If a call or meeting happened → they're in active conversation; suggest specific follow-up actions
- Cross-pollinate: "They mentioned X in their LinkedIn DM — reference it in your next email subject line"

WARMTH ASSESSMENT:
- cold: No engagement on any channel, or only outbound with zero response
- warm: Some engagement (accepted connection, liked post, brief reply) but no commitment
- hot: Active back-and-forth, expressed interest, or meeting scheduled/held

FRAMEWORK TAGS (pick the most relevant):
- "SMYKM Hook" — next step uses a specific personal detail
- "Hormozi Lead Magnet" — next step delivers free value
- "Hormozi ACA" — next step responds to their message using Acknowledge-Compliment-Ask
- "Channel Switch" — moving to a different channel based on engagement patterns
- "Hormozi Break-up" — final attempt after multi-channel silence
- "Post-Meeting Value" — delivering on promises from a call/meeting
- "Dream 100 Persistence" — continuing the multi-touch sequence

Pipeline stages: researched, email_drafted, email_sent, replied, meeting_booked, meeting_held, follow_up, closed_won, closed_lost, no_response

Respond with valid JSON only, no markdown fences, no explanation.`

function buildAnalysisPrompt(
  lead: Record<string, unknown>,
  emails: Array<Record<string, unknown>>,
  interactions: Array<Record<string, unknown>>,
): string {
  const sections: string[] = []

  sections.push(`=== LEAD ===
Name: ${lead.contact_name}
Company: ${lead.company_name}
Type: ${lead.type}
Title: ${lead.contact_title || 'unknown'}
Current Stage: ${lead.stage}`)

  if (lead.company_description) sections.push(`Company: ${lead.company_description}`)
  if (lead.attack_surface_notes) sections.push(`Attack Surface: ${lead.attack_surface_notes}`)
  if (lead.investment_thesis_notes) sections.push(`Investment Thesis / Partnership Notes: ${lead.investment_thesis_notes}`)
  if (lead.personal_details) sections.push(`Personal Details: ${lead.personal_details}`)

  const hooks = lead.smykm_hooks as string[] | undefined
  if (hooks?.length) {
    sections.push(`SMYKM Hooks:\n${hooks.map((h, i) => `  ${i + 1}. ${h}`).join('\n')}`)
  }

  if (lead.notes) sections.push(`Manual Notes: ${lead.notes}`)
  if (lead.conversation_summary) sections.push(`Previous AI Summary: ${lead.conversation_summary}`)

  if (emails.length > 0) {
    const emailThread = emails
      .map((e, i) => {
        const dir = e.direction === 'outbound' ? 'YOU (Daniel) →' : `← ${lead.contact_name}`
        return `[E${i + 1}] ${dir} | ${e.created_at}\nSubject: ${e.subject}\n${(e.body as string || '').slice(0, 800)}`
      })
      .join('\n\n---\n\n')
    sections.push(`=== EMAIL THREAD (${emails.length} emails) ===\n${emailThread}`)
  }

  if (interactions.length > 0) {
    const interactionLog = interactions
      .map((ix, i) => {
        const dir = (ix.interaction_type as string).includes('sent') || (ix.interaction_type as string).includes('request')
          ? 'YOU →' : `← ${lead.contact_name}`
        return `[I${i + 1}] ${ix.channel} | ${ix.interaction_type} | ${dir} | ${ix.occurred_at}\n${ix.summary || ''}${ix.content ? `\n${(ix.content as string).slice(0, 500)}` : ''}`
      })
      .join('\n\n---\n\n')
    sections.push(`=== NON-EMAIL INTERACTIONS (${interactions.length} touchpoints) ===\n${interactionLog}`)
  }

  const totalTouchpoints = emails.filter(e => e.direction === 'outbound').length +
    interactions.filter(ix => ['dm_sent', 'connection_request', 'comment', 'post_like', 'post_share', 'call', 'meeting'].includes(ix.interaction_type as string)).length

  sections.push(`Total outbound touchpoints across all channels: ${totalTouchpoints}`)

  sections.push(`Analyze this lead's full multi-channel history and respond with this JSON:
{
  "conversation_summary": "2-4 sentence summary of the full relationship arc across all channels",
  "next_step": "Specific, SMYKM-personalized next action using Hormozi principles. Reference specific details from research/hooks.",
  "next_step_channel": "email|linkedin|twitter|phone|in_person",
  "warmth": "cold|warm|hot",
  "framework_tag": "One of the framework tags from your instructions",
  "tactical_move": "Ultra-specific tactical suggestion using SMYKM hooks, or null if next_step covers it",
  "suggested_stage": "pipeline stage",
  "stage_confidence": "high|medium|low",
  "stage_reason": "Why this stage",
  "signals": [{"type": "positive|negative|neutral|action_needed", "signal": "what you detected", "source": "which interaction/email"}]
}`)

  return sections.join('\n\n')
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const leadId = request.nextUrl.searchParams.get('lead_id')
    if (!leadId) return NextResponse.json({ error: 'lead_id required' }, { status: 400 })

    const { data, error } = await supabase
      .from('lead_interactions')
      .select('*')
      .eq('lead_id', leadId)
      .order('occurred_at', { ascending: true })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('GET /api/lead-interactions error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch interactions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const validation = createSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('active_org_id')
      .eq('user_id', user.id)
      .single()

    const { data: interaction, error: insertError } = await supabase
      .from('lead_interactions')
      .insert({
        ...validation.data,
        user_id: user.id,
        org_id: profile?.active_org_id || null,
        occurred_at: validation.data.occurred_at || new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Fetch full lead + all emails + all interactions for AI analysis
    const [leadRes, emailsRes, interactionsRes] = await Promise.all([
      supabase.from('leads').select('*').eq('id', validation.data.lead_id).single(),
      supabase.from('lead_emails').select('*').eq('lead_id', validation.data.lead_id).order('created_at', { ascending: true }),
      supabase.from('lead_interactions').select('*').eq('lead_id', validation.data.lead_id).order('occurred_at', { ascending: true }),
    ])

    if (leadRes.error || !leadRes.data) {
      return NextResponse.json({ interaction, analysis: null })
    }

    const lead = leadRes.data
    const allEmails = emailsRes.data || []
    const allInteractions = interactionsRes.data || []

    // Run AI analysis with Hormozi + McKenna multi-channel prompt
    let analysis: MultiChannelAnalysis | null = null
    try {
      analysis = await generateJSON<MultiChannelAnalysis>(
        MULTI_CHANNEL_SYSTEM_PROMPT,
        buildAnalysisPrompt(lead, allEmails, allInteractions),
        { maxTokens: 2048, temperature: 0.3 }
      )
    } catch (aiError) {
      console.error('[lead-interactions] AI analysis failed:', aiError)
    }

    if (analysis) {
      // Build the enriched next_step that includes channel + framework context
      const channelLabel = analysis.next_step_channel === 'in_person' ? 'In Person' :
        analysis.next_step_channel.charAt(0).toUpperCase() + analysis.next_step_channel.slice(1)
      const enrichedNextStep = `[${channelLabel}] [${analysis.framework_tag}] ${analysis.next_step}${analysis.tactical_move ? `\n\nTactical: ${analysis.tactical_move}` : ''}`

      const signals: ConversationSignal[] = (analysis.signals || []).map(s => ({
        ...s,
        detected_at: new Date().toISOString(),
      }))

      const updatePayload: Record<string, unknown> = {
        conversation_summary: analysis.conversation_summary,
        conversation_next_step: enrichedNextStep,
        conversation_signals: signals,
        last_contacted_at: new Date().toISOString(),
      }

      // Only auto-update stage if confidence is high
      if (analysis.stage_confidence === 'high' && analysis.suggested_stage !== lead.stage) {
        updatePayload.stage = analysis.suggested_stage
        updatePayload.auto_stage_reason = analysis.stage_reason
      }

      await supabase.from('leads').update(updatePayload).eq('id', lead.id)
    }

    // Re-fetch the updated lead
    const { data: updatedLead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', validation.data.lead_id)
      .single()

    return NextResponse.json({ interaction, lead: updatedLead, analysis })
  } catch (error) {
    console.error('POST /api/lead-interactions error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create interaction' },
      { status: 500 }
    )
  }
}
