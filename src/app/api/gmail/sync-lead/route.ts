import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  refreshAccessToken,
  fetchThreadsByEmail,
  fetchThreadsByDomain,
  fetchFullThread,
  extractEmailAddress,
  type GmailThread,
} from '@/lib/api/gmail'
import { generateJSON } from '@/lib/ai/anthropic'
import type { PipelineStage } from '@/types/leads'

interface ConversationAnalysis {
  suggested_stage: PipelineStage
  stage_confidence: 'high' | 'medium' | 'low'
  stage_reason: string
  conversation_summary: string
  next_step: string
  signals: Array<{
    type: 'positive' | 'negative' | 'neutral' | 'action_needed' | 'upsell_opportunity'
    signal: string
    source: string
  }>
  reply_urgency: 'immediate' | 'soon' | 'can_wait' | 'none'
  domain_insights: string | null
  email_classifications: Array<{
    gmail_message_id: string
    email_type: string
  }>
  next_follow_up: {
    type: string
    channel: string
    days_until_due: number
    reason: string
  }
}

const STAGE_ORDER: PipelineStage[] = [
  'researched', 'email_drafted', 'email_sent', 'no_response',
  'follow_up', 'replied', 'meeting_booked', 'meeting_held',
  'closed_won', 'closed_lost',
]

function shouldUpdateStage(
  current: string,
  suggested: PipelineStage,
  confidence: 'high' | 'medium' | 'low'
): boolean {
  if (current === suggested) return false
  if (current === 'closed_won') return false
  if (current === 'closed_lost') {
    return suggested === 'replied' && confidence === 'high'
  }
  if (suggested === 'closed_lost' && confidence !== 'high') return false

  const currentIdx = STAGE_ORDER.indexOf(current as PipelineStage)
  const suggestedIdx = STAGE_ORDER.indexOf(suggested)
  if (suggestedIdx > currentIdx) return confidence !== 'low'
  return confidence === 'high'
}

