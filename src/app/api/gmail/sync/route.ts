import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  refreshAccessToken,
  fetchRecentMessages,
  buildConversationContext,
  extractEmailAddress,
  extractDomain,
  type GmailThread,
} from '@/lib/api/gmail'
import { generateJSON } from '@/lib/ai/anthropic'
import type { PipelineStage } from '@/types/leads'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

interface ConversationAnalysis {
  suggested_stage: PipelineStage
  stage_confidence: 'high' | 'medium' | 'low'
  stage_reason: string
  conversation_summary: string
  next_step: string
  signals: Array<{
    type: 'positive' | 'negative' | 'neutral' | 'action_needed'
    signal: string
    source: string
  }>
  reply_urgency: 'immediate' | 'soon' | 'can_wait' | 'none'
  domain_insights: string | null
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: emailAccounts } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('sync_enabled', true)

    if (!emailAccounts?.length) {
      return NextResponse.json({ message: 'No email accounts with sync enabled' }, { status: 200 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('active_org_id')
      .eq('user_id', user.id)
      .single()

    const orgId = profile?.active_org_id || null

    const results = {
      totalMessages: 0,
      newSummaries: 0,
      leadsUpdated: 0,
      pipelineChanges: [] as Array<{ leadName: string; from: string; to: string; reason: string }>,
      errors: 0,
      accountResults: [] as Array<{ email: string; messagesFetched: number; newSummaries: number; errors: number }>,
    }

    for (const account of emailAccounts) {
      let accessToken = account.access_token
      const accountResult = { email: account.email_address, messagesFetched: 0, newSummaries: 0, errors: 0 }

      try {
        // Refresh token if needed
        const expiresAt = new Date(account.token_expires_at)
        if (expiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
          const newTokens = await refreshAccessToken(account.refresh_token)
          accessToken = newTokens.access_token
          await supabase
            .from('email_accounts')
            .update({ access_token: newTokens.access_token, token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString() })
            .eq('id', account.id)
        }

        // Fetch recent messages
        const messages = await fetchRecentMessages(accessToken, 50)
        accountResult.messagesFetched = messages.length
        results.totalMessages += messages.length

        // Get already-processed message IDs
        const existingIds = messages.length > 0
          ? await getExistingMessageIds(supabase, user.id, messages.map(m => m.id))
          : new Set<string>()

        // Group new messages by thread to avoid re-analyzing the same thread
        const threadMap = new Map<string, typeof messages>()
        for (const msg of messages) {
          if (existingIds.has(msg.id)) continue
          const existing = threadMap.get(msg.threadId) || []
          existing.push(msg)
          threadMap.set(msg.threadId, existing)
        }

        // Process each thread that has new messages
        for (const [threadId, newMessages] of threadMap) {
          try {
            const firstMsg = newMessages[0]
            const fromEmail = extractEmailAddress(firstMsg.from)
            if (!fromEmail) continue

            // Find matching lead(s) by email or domain
            const { lead, domainLeads } = await findLeadsForEmail(supabase, user.id, fromEmail)

            // Store each new message as an email summary
            for (const msg of newMessages) {
              const msgFromEmail = extractEmailAddress(msg.from)
              const isFromMe = msgFromEmail?.toLowerCase() === account.email_address.toLowerCase()

              const { error: insertError } = await supabase
                .from('email_summaries')
                .insert({
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
                  lead_id: lead?.id || null,
                  is_read: false,
                })

              if (!insertError) {
                accountResult.newSummaries++
                results.newSummaries++
              }

              // Also store in lead_emails if we have a matching lead
              if (lead) {
                await supabase.from('lead_emails').insert({
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
                })
              }
            }

            // If we matched a lead, build full context and run AI analysis
            if (lead && lead.contact_email) {
              try {
                const context = await buildConversationContext(
                  accessToken,
                  account.email_address,
                  lead.contact_email,
                  { includeDomainContext: true, maxThreads: 10 }
                )

                const analysis = await analyzeConversation(lead, context.directThreads, context.domainThreads)

                if (analysis) {
                  const previousStage = lead.stage

                  const inboundCount = context.directThreads.reduce(
                    (sum, t) => sum + t.messages.filter(m => m.direction === 'inbound').length, 0
                  )
                  const outboundCount = context.directThreads.reduce(
                    (sum, t) => sum + t.messages.filter(m => m.direction === 'outbound').length, 0
                  )

                  const lastInbound = context.directThreads
                    .flatMap(t => t.messages.filter(m => m.direction === 'inbound'))
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

                  const lastOutbound = context.directThreads
                    .flatMap(t => t.messages.filter(m => m.direction === 'outbound'))
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

                  // Only auto-advance stage, never regress (unless AI is highly confident)
                  const shouldUpdate = shouldUpdateStage(previousStage, analysis.suggested_stage, analysis.stage_confidence)

                  const updatePayload: Record<string, unknown> = {
                    conversation_summary: analysis.conversation_summary,
                    conversation_next_step: analysis.next_step,
                    conversation_signals: analysis.signals.map(s => ({
                      ...s,
                      detected_at: new Date().toISOString(),
                    })),
                    thread_count: context.directThreads.length,
                    total_emails_in: inboundCount,
                    total_emails_out: outboundCount,
                    last_contacted_at: new Date().toISOString(),
                    ...(lastInbound ? { last_inbound_at: new Date(lastInbound.date).toISOString() } : {}),
                    ...(lastOutbound ? { last_outbound_at: new Date(lastOutbound.date).toISOString() } : {}),
                  }

                  if (shouldUpdate) {
                    updatePayload.stage = analysis.suggested_stage
                    updatePayload.auto_stage_reason = analysis.stage_reason

                    results.pipelineChanges.push({
                      leadName: lead.contact_name,
                      from: previousStage,
                      to: analysis.suggested_stage,
                      reason: analysis.stage_reason,
                    })
                  }

                  await supabase.from('leads').update(updatePayload).eq('id', lead.id)
                  results.leadsUpdated++

                  // Also update other leads at the same domain with domain insights
                  if (analysis.domain_insights && domainLeads.length > 0) {
                    for (const dl of domainLeads) {
                      await supabase.from('leads').update({
                        notes: dl.notes
                          ? `${dl.notes}\n\n[Auto] Domain intel: ${analysis.domain_insights}`
                          : `[Auto] Domain intel: ${analysis.domain_insights}`,
                      }).eq('id', dl.id)
                    }
                  }
                }
              } catch (analysisError) {
                console.error('Conversation analysis failed for lead:', lead.contact_name, analysisError)
              }
            }
          } catch (threadError) {
            console.error('Error processing thread:', threadId, threadError)
            accountResult.errors++
            results.errors++
          }
        }

        await supabase
          .from('email_accounts')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', account.id)

      } catch (accountError) {
        console.error('Error syncing account', account.email_address, accountError)
        accountResult.errors++
        results.errors++
      }

      results.accountResults.push(accountResult)
    }

    return NextResponse.json({ success: true, ...results })
  } catch (error) {
    console.error('Gmail sync error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── Helpers ───

async function getExistingMessageIds(
  supabase: SupabaseClient,
  userId: string,
  messageIds: string[]
): Promise<Set<string>> {
  if (messageIds.length === 0) return new Set()
  const { data } = await supabase
    .from('email_summaries')
    .select('gmail_message_id')
    .eq('user_id', userId)
    .in('gmail_message_id', messageIds)
  return new Set(data?.map(row => row.gmail_message_id) || [])
}

interface LeadRow {
  id: string
  contact_name: string
  company_name: string
  contact_email: string | null
  email_domain: string | null
  type: string
  stage: string
  company_description: string | null
  attack_surface_notes: string | null
  investment_thesis_notes: string | null
  notes: string | null
}

async function findLeadsForEmail(
  supabase: SupabaseClient,
  userId: string,
  fromEmail: string
): Promise<{ lead: LeadRow | null; domainLeads: LeadRow[] }> {
  const domain = extractDomain(fromEmail)

  // Exact email match first
  const { data: exactMatch } = await supabase
    .from('leads')
    .select('id, contact_name, company_name, contact_email, email_domain, type, stage, company_description, attack_surface_notes, investment_thesis_notes, notes')
    .eq('user_id', userId)
    .eq('contact_email', fromEmail)
    .limit(1)
    .maybeSingle()

  // Domain matches (other people at the same company)
  const { data: domainMatches } = await supabase
    .from('leads')
    .select('id, contact_name, company_name, contact_email, email_domain, type, stage, company_description, attack_surface_notes, investment_thesis_notes, notes')
    .eq('user_id', userId)
    .eq('email_domain', domain)
    .neq('contact_email', fromEmail)
    .limit(10)

  return {
    lead: exactMatch as LeadRow | null,
    domainLeads: (domainMatches || []) as LeadRow[],
  }
}

async function analyzeConversation(
  lead: LeadRow,
  directThreads: GmailThread[],
  domainThreads: GmailThread[]
): Promise<ConversationAnalysis | null> {
  const directMessages = directThreads.flatMap(t => t.messages)
  if (directMessages.length === 0) return null

  const directConvo = directMessages
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((m, i) => `[${i + 1}] ${m.direction === 'outbound' ? 'YOU →' : '← THEM'} | ${m.date}\nSubject: ${m.subject}\nFrom: ${m.from}\n${m.bodyPlainText.slice(0, 1500)}`)
    .join('\n\n---\n\n')

  let domainContext = ''
  if (domainThreads.length > 0) {
    const domainMessages = domainThreads.flatMap(t => t.messages)
    domainContext = `\n\n=== OTHER CONVERSATIONS WITH PEOPLE AT ${lead.company_name.toUpperCase()} ===\n\n` +
      domainMessages
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 20)
        .map((m, i) => `[D${i + 1}] ${m.direction === 'outbound' ? 'YOU →' : '← THEM'} | ${m.date}\nSubject: ${m.subject}\nFrom: ${m.from}\n${m.bodyPlainText.slice(0, 500)}`)
        .join('\n\n---\n\n')
  }

  const leadContext = lead.type === 'customer'
    ? `Type: Customer\nCompany: ${lead.company_name}${lead.company_description ? `\nDescription: ${lead.company_description}` : ''}${lead.attack_surface_notes ? `\nSecurity notes: ${lead.attack_surface_notes}` : ''}`
    : `Type: Investor\nFund/Firm: ${lead.company_name}${lead.investment_thesis_notes ? `\nThesis: ${lead.investment_thesis_notes}` : ''}`

  const systemPrompt = `You are an expert sales intelligence analyst for Rocoto, an AI agent security company.

Read the FULL email conversation history and determine exactly where this relationship stands.

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

RULES:
- The LATEST emails determine the stage
- Meeting/call/demo mentioned → meeting_booked
- "Let's circle back" or silence after interest → follow_up
- "Not interested" / "remove me" → closed_lost
- Commitment language ("let's do it", "send contract") → closed_won
- Use domain conversations for company-wide context

Respond with valid JSON only.`

  const userPrompt = `Analyze conversation with ${lead.contact_name}.

${leadContext}
Current stage: ${lead.stage}

=== DIRECT EMAILS (chronological) ===

${directConvo}
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
  "domain_insights": "context from other people at the company, or null"
}`

  try {
    return await generateJSON<ConversationAnalysis>(systemPrompt, userPrompt, { maxTokens: 2048, temperature: 0.3 })
  } catch (err) {
    console.error('AI analysis failed:', err)
    return null
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

  // Terminal stages only change with high confidence
  if (['closed_won', 'closed_lost'].includes(current)) {
    return confidence === 'high'
  }

  // closed_lost requires high confidence to set
  if (suggested === 'closed_lost' && confidence !== 'high') return false

  const currentIdx = STAGE_ORDER.indexOf(current as PipelineStage)
  const suggestedIdx = STAGE_ORDER.indexOf(suggested)

  // Forward progression: always allow with medium+ confidence
  if (suggestedIdx > currentIdx) return confidence !== 'low'

  // Backward movement: only with high confidence (e.g., they un-booked a meeting)
  return confidence === 'high'
}
