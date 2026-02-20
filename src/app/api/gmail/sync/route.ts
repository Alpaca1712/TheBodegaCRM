import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { refreshAccessToken, fetchRecentMessages } from '@/lib/api/gmail'
import { summarizeEmail } from '@/lib/api/ai'

export async function POST(_request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's email accounts with sync enabled
    const { data: emailAccounts, error: accountsError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('sync_enabled', true)

    if (accountsError) {
      console.error('Error fetching email accounts:', accountsError)
      return NextResponse.json(
        { error: 'Failed to fetch email accounts' },
        { status: 500 }
      )
    }

    if (!emailAccounts || emailAccounts.length === 0) {
      return NextResponse.json(
        { message: 'No email accounts with sync enabled' },
        { status: 200 }
      )
    }

    const results = {
      totalMessages: 0,
      newSummaries: 0,
      errors: 0,
      accountResults: [] as Array<{
        email: string
        messagesFetched: number
        newSummaries: number
        errors: number
      }>,
    }

    // Get user's active org ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('active_org_id')
      .eq('user_id', session.user.id)
      .single()

    const orgId = profile?.active_org_id || null

    for (const account of emailAccounts) {
      let accessToken = account.access_token
      const accountResult = {
        email: account.email_address,
        messagesFetched: 0,
        newSummaries: 0,
        errors: 0,
      }

      try {
        // Check if token needs refresh
        const expiresAt = new Date(account.token_expires_at)
        if (expiresAt < new Date(Date.now() + 5 * 60 * 1000)) { // Expiring within 5 minutes
          try {
            const newTokens = await refreshAccessToken(account.refresh_token)
            accessToken = newTokens.access_token
            
            // Update token in database
            const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
            await supabase
              .from('email_accounts')
              .update({
                access_token: newTokens.access_token,
                token_expires_at: newExpiresAt,
              })
              .eq('id', account.id)
          } catch (refreshError) {
            console.error('Failed to refresh token for', account.email_address, refreshError)
            accountResult.errors++
            results.errors++
            results.accountResults.push(accountResult)
            continue
          }
        }

        // Fetch recent messages
        const messages = await fetchRecentMessages(accessToken, 50)
        accountResult.messagesFetched = messages.length
        results.totalMessages += messages.length

        // Get existing message IDs to avoid duplicates
        const existingMessageIds = messages.length > 0 ? await getExistingMessageIds(
          supabase,
          session.user.id,
          messages.map(m => m.id)
        ) : []

        // Process new messages
        for (const message of messages) {
          if (existingMessageIds.includes(message.id)) {
            continue // Already processed
          }

          try {
            // Extract email address from "From" field
            const fromEmail = extractEmailFromAddress(message.from)
            if (!fromEmail) {
              continue
            }

            // Find matching contact, deal, or investor
            const { contactId, dealId, investorId } = await findMatches(
              supabase,
              session.user.id,
              orgId,
              fromEmail,
              message.subject || '',
              message.snippet
            )

            // Get AI summary
            const aiSummary = await summarizeEmail({
              subject: message.subject || '',
              snippet: message.snippet,
              fromAddress: fromEmail,
              // contactName and dealTitle will be filled if we implement contact/deal lookup
            })

            // Store email summary
            const { error: insertError } = await supabase
              .from('email_summaries')
              .insert({
                user_id: session.user.id,
                org_id: orgId,
                email_account_id: account.id,
                gmail_message_id: message.id,
                thread_id: message.threadId,
                subject: message.subject,
                from_address: fromEmail,
                to_addresses: message.to,
                date: message.date,
                snippet: message.snippet,
                ai_summary: aiSummary.summary,
                ai_sentiment: aiSummary.sentiment,
                ai_action_items: aiSummary.actionItems,
                ai_suggested_stage: aiSummary.suggestedStage,
                contact_id: contactId,
                deal_id: dealId,
                investor_id: investorId,
                is_read: false,
              })

            if (insertError) {
              console.error('Failed to insert email summary:', insertError)
              accountResult.errors++
              results.errors++
            } else {
              accountResult.newSummaries++
              results.newSummaries++
            }
          } catch (messageError) {
            console.error('Error processing message:', message.id, messageError)
            accountResult.errors++
            results.errors++
          }
        }

        // Update last_synced_at
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

    return NextResponse.json({
      success: true,
      ...results,
    })

  } catch (error) {
    console.error('Gmail sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getExistingMessageIds(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  messageIds: string[]
): Promise<string[]> {
  if (messageIds.length === 0) return []

  const { data } = await supabase
    .from('email_summaries')
    .select('gmail_message_id')
    .eq('user_id', userId)
    .in('gmail_message_id', messageIds)

  return data?.map(row => row.gmail_message_id) || []
}

function extractEmailFromAddress(address: string): string | null {
  // Extract email from formats like "John Doe <john@example.com>" or "john@example.com"
  const emailMatch = address.match(/<([^>]+)>/) || address.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
  return emailMatch ? emailMatch[1] || emailMatch[0] : null
}

async function findMatches(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  orgId: string | null,
  fromEmail: string,
  subject: string,
  snippet: string
): Promise<{ contactId: string | null; dealId: string | null; investorId: string | null }> {
  const result = {
    contactId: null as string | null,
    dealId: null as string | null,
    investorId: null as string | null,
  }

  // Try to find contact by email
  const { data: contact } = await supabase
    .from('contacts')
    .select('id')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .eq('email', fromEmail)
    .maybeSingle()

  if (contact) {
    result.contactId = contact.id
  }

  // Try to find deal by searching in subject/snippet
  // This is a simple implementation - could be enhanced with AI
  const dealKeywords = ['deal', 'proposal', 'contract', 'quote', 'order', 'sale']
  const hasDealKeyword = dealKeywords.some(keyword => 
    subject.toLowerCase().includes(keyword) || snippet.toLowerCase().includes(keyword)
  )

  if (hasDealKeyword) {
    // Get the most recent deal for this user
    const { data: deal } = await supabase
      .from('deals')
      .select('id')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (deal) {
      result.dealId = deal.id
    }
  }

  // Try to find investor by searching in subject/snippet
  const investorKeywords = ['invest', 'funding', 'round', 'capital', 'valuation', 'pitch']
  const hasInvestorKeyword = investorKeywords.some(keyword =>
    subject.toLowerCase().includes(keyword) || snippet.toLowerCase().includes(keyword)
  )

  if (hasInvestorKeyword) {
    // Get the most recent investor for this user
    const { data: investor } = await supabase
      .from('investors')
      .select('id')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (investor) {
      result.investorId = investor.id
    }
  }

  return result
}