export async function POST(request: NextRequest) {
  try {
    const { leadId } = await request.json()
    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch the lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, contact_name, company_name, contact_email, email_domain, type, stage, company_description, attack_surface_notes, investment_thesis_notes, notes')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    if (!lead.contact_email) {
      return NextResponse.json({ error: 'Lead has no email address' }, { status: 400 })
    }

    // Get email account
    const { data: emailAccounts } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('sync_enabled', true)

    if (!emailAccounts?.length) {
      return NextResponse.json({ error: 'No email accounts with sync enabled' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('active_org_id')
      .eq('user_id', user.id)
      .single()

    const orgId = profile?.active_org_id || null
    const account = emailAccounts[0]
    let accessToken = account.access_token

    // Refresh token if needed
    const expiresAt = new Date(account.token_expires_at)
    if (expiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
      const newTokens = await refreshAccessToken(account.refresh_token)
      accessToken = newTokens.access_token
      await supabase
        .from('email_accounts')
        .update({
          access_token: newTokens.access_token,
          token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        })
        .eq('id', account.id)
    }

    // Fetch threads for this lead
    const threadIds = await fetchThreadsByEmail(accessToken, lead.contact_email, 15)

    const syncResult = {
      newEmails: 0,
      stageChanged: false,
      previousStage: lead.stage,
      newStage: lead.stage,
      stageReason: '',
      summary: '',
      nextStep: '',
      memoriesExtracted: 0,
    }

    if (threadIds.length === 0) {
      return NextResponse.json({ success: true, message: 'No Gmail threads found', ...syncResult })
    }

    // Fetch all threads in parallel
    const threadResults = await Promise.all(
      threadIds.map(id =>
        fetchFullThread(accessToken, id, account.email_address).catch(() => null)
      )
    )
    const directThreads = threadResults.filter((t): t is GmailThread => t !== null)

    // Dedup against existing emails
    const allMessageIds = directThreads.flatMap(t => t.messages.map(m => m.id))
    const { data: existingRows } = await supabase
      .from('email_summaries')
      .select('gmail_message_id')
      .eq('user_id', user.id)
      .in('gmail_message_id', allMessageIds)
    const existingIds = new Set(existingRows?.map(e => e.gmail_message_id) || [])

    // Insert new emails
    for (const thread of directThreads) {
      for (const msg of thread.messages) {
        if (existingIds.has(msg.id)) continue

        const msgFromEmail = extractEmailAddress(msg.from)
        const isFromMe = msg.direction === 'outbound'

        const [summaryResult, leadEmailResult] = await Promise.all([
          supabase.from('email_summaries').insert({
            user_id: user.id,
            org_id: orgId,
            email_account_id: account.id,
            gmail_message_id: msg.id,
            thread_id: msg.threadId,
            subject: msg.subject,
            from_address: msgFromEmail || msg.from,
            to_addresses: msg.to,
            date: new Date(msg.date).toISOString(),
            snippet: msg.snippet,
            lead_id: lead.id,
            is_read: false,
          }),
          supabase.from('lead_emails').insert({
            lead_id: lead.id,
            user_id: user.id,
            email_type: isFromMe ? 'initial' : 'reply_response',
            subject: msg.subject || '(no subject)',
            body: msg.snippet,
            direction: isFromMe ? 'outbound' : 'inbound',
            gmail_message_id: msg.id,
            gmail_thread_id: msg.threadId,
            from_address: msgFromEmail || undefined,
            to_address: msg.to?.[0] || undefined,
            ...(isFromMe
              ? { sent_at: new Date(msg.date).toISOString() }
              : { replied_at: new Date(msg.date).toISOString(), reply_content: msg.snippet }),
          }),
        ])

        if (!summaryResult.error && !leadEmailResult.error) {
          syncResult.newEmails++
        }
      }
    }

    // Fetch domain threads for AI context
    const domain = lead.email_domain || lead.contact_email.split('@')[1]?.toLowerCase()
    let domainThreads: GmailThread[] = []
    if (domain) {
      try {
        const domainThreadIds = await fetchThreadsByDomain(accessToken, domain, 10)
        const directThreadIdSet = new Set(threadIds)
        const newDomainIds = domainThreadIds.filter(id => !directThreadIdSet.has(id)).slice(0, 5)
        if (newDomainIds.length > 0) {
          const domainResults = await Promise.all(
            newDomainIds.map(id =>
              fetchFullThread(accessToken, id, account.email_address).catch(() => null)
            )
          )
          domainThreads = domainResults.filter((t): t is GmailThread => t !== null)
        }
      } catch { /* non-critical */ }
    }

    // AI analysis
    const directMessages = directThreads.flatMap(t => t.messages)
    if (directMessages.length > 0) {
      let domainContext = ''
      if (domainThreads.length > 0) {
        const domainMessages = domainThreads.flatMap(t => t.messages)
        domainContext = `\n\n=== OTHER CONVERSATIONS WITH PEOPLE AT ${lead.company_name.toUpperCase()} ===\n\n` +
          domainMessages
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 20)
            .map((m, i) => `[D${i + 1}] ${m.direction === 'outbound' ? 'YOU \u2192' : '\u2190 THEM'} | ${m.date}\nSubject: ${m.subject}\nFrom: ${m.from}\n${m.bodyPlainText.slice(0, 500)}`)
            .join('\n\n---\n\n')
      }

      const leadContext = lead.type === 'customer'
        ? `Type: Customer\nCompany: ${lead.company_name}${lead.company_description ? `\nDescription: ${lead.company_description}` : ''}${lead.attack_surface_notes ? `\nSecurity notes: ${lead.attack_surface_notes}` : ''}`
        : lead.type === 'investor'
        ? `Type: Investor\nFund/Firm: ${lead.company_name}${lead.investment_thesis_notes ? `\nThesis: ${lead.investment_thesis_notes}` : ''}`
        : `Type: Partnership\nCompany: ${lead.company_name}${lead.investment_thesis_notes ? `\nPartnership notes: ${lead.investment_thesis_notes}` : ''}`

      const systemPrompt = `You are an expert sales intelligence analyst for Rocoto, an AI agent security company.

Read the FULL email conversation history and determine:
1. Where this relationship stands (pipeline stage)
2. What TYPE each email is in the outreach sequence
3. What the NEXT follow-up action should be

Pipeline stages:
- researched: Know about them, haven't emailed
- email_drafted: Email written, not sent
- email_sent: Initial email sent, awaiting response
- replied: They responded
- meeting_booked: Meeting/call/demo scheduled
- meeting_held: Meeting happened
- follow_up: Active follow-up after meeting or reply
- closed_won: Deal signed, investment committed
- closed_lost: Said no, unsubscribed, asked to stop
- no_response: Multiple follow-ups, zero response

Email types for classification:
- initial: The first cold outreach email
- follow_up_1: Short bump (Day 4 style)
- follow_up_2: Lead magnet / value drop (Day 9 style)
- follow_up_3: Channel switch (Day 14 style)
- reply_response: Any reply to something they said
- meeting_request: Email about scheduling a meeting
- lead_magnet: Sending a free resource

CLOSED DEAL RULES (CRITICAL):
- If current stage is "closed_won": keep suggested_stage as "closed_won". Add "upsell_opportunity" signal for new interest.
- If current stage is "closed_lost": only suggest "replied" for genuine re-engagement with clear interest.

Signal types: "positive", "negative", "neutral", "action_needed", "upsell_opportunity"

Respond with valid JSON only.`

      const userPrompt = `Analyze conversation with ${lead.contact_name}.

${leadContext}
Current stage: ${lead.stage}

=== DIRECT EMAILS (chronological) ===
${directMessages
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((m, i) => `[${i + 1}] gmail_message_id: "${m.id}" | ${m.direction === 'outbound' ? 'YOU \u2192' : '\u2190 THEM'} | ${m.date}\nSubject: ${m.subject}\nFrom: ${m.from}\n${m.bodyPlainText.slice(0, 1500)}`)
    .join('\n\n---\n\n')}
${domainContext}

JSON response:
{
  "suggested_stage": "pipeline_stage",
  "stage_confidence": "high|medium|low",
  "stage_reason": "why this stage",
  "conversation_summary": "2-4 sentence arc summary",
  "next_step": "specific next action",
  "signals": [{"type": "positive|negative|neutral|action_needed", "signal": "what", "source": "which email"}],
  "reply_urgency": "immediate|soon|can_wait|none",
  "domain_insights": "context from other people at the company, or null",
  "email_classifications": [{"gmail_message_id": "actual_id_from_above", "email_type": "initial|follow_up_1|follow_up_2|follow_up_3|reply_response|meeting_request|lead_magnet"}],
  "next_follow_up": {"type": "follow_up_1|follow_up_2|follow_up_3|break_up|reply_needed|none", "channel": "email|linkedin|twitter", "days_until_due": 0, "reason": "why this follow-up"}
}`

      try {
        const analysis = await generateJSON<ConversationAnalysis>(systemPrompt, userPrompt, { maxTokens: 2048, temperature: 0.3 })

        if (analysis) {
          const inboundCount = directThreads.reduce(
            (sum, t) => sum + t.messages.filter(m => m.direction === 'inbound').length, 0
          )
          const outboundCount = directThreads.reduce(
            (sum, t) => sum + t.messages.filter(m => m.direction === 'outbound').length, 0
          )
          const lastInbound = directThreads
            .flatMap(t => t.messages.filter(m => m.direction === 'inbound'))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
          const lastOutbound = directThreads
            .flatMap(t => t.messages.filter(m => m.direction === 'outbound'))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

          const doUpdate = shouldUpdateStage(lead.stage, analysis.suggested_stage, analysis.stage_confidence)

          const updatePayload: Record<string, unknown> = {
            conversation_summary: analysis.conversation_summary,
            conversation_next_step: analysis.next_step,
            conversation_signals: analysis.signals.map(s => ({
              ...s,
              detected_at: new Date().toISOString(),
            })),
            thread_count: directThreads.length,
            total_emails_in: inboundCount,
            total_emails_out: outboundCount,
            last_contacted_at: new Date().toISOString(),
            ...(lastInbound ? { last_inbound_at: new Date(lastInbound.date).toISOString() } : {}),
            ...(lastOutbound ? { last_outbound_at: new Date(lastOutbound.date).toISOString() } : {}),
          }

          if (doUpdate) {
            updatePayload.stage = analysis.suggested_stage
            syncResult.stageChanged = true
            syncResult.newStage = analysis.suggested_stage
            syncResult.stageReason = analysis.stage_reason
          }

          await supabase.from('leads').update(updatePayload).eq('id', lead.id)

          syncResult.summary = analysis.conversation_summary
          syncResult.nextStep = analysis.next_step

          // Classify emails in parallel
          const classifyPromises = (analysis.email_classifications || []).map(c =>
            supabase
              .from('lead_emails')
              .update({ email_type: c.email_type })
              .eq('lead_id', lead.id)
              .eq('gmail_message_id', c.gmail_message_id)
          )
          await Promise.all(classifyPromises)

          // Auto-extract memories
          if (analysis.conversation_summary) {
            try {
              const memoryText = [
                analysis.conversation_summary,
                ...analysis.signals.map(s => s.signal),
                analysis.next_step,
              ].filter(Boolean).join('\n')

              const memoryResponse = await generateJSON<Array<{ memory_type: string; content: string; relevance_score: number }>>(
                'Extract memorable facts useful for future outreach personalization. Return JSON array: [{"memory_type": "preference|objection|personal|strategic|context", "content": "...", "relevance_score": 1-10}]. Max 5 facts. Return [] if nothing worth remembering.',
                `Extract memorable facts from this conversation analysis with ${lead.contact_name} at ${lead.company_name}:\n\n${memoryText}`,
                { maxTokens: 1024, temperature: 0.2 }
              )

              if (Array.isArray(memoryResponse) && memoryResponse.length > 0) {
                await supabase.from('agent_memory').insert(
                  memoryResponse.map(m => ({
                    lead_id: lead.id,
                    org_id: orgId,
                    memory_type: m.memory_type,
                    content: m.content,
                    source: 'email' as const,
                    relevance_score: m.relevance_score,
                  }))
                )
                syncResult.memoriesExtracted = memoryResponse.length
              }
            } catch { /* non-critical */ }
          }
        }
      } catch (err) {
        console.error('[SyncLead] AI analysis failed for', lead.contact_name, ':', err)
      }
    }

    return NextResponse.json({ success: true, ...syncResult })
  } catch (error) {
    console.error('[SyncLead] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
