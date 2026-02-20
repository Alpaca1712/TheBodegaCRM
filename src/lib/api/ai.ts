const NOVITA_API_URL = 'https://api.novita.ai/openai/v1/chat/completions'
const NOVITA_MODEL = 'deepseek/deepseek-v3.2'

interface AiCompletionOptions {
  systemPrompt: string
  userPrompt: string
  maxTokens?: number
  temperature?: number
}

async function getApiKey(): Promise<string> {
  const key = process.env.NOVITA_API_KEY || process.env.OPENAI_API_KEY
  if (!key) throw new Error('No AI API key configured. Set NOVITA_API_KEY in environment.')
  return key
}

async function complete({ systemPrompt, userPrompt, maxTokens = 1024, temperature = 0.3 }: AiCompletionOptions): Promise<string> {
  const apiKey = await getApiKey()

  const response = await fetch(NOVITA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: NOVITA_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Novita API error ${response.status}: ${text}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

// ─── Email Summarization ───

export async function summarizeEmail(params: {
  subject: string
  snippet: string
  fromAddress: string
  contactName?: string
  dealTitle?: string
}): Promise<{
  summary: string
  sentiment: 'positive' | 'neutral' | 'negative' | 'urgent'
  actionItems: string[]
  suggestedStage: string | null
}> {
  const context = [
    params.contactName && `Contact: ${params.contactName}`,
    params.dealTitle && `Related deal: ${params.dealTitle}`,
  ].filter(Boolean).join('\n')

  const result = await complete({
    systemPrompt: `You are a CRM AI assistant. Analyze emails and extract structured insights. Always respond in valid JSON.`,
    userPrompt: `Analyze this email and respond with JSON only (no markdown):

From: ${params.fromAddress}
Subject: ${params.subject}
Preview: ${params.snippet}
${context}

Respond with this exact JSON structure:
{
  "summary": "1-2 sentence summary of the email",
  "sentiment": "positive" | "neutral" | "negative" | "urgent",
  "actionItems": ["action item 1", "action item 2"],
  "suggestedStage": "lead" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost" | null
}`,
    maxTokens: 512,
  })

  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return {
      summary: result.slice(0, 200),
      sentiment: 'neutral',
      actionItems: [],
      suggestedStage: null,
    }
  }
}

// ─── Follow-up Email Draft ───

export async function generateFollowUp(params: {
  contactName: string
  contactEmail: string
  dealTitle?: string
  dealStage?: string
  lastEmailSubject?: string
  lastEmailSnippet?: string
  daysSinceLastContact: number
  userName: string
}): Promise<{ subject: string; body: string }> {
  const result = await complete({
    systemPrompt: `You are a professional sales/business development assistant. Write concise, warm follow-up emails. Always respond in valid JSON.`,
    userPrompt: `Draft a follow-up email. Respond with JSON only (no markdown):

To: ${params.contactName} (${params.contactEmail})
From: ${params.userName}
${params.dealTitle ? `Deal: ${params.dealTitle} (stage: ${params.dealStage})` : ''}
${params.lastEmailSubject ? `Last email subject: ${params.lastEmailSubject}` : ''}
${params.lastEmailSnippet ? `Last email preview: ${params.lastEmailSnippet}` : ''}
Days since last contact: ${params.daysSinceLastContact}

Respond with this exact JSON structure:
{
  "subject": "email subject line",
  "body": "email body (use \\n for line breaks)"
}`,
    maxTokens: 512,
  })

  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return {
      subject: `Following up`,
      body: result.slice(0, 500),
    }
  }
}

// ─── Deal Stage Suggestion ───

export async function suggestDealStage(params: {
  dealTitle: string
  currentStage: string
  recentEmails: Array<{ subject: string; snippet: string; date: string }>
  notes?: string
}): Promise<{ suggestedStage: string; reasoning: string }> {
  const emailContext = params.recentEmails
    .slice(0, 5)
    .map(e => `- [${e.date}] ${e.subject}: ${e.snippet}`)
    .join('\n')

  const result = await complete({
    systemPrompt: `You are a CRM AI that analyzes deal context and suggests pipeline stage changes. Always respond in valid JSON.`,
    userPrompt: `Based on the context below, should this deal move to a different stage? Respond with JSON only (no markdown):

Deal: ${params.dealTitle}
Current stage: ${params.currentStage}
${params.notes ? `Notes: ${params.notes}` : ''}

Recent emails:
${emailContext || 'No recent emails'}

Valid stages: lead, qualified, proposal, negotiation, closed_won, closed_lost

Respond with this exact JSON structure:
{
  "suggestedStage": "stage_name",
  "reasoning": "Brief explanation of why"
}`,
    maxTokens: 256,
  })

  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return {
      suggestedStage: params.currentStage,
      reasoning: 'Unable to analyze — keeping current stage.',
    }
  }
}

// ─── LTV/CAC Analysis ───

export async function analyzeLtvCac(params: {
  totalRevenue: number
  totalCustomers: number
  totalAcquisitionSpend: number
  totalLeads: number
  avgCustomerLifespanMonths: number
}): Promise<{
  ltv: number
  cac: number
  ltvCacRatio: number
  analysis: string
}> {
  const ltv = params.totalCustomers > 0
    ? (params.totalRevenue / params.totalCustomers) * (params.avgCustomerLifespanMonths / 12)
    : 0
  const cac = params.totalLeads > 0
    ? params.totalAcquisitionSpend / params.totalLeads
    : 0
  const ltvCacRatio = cac > 0 ? ltv / cac : 0

  const result = await complete({
    systemPrompt: `You are a business metrics analyst. Give actionable, concise insights.`,
    userPrompt: `Analyze these unit economics:
- LTV: $${ltv.toFixed(2)}
- CAC: $${cac.toFixed(2)}
- LTV:CAC ratio: ${ltvCacRatio.toFixed(1)}:1
- Total revenue: $${params.totalRevenue.toLocaleString()}
- Total customers: ${params.totalCustomers}
- Avg customer lifespan: ${params.avgCustomerLifespanMonths} months

Give a 2-3 sentence analysis with one actionable recommendation.`,
    maxTokens: 256,
    temperature: 0.5,
  })

  return { ltv, cac, ltvCacRatio, analysis: result }
}
