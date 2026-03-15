import { generateJSON } from '@/lib/ai/anthropic'

export async function summarizeEmail(params: {
  subject: string
  snippet: string
  fromAddress: string
  contactName?: string
}): Promise<{
  summary: string
  sentiment: 'positive' | 'neutral' | 'negative' | 'urgent'
  actionItems: string[]
  suggestedStage: string | null
}> {
  const context = params.contactName ? `Lead: ${params.contactName}` : ''

  try {
    return await generateJSON<{
      summary: string
      sentiment: 'positive' | 'neutral' | 'negative' | 'urgent'
      actionItems: string[]
      suggestedStage: string | null
    }>(
      'You are a CRM AI assistant for a cold email outreach system. Analyze emails and extract structured insights. Respond with valid JSON only.',
      `Analyze this email:

From: ${params.fromAddress}
Subject: ${params.subject}
Preview: ${params.snippet}
${context}

Respond with JSON:
{
  "summary": "1-2 sentence summary",
  "sentiment": "positive" | "neutral" | "negative" | "urgent",
  "actionItems": ["action item 1"],
  "suggestedStage": "researched" | "replied" | "meeting_booked" | "closed_won" | "closed_lost" | null
}`,
      { maxTokens: 512 }
    )
  } catch {
    return {
      summary: params.snippet.slice(0, 200),
      sentiment: 'neutral',
      actionItems: [],
      suggestedStage: null,
    }
  }
}
