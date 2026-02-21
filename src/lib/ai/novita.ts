import OpenAI from 'openai'

const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct'

function getClient() {
  const apiKey = process.env.NOVITA_API_KEY
  if (!apiKey) {
    throw new Error('NOVITA_API_KEY is not set. Add it to your .env.local file.')
  }
  return new OpenAI({
    baseURL: 'https://api.novita.ai/openai',
    apiKey,
  })
}

function getModel() {
  return process.env.NOVITA_MODEL || DEFAULT_MODEL
}

export async function generateCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const client = getClient()
  const response = await client.chat.completions.create({
    model: getModel(),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: options?.maxTokens ?? 800,
    temperature: options?.temperature ?? 0.7,
  })
  return response.choices[0]?.message?.content || ''
}

export async function generateContactInsights(contact: {
  first_name: string
  last_name: string
  email?: string
  phone?: string
  title?: string
  status: string
  source?: string
  notes?: string
  company_name?: string
  activities_count: number
  last_activity_date?: string
  deals_count: number
  deals_value: number
}): Promise<{ summary: string; nextSteps: string[]; riskLevel: 'low' | 'medium' | 'high' }> {
  const systemPrompt = `You are an expert CRM analyst. Analyze the contact data and provide actionable insights. Respond in valid JSON with this exact structure:
{"summary": "2-3 sentence analysis of this contact relationship", "nextSteps": ["action 1", "action 2", "action 3"], "riskLevel": "low|medium|high"}
Only output the JSON, nothing else.`

  const userPrompt = `Contact: ${contact.first_name} ${contact.last_name}
Title: ${contact.title || 'Unknown'}
Company: ${contact.company_name || 'Unknown'}
Status: ${contact.status}
Source: ${contact.source || 'Unknown'}
Activities: ${contact.activities_count} logged (last: ${contact.last_activity_date || 'never'})
Deals: ${contact.deals_count} deals worth $${contact.deals_value.toLocaleString()}
Notes: ${contact.notes || 'None'}`

  const result = await generateCompletion(systemPrompt, userPrompt, { temperature: 0.5 })
  try {
    return JSON.parse(result)
  } catch {
    return { summary: result, nextSteps: [], riskLevel: 'medium' }
  }
}

export async function generateDealScore(deal: {
  title: string
  value: number | null
  stage: string
  probability: number | null
  expected_close_date: string | null
  notes: string | null
  days_in_stage: number
  activities_count: number
  last_activity_date?: string
}): Promise<{ score: number; reasoning: string; suggestedStage?: string; suggestedActions: string[] }> {
  const systemPrompt = `You are a sales analytics AI. Score this deal's health from 0-100 and provide analysis. Respond in valid JSON:
{"score": 75, "reasoning": "brief explanation", "suggestedStage": "only if different from current", "suggestedActions": ["action 1", "action 2"]}
Only output the JSON, nothing else.`

  const userPrompt = `Deal: ${deal.title}
Value: $${(deal.value || 0).toLocaleString()}
Stage: ${deal.stage}
Probability: ${deal.probability ?? 'not set'}%
Expected Close: ${deal.expected_close_date || 'not set'}
Days in Current Stage: ${deal.days_in_stage}
Activities: ${deal.activities_count} (last: ${deal.last_activity_date || 'never'})
Notes: ${deal.notes || 'None'}`

  const result = await generateCompletion(systemPrompt, userPrompt, { temperature: 0.4 })
  try {
    return JSON.parse(result)
  } catch {
    return { score: 50, reasoning: result, suggestedActions: [] }
  }
}

export async function generateEmailDraft(context: {
  recipientName: string
  recipientEmail?: string
  recipientTitle?: string
  companyName?: string
  purpose: 'follow_up' | 'intro' | 'meeting_request' | 'deal_update' | 'thank_you'
  additionalContext?: string
  senderName?: string
}): Promise<{ subject: string; body: string }> {
  const purposeLabels = {
    follow_up: 'follow-up after a previous interaction',
    intro: 'introducing yourself or your company',
    meeting_request: 'requesting a meeting',
    deal_update: 'providing an update on a deal or proposal',
    thank_you: 'thanking them for their time or business',
  }

  const systemPrompt = `You are a professional email writer for a CRM. Write a concise, warm, professional email. Respond in valid JSON:
{"subject": "email subject line", "body": "email body (use \\n for line breaks, do not include greeting or sign-off placeholders)"}
Only output the JSON, nothing else.`

  const userPrompt = `Write an email to ${context.recipientName}${context.recipientTitle ? ` (${context.recipientTitle})` : ''}${context.companyName ? ` at ${context.companyName}` : ''}.
Purpose: ${purposeLabels[context.purpose]}
${context.additionalContext ? `Additional context: ${context.additionalContext}` : ''}
${context.senderName ? `From: ${context.senderName}` : ''}`

  const result = await generateCompletion(systemPrompt, userPrompt, { temperature: 0.7, maxTokens: 600 })
  try {
    return JSON.parse(result)
  } catch {
    return { subject: 'Follow up', body: result }
  }
}

export async function generateActivitySummary(activities: Array<{
  type: string
  title: string
  description?: string | null
  created_at: string
}>): Promise<string> {
  const systemPrompt = `You are a CRM assistant. Summarize these activities into a brief, insightful paragraph (2-3 sentences). Focus on patterns, momentum, and what it means for the relationship.`

  const activityList = activities
    .slice(0, 20)
    .map(a => `- [${a.type}] ${a.title}${a.description ? ': ' + a.description : ''} (${new Date(a.created_at).toLocaleDateString()})`)
    .join('\n')

  return generateCompletion(systemPrompt, activityList, { temperature: 0.5, maxTokens: 300 })
}
