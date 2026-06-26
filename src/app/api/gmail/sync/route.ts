import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitResponse } from '@/lib/api/auth-guard'
import {
  refreshAccessToken,
  GmailTokenExpiredError,
  fetchThreadsByEmail,
  fetchFullThread,
  extractEmailAddress,
  type GmailThread,
} from '@/lib/api/gmail'
import { generateJSON } from '@/lib/ai/anthropic'
import type { PipelineStage } from '@/types/leads'
import { campaignEventForPipelineStage, recordCampaignEvent } from '@/lib/campaigns/server'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

const LEAD_BATCH_SIZE = 5

interface EmailClassification {
  gmail_message_id: string
  email_type: 'initial' | 'follow_up_1' | 'follow_up_2' | 'follow_up_3' | 'reply_response' | 'meeting_request' | 'lead_magnet'
}

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
  email_classifications: EmailClassification[]
  next_follow_up: {
    type: 'follow_up_1' | 'follow_up_2' | 'follow_up_3' | 'break_up' | 'reply_needed' | 'none'
    channel: 'email' | 'linkedin' | 'twitter'
    days_until_due: number
    reason: string
  }
}

interface SyncResults {
  leadsScanned: number
  leadsWithEmails: number
  leadsUpdated: number
  newEmails: number
  pipelineChanges: Array<{ leadName: string; from: string; to: string; reason: string }>
  errors: number
  debugLog: string[]
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

    const limited = rateLimitResponse(user.id, 'gmail:sync', {
      limit: 5,
      windowMs: 60_000,
    })
    if (limited) return limited

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('active_org_id')
      .eq('user_id', user.id)
      .single()

    const orgId = profile?.active_org_id || null

    const results: SyncResults = {
      leadsScanned: leads.length,
      leadsWithEmails: 0,
      leadsUpdated: 0,
      newEmails: 0,
      pipelineChanges: [],
      errors: 0,
      debugLog: [],
    }

    for (const account of emailAccounts) {
      let accessToken = account.access_token

      try {
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
            .eq('user_id', user.id)
          console.log('[Sync] Token refreshed successfully')
        }

        try {
          const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
          if (!profileRes.ok) {
            const errText = await profileRes.text()
            console.error('[Sync] Gmail API health check FAILED:', profileRes.status, errText)
            results.debugLog.push(`Gmail API error ${profileRes.status}: ${errText}`)
            results.errors++
            continue
          }
          const gmailProfile = await profileRes.json()
          console.log('[Sync] Gmail API OK:', { email: gmailProfile.emailAddress, messagesTotal: gmailProfile.messagesTotal, threadsTotal: gmailProfile.threadsTotal })
        } catch (healthErr) {
          console.error('[Sync] Gmail API health check exception:', healthErr)
          results.debugLog.push(`Gmail API unreachable: ${healthErr}`)
          results.errors++
          continue
        }

        const validLeads = leads.filter(l => l.contact_email) as LeadRow[]

        for (let i = 0; i < validLeads.length; i += LEAD_BATCH_SIZE) {
          const batch = validLeads.slice(i, i + LEAD_BATCH_SIZE)
          console.log(`[Sync] Processing lead batch ${Math.floor(i / LEAD_BATCH_SIZE) + 1}/${Math.ceil(validLeads.length / LEAD_BATCH_SIZE)} (${batch.map(l => l.contact_name).join(', ')})`)

          await Promise.all(batch.map(lead =>
            processLead(lead, accessToken, account, supabase, user.id, orgId, results)
          ))
        }

        await supabase
          .from('email_accounts')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', account.id)
          .eq('user_id', user.id)

      } catch (accountError) {
        console.error('[Sync] Account error:', account.email_address, accountError)
        results.debugLog.push(`Account error (${account.email_address}): ${accountError}`)
        results.errors++
      }
    }

    console.log('[Sync] ===== Sync complete =====', JSON.stringify(results, null, 2))
    return NextResponse.json({ success: true, ...results })
  } catch (error) {
    if (error instanceof GmailTokenExpiredError) {
      console.error('[Sync] Gmail token expired, user needs to reconnect')
      return NextResponse.json(
        { error: error.message, code: 'TOKEN_EXPIRED' },
        { status: 401 }
      )
    }
    console.error('[Sync] FATAL error:', error)
    return NextResponse.json({ error: 'Internal server error', detail: String(error) }, { status: 500 })
  }
}

// ─── Per-lead processing (runs in parallel batches) ───

