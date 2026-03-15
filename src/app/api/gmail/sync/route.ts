import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  refreshAccessToken,
  buildConversationContext,
  fetchThreadsByEmail,
  fetchFullThread,
  extractEmailAddress,
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
  console.log('[Sync] ===== Gmail sync started =====')

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[Sync] Auth failed:', authError?.message)
      return NextResponse.json({ error: 'Unauthorized', detail: authError?.message }, { status: 401 })
    }

    console.log('[Sync] User authenticated:', user.id, user.email)

    const { data: emailAccounts, error: acctError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('sync_enabled', true)

    if (acctError) {
      console.error('[Sync] Failed to fetch email accounts:', acctError)
      return NextResponse.json({ error: 'DB error fetching accounts', detail: acctError.message }, { status: 500 })
    }

    if (!emailAccounts?.length) {
      console.log('[Sync] No email accounts with sync enabled for user:', user.id)
      return NextResponse.json({ message: 'No email accounts with sync enabled' }, { status: 200 })
    }

    console.log('[Sync] Found', emailAccounts.length, 'email account(s):', emailAccounts.map(a => a.email_address))

    // Fetch all leads with email addresses — these are the ONLY people we care about
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, contact_name, company_name, contact_email, email_domain, type, stage, company_description, attack_surface_notes, investment_thesis_notes, notes')
      .eq('user_id', user.id)
      .not('contact_email', 'is', null)

    if (leadsError) {
      console.error('[Sync] Failed to fetch leads:', leadsError)
      return NextResponse.json({ error: 'DB error fetching leads', detail: leadsError.message }, { status: 500 })
    }

    if (!leads?.length) {
      console.log('[Sync] No leads with email addresses — nothing to sync')
      return NextResponse.json({ success: true, message: 'No leads with email addresses to sync' })
    }

    console.log('[Sync] Found', leads.length, 'leads with emails:', leads.map(l => `${l.contact_name} <${l.contact_email}>`))

    // Build a map of email → lead for quick lookup
    const emailToLead = new Map<string, LeadRow>()
    const domainToLeads = new Map<string, LeadRow[]>()
    for (const lead of leads) {
      if (!lead.contact_email) continue
      emailToLead.set(lead.contact_email.toLowerCase(), lead as LeadRow)
      const domain = lead.email_domain || lead.contact_email.split('@')[1]?.toLowerCase()
      if (domain) {
        const existing = domainToLeads.get(domain) || []
        existing.push(lead as LeadRow)
        domainToLeads.set(domain, existing)
      }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('active_org_id')
      .eq('user_id', user.id)
      .single()

    const orgId = profile?.active_org_id || null

    const results = {
      leadsScanned: leads.length,
      leadsWithEmails: 0,
      leadsUpdated: 0,
      newEmails: 0,
      pipelineChanges: [] as Array<{ leadName: string; from: string; to: string; reason: string }>,
      errors: 0,
      debugLog: [] as string[],
    }

    for (const account of emailAccounts) {
      let accessToken = account.access_token

      try {
        // Refresh token if needed
        const expiresAt = new Date(account.token_expires_at)
        if (expiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
          console.log('[Sync] Refreshing token for', account.email_address)
          const newTokens = await refreshAccessToken(account.refresh_token)
          accessToken = newTokens.access_token
          await supabase
            .from('email_accounts')
            .update({
              access_token: newTokens.access_token,
              token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
            })
            .eq('id', account.id)
          console.log('[Sync] Token refreshed successfully')
        }

        // For each lead, search Gmail for threads with that person
        for (const lead of leads) {
          if (!lead.contact_email) continue

          try {
            console.log('[Sync] Searching Gmail for threads with', lead.contact_name, '<' + lead.contact_email + '>')

            const threadIds = await fetchThreadsByEmail(accessToken, lead.contact_email, 15)

            if (threadIds.length === 0) {
              console.log('[Sync] No Gmail threads found for', lead.contact_name)
              results.debugLog.push(`${lead.contact_name}: no threads found`)
              continue
            }

            console.log('[Sync]', lead.contact_name, ':', threadIds.length, 'threads found')
            results.leadsWithEmails++

            // Fetch full threads and store new messages
            let newMessageCount = 0
            for (const threadId of threadIds) {
              try {
                const thread = await fetchFullThread(accessToken, threadId, account.email_address)

                for (const msg of thread.messages) {
                  // Check if we already stored this message
                  const { data: existing } = await supabase
                    .from('email_summaries')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('gmail_message_id', msg.id)
                    .limit(1)
                    .maybeSingle()

                  if (existing) continue

                  const msgFromEmail = extractEmailAddress(msg.from)
                  const isFromMe = msg.direction === 'outbound'

                  // Store in email_summaries
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
                      lead_id: lead.id,
                      is_read: false,
                    })

                  if (insertError) {
                    console.error('[Sync] email_summaries insert error:', insertError.message, '| msg:', msg.id)
                  } else {
                    newMessageCount++
                    results.newEmails++
                  }

                  // Store in lead_emails
                  const { error: leadEmailError } = await supabase.from('lead_emails').insert({
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

                  if (leadEmailError) {
                    console.error('[Sync] lead_emails insert error:', leadEmailError.message)
                  }
                }
              } catch (threadErr) {
                console.error('[Sync] Thread fetch error:', threadId, threadErr)
              }
            }

            console.log('[Sync]', lead.contact_name, ':', newMessageCount, 'new messages stored')
            results.debugLog.push(`${lead.contact_name}: ${threadIds.length} threads, ${newMessageCount} new messages`)

            // Build full conversation context and run AI analysis
            try {
              console.log('[Sync] Running AI analysis for', lead.contact_name)
              const context = await buildConversationContext(
                accessToken,
                account.email_address,
                lead.contact_email,
                { includeDomainContext: true, maxThreads: 10 }
              )

              console.log('[Sync] Context:', context.directThreads.length, 'direct threads,', context.domainThreads.length, 'domain threads,', context.totalMessages, 'total messages')

              // Get domain leads (other people at the same company)
              const domain = lead.email_domain || lead.contact_email.split('@')[1]?.toLowerCase()
              const domainLeads = (domainToLeads.get(domain || '') || []).filter(dl => dl.id !== lead.id)

              const analysis = await analyzeConversation(lead as LeadRow, context.directThreads, context.domainThreads)

              if (analysis) {
                console.log('[Sync] AI result for', lead.contact_name, ':', {
                  suggested_stage: analysis.suggested_stage,
                  confidence: analysis.stage_confidence,
                  reason: analysis.stage_reason,
                })

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

                const shouldUpdate = shouldUpdateStage(previousStage, analysis.suggested_stage, analysis.stage_confidence)
                console.log('[Sync] Stage update?', { previousStage, suggested: analysis.suggested_stage, confidence: analysis.stage_confidence, shouldUpdate })

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

                const { error: updateError } = await supabase.from('leads').update(updatePayload).eq('id', lead.id)
                if (updateError) {
                  console.error('[Sync] Lead update error:', updateError.message, '| lead:', lead.contact_name)
                } else {
                  console.log('[Sync] Lead updated:', lead.contact_name, shouldUpdate ? `stage: ${previousStage} → ${analysis.suggested_stage}` : '(stage unchanged)')
                  results.leadsUpdated++
                }

                if (analysis.domain_insights && domainLeads.length > 0) {
                  for (const dl of domainLeads) {
                    await supabase.from('leads').update({
                      notes: dl.notes
                        ? `${dl.notes}\n\n[Auto] Domain intel: ${analysis.domain_insights}`
                        : `[Auto] Domain intel: ${analysis.domain_insights}`,
                    }).eq('id', dl.id)
                  }
                }
              } else {
                console.log('[Sync] AI analysis returned null for', lead.contact_name)
                results.debugLog.push(`${lead.contact_name}: AI returned null (no direct messages in context)`)
              }
            } catch (analysisError) {
              console.error('[Sync] Analysis failed for', lead.contact_name, ':', analysisError)
              results.debugLog.push(`${lead.contact_name}: analysis error — ${analysisError}`)
              results.errors++
            }
          } catch (leadError) {
            console.error('[Sync] Error processing lead', lead.contact_name, ':', leadError)
            results.debugLog.push(`${lead.contact_name}: error — ${leadError}`)
            results.errors++
          }
        }

        await supabase
          .from('email_accounts')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', account.id)

      } catch (accountError) {
        console.error('[Sync] Account error:', account.email_address, accountError)
        results.debugLog.push(`Account error (${account.email_address}): ${accountError}`)
        results.errors++
      }
    }

    console.log('[Sync] ===== Sync complete =====', JSON.stringify(results, null, 2))
    return NextResponse.json({ success: true, ...results })
  } catch (error) {
    console.error('[Sync] FATAL error:', error)
    return NextResponse.json({ error: 'Internal server error', detail: String(error) }, { status: 500 })
  }
}

// ─── Helpers ───

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
    console.error('[Sync] AI analysis failed:', err)
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

  if (['closed_won', 'closed_lost'].includes(current)) {
    return confidence === 'high'
  }

  if (suggested === 'closed_lost' && confidence !== 'high') return false

  const currentIdx = STAGE_ORDER.indexOf(current as PipelineStage)
  const suggestedIdx = STAGE_ORDER.indexOf(suggested)

  if (suggestedIdx > currentIdx) return confidence !== 'low'

  return confidence === 'high'
}