async function processLead(
  lead: LeadRow,
  accessToken: string,
  account: { id: string; email_address: string },
  supabase: SupabaseClient,
  userId: string,
  orgId: string | null,
  results: SyncResults,
): Promise<void> {
  try {
    console.log('[Sync] Searching Gmail for threads with', lead.contact_name, '<' + lead.contact_email + '>')

    const threadIds = await fetchThreadsByEmail(accessToken, lead.contact_email!, 15)

    if (threadIds.length === 0) {
      console.log('[Sync] No Gmail threads found for', lead.contact_name)
      results.debugLog.push(`${lead.contact_name}: no threads found`)
      return
    }

    console.log('[Sync]', lead.contact_name, ':', threadIds.length, 'threads found')
    results.leadsWithEmails++

    // Fetch all threads in parallel
    const threadResults = await Promise.all(
      threadIds.map(id =>
        fetchFullThread(accessToken, id, account.email_address).catch(err => {
          console.error('[Sync] Thread fetch error:', id, err)
          return null
        })
      )
    )
    const directThreads = threadResults.filter((t): t is GmailThread => t !== null)

    // Batch dedup: only track emails that belong to CRM leads.
    const allMessageIds = directThreads.flatMap(t => t.messages.map(m => m.id))
    const { data: existingRows } = allMessageIds.length > 0
      ? await supabase
          .from('lead_emails')
          .select('gmail_message_id')
          .eq('user_id', userId)
          .eq('lead_id', lead.id)
          .in('gmail_message_id', allMessageIds)
      : { data: [] }
    const existingIds = new Set(existingRows?.map(e => e.gmail_message_id) || [])
    const activeEnrollment = orgId ? await findActiveCampaignEnrollment(supabase, lead.id, orgId) : null

    let newMessageCount = 0
    for (const thread of directThreads) {
      for (const msg of thread.messages) {
        if (existingIds.has(msg.id)) continue

        const msgFromEmail = extractEmailAddress(msg.from)
        const isFromMe = msg.direction === 'outbound'

        const emailBody = msg.bodyPlainText || msg.snippet
        const { data: leadEmail, error: leadEmailError } = await supabase.from('lead_emails').insert({
          lead_id: lead.id,
          user_id: userId,
          org_id: orgId,
          campaign_id: activeEnrollment?.campaign_id || null,
          email_type: isFromMe ? 'initial' : 'reply_response',
          subject: msg.subject || '(no subject)',
          body: emailBody,
          direction: isFromMe ? 'outbound' : 'inbound',
          gmail_message_id: msg.id,
          gmail_thread_id: msg.threadId,
          from_address: msgFromEmail || undefined,
          to_address: msg.to?.[0] || undefined,
          sent_via: 'gmail',
          ...(isFromMe
            ? { sent_at: new Date(msg.date).toISOString() }
            : { replied_at: new Date(msg.date).toISOString(), reply_content: emailBody }),
        }).select('id').single()

        if (leadEmailError) {
          console.error('[Sync] lead_emails insert error:', leadEmailError.message)
        } else {
          newMessageCount++
          results.newEmails++

          if (activeEnrollment && orgId) {
            await recordCampaignEvent({
              supabase,
              campaignId: activeEnrollment.campaign_id,
              enrollmentId: activeEnrollment.id,
              leadId: lead.id,
              orgId,
              userId,
              eventType: isFromMe ? 'email_sent' : 'email_replied',
              metadata: {
                source: 'gmail_sync',
                lead_email_id: leadEmail.id,
                gmail_message_id: msg.id,
                gmail_thread_id: msg.threadId,
                direction: isFromMe ? 'outbound' : 'inbound',
              },
            })
          }
        }
      }
    }

    console.log('[Sync]', lead.contact_name, ':', newMessageCount, 'new messages stored')
    results.debugLog.push(`${lead.contact_name}: ${threadIds.length} threads, ${newMessageCount} new messages`)

    // AI analysis using the lead's direct threads only.
    try {
      console.log('[Sync] Running AI analysis for', lead.contact_name, '| direct:', directThreads.length)

      const analysis = await analyzeConversation(lead, directThreads, [])

      if (analysis) {
        console.log('[Sync] AI result for', lead.contact_name, ':', {
          suggested_stage: analysis.suggested_stage,
          confidence: analysis.stage_confidence,
          reason: analysis.stage_reason,
        })

        const previousStage = lead.stage

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

        const shouldUpdate = shouldUpdateStage(previousStage, analysis.suggested_stage, analysis.stage_confidence)
        console.log('[Sync] Stage update?', { previousStage, suggested: analysis.suggested_stage, confidence: analysis.stage_confidence, shouldUpdate })

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

        if (shouldUpdate) {
          updatePayload.stage = analysis.suggested_stage
          updatePayload.auto_stage_reason = analysis.stage_reason

          results.pipelineChanges.push({
            leadName: lead.contact_name,
            from: previousStage,
            to: analysis.suggested_stage,
            reason: analysis.stage_reason,
          })

          const campaignEvent = campaignEventForPipelineStage(analysis.suggested_stage)
          if (activeEnrollment && orgId && campaignEvent) {
            await recordCampaignEvent({
              supabase,
              campaignId: activeEnrollment.campaign_id,
              enrollmentId: activeEnrollment.id,
              leadId: lead.id,
              orgId,
              userId,
              eventType: campaignEvent,
              metadata: {
                source: 'gmail_sync_ai',
                suggested_stage: analysis.suggested_stage,
                stage_confidence: analysis.stage_confidence,
                stage_reason: analysis.stage_reason,
                conversation_summary: analysis.conversation_summary,
                next_step: analysis.next_step,
              },
            })
          }
        }

        const { error: updateError } = await supabase
          .from('leads')
          .update(updatePayload)
          .eq('id', lead.id)
          .eq('user_id', userId)
        if (updateError) {
          console.error('[Sync] Lead update error:', updateError.message, '| lead:', lead.contact_name)
        } else {
          console.log('[Sync] Lead updated:', lead.contact_name, shouldUpdate ? `stage: ${previousStage} → ${analysis.suggested_stage}` : '(stage unchanged)')
          results.leadsUpdated++
        }

        // Parallel email classification updates
        const classifyPromises = (analysis.email_classifications || []).map(c =>
          supabase
            .from('lead_emails')
            .update({ email_type: c.email_type })
            .eq('lead_id', lead.id)
            .eq('user_id', userId)
            .eq('gmail_message_id', c.gmail_message_id)
            .then(({ error }) => {
              if (error) console.error('[Sync] Email classify error:', error.message, '| msg:', c.gmail_message_id)
            })
        )

        await Promise.all(classifyPromises)

        // Auto-extract memories from conversation for progressive personalization
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
              console.log('[Sync] Extracted', memoryResponse.length, 'memories for', lead.contact_name)
            }
          } catch (memErr) {
            console.error('[Sync] Memory extraction error for', lead.contact_name, ':', memErr)
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

interface ActiveCampaignEnrollment {
  id: string
  campaign_id: string
}

async function findActiveCampaignEnrollment(
  supabase: SupabaseClient,
  leadId: string,
  orgId: string,
): Promise<ActiveCampaignEnrollment | null> {
  const { data, error } = await supabase
    .from('campaign_enrollments')
    .select('id,campaign_id')
    .eq('lead_id', leadId)
    .eq('org_id', orgId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn('[Sync] Campaign enrollment lookup skipped:', error.message)
    return null
  }

  return data as ActiveCampaignEnrollment | null
}

async function analyzeConversation(
  lead: LeadRow,
  directThreads: GmailThread[],
  domainThreads: GmailThread[]
): Promise<ConversationAnalysis | null> {
  const directMessages = directThreads.flatMap(t => t.messages)
  if (directMessages.length === 0) return null

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
- follow_up_1: Short bump (Day 4 style), references original email
- follow_up_2: Lead magnet / value drop (Day 9 style), offers free resource
- follow_up_3: Channel switch (Day 14 style), LinkedIn/Twitter DM
- reply_response: Any reply to something they said
- meeting_request: Email specifically about scheduling a meeting
- lead_magnet: Sending a free resource, memo, or breakdown

RULES:
- The LATEST emails determine the stage
- Classify EVERY email in the conversation by reading its content and position
- The first outbound cold email is always "initial"
- Short bumps that reference the original are "follow_up_1"
- Emails offering free resources/breakdowns without asking for a meeting are "follow_up_2" or "lead_magnet"
- Messages on LinkedIn/Twitter or referencing channel switch are "follow_up_3"
- For next_follow_up: figure out what has NOT been done yet in the sequence

CLOSED DEAL RULES (CRITICAL):
- If current stage is "closed_won": the deal is DONE. Do NOT suggest a different stage. Keep suggested_stage as "closed_won".
  If the contact sends new emails showing interest in additional services/products, add a signal with type "upsell_opportunity" describing the opportunity. The stage stays closed_won.
- If current stage is "closed_lost": only suggest "replied" if they genuinely re-engaged with clear interest. Routine auto-replies, out-of-office, or unrelated emails do NOT count as re-engagement.

Signal types: "positive", "negative", "neutral", "action_needed", "upsell_opportunity"

Respond with valid JSON only.`

  const userPrompt = `Analyze conversation with ${lead.contact_name}.

${leadContext}
Current stage: ${lead.stage}

=== DIRECT EMAILS (chronological) ===
Each email has a gmail_message_id in brackets. Use these IDs in email_classifications.

${directMessages
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((m, i) => `[${i + 1}] gmail_message_id: "${m.id}" | ${m.direction === 'outbound' ? 'YOU →' : '← THEM'} | ${m.date}\nSubject: ${m.subject}\nFrom: ${m.from}\n${m.bodyPlainText.slice(0, 1500)}`)
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

  // NEVER auto-move out of closed_won -- upsell/re-engagement is flagged as a signal instead
  if (current === 'closed_won') return false

  // closed_lost can only reopen to 'replied' with high confidence (they re-engaged)
  if (current === 'closed_lost') {
    return suggested === 'replied' && confidence === 'high'
  }

  if (suggested === 'closed_lost' && confidence !== 'high') return false

  const currentIdx = STAGE_ORDER.indexOf(current as PipelineStage)
  const suggestedIdx = STAGE_ORDER.indexOf(suggested)

  if (suggestedIdx > currentIdx) return confidence !== 'low'

  return confidence === 'high'
}
