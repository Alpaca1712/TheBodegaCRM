import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const requestSchema = z.object({
  type: z.enum(['customer', 'investor']),
  contact_name: z.string().min(1),
  company_name: z.string().min(1),
  product_name: z.string().optional().nullable(),
  fund_name: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  linkedin_url: z.string().optional().nullable(),
  twitter_url: z.string().optional().nullable(),
})

const RESEARCH_SYSTEM_PROMPT = `You are a research assistant for Rocoto, an AI agent security company. Your job is to find deep, specific details about a person and their company that can be used for Sam McKenna's "Show Me You Know Me" cold email methodology.

You need to find things that are NOT on their LinkedIn headline or company About page. Look for:
- Personal blog posts, technical writing
- GitHub contributions, open source projects
- Podcast appearances, conference talks
- Specific product features or technical decisions they've made
- Career arc (tracing their path from early career to now)
- Personal story, side projects, old startups
- Specific technical details about their product's architecture
- For investors: their specific investment thesis, blog posts about what they look for, portfolio company patterns

Return ONLY valid JSON with this structure:
{
  "company_description": "What the company does, in 2-3 sentences",
  "attack_surface_notes": "For customers: specific ways their AI agent/product could be vulnerable. Name channels, tools, data access patterns. For investors: null",
  "investment_thesis_notes": "For investors: what they invest in, their stated beliefs, their thesis. For customers: null",
  "personal_details": "Personal story, career arc, interesting background details. Blog posts, podcast quotes, side projects.",
  "smykm_hooks": ["3-5 specific details that ONLY this person would recognize in a subject line or email opener. These should trace their personal arc or reference obscure details about them."]
}`

function buildResearchPrompt(input: z.infer<typeof requestSchema>): string {
  const clues = [
    `Name: ${input.contact_name}`,
    `Company: ${input.company_name}`,
    input.product_name && `Product: ${input.product_name}`,
    input.fund_name && `Fund: ${input.fund_name}`,
    input.website && `Website: ${input.website}`,
    input.linkedin_url && `LinkedIn: ${input.linkedin_url}`,
    input.twitter_url && `Twitter: ${input.twitter_url}`,
    `Type: ${input.type}`,
  ]
    .filter(Boolean)
    .join('\n')

  return `Research this ${input.type === 'customer' ? 'potential customer' : 'potential investor'} thoroughly:

${clues}

Find deep, specific details for a "Show Me You Know Me" cold email. I need details that would make them think "this person actually did their homework."

${input.type === 'customer'
    ? 'Focus on: how their AI agent/product works, what channels it uses, what data it accesses, what tools it connects to, and specifically how it could be vulnerable to prompt injection, jailbreaking, data exfiltration, or tool abuse.'
    : 'Focus on: their investment thesis, what kinds of founders they back, their stated beliefs about the market, blog posts they have written, and how Rocoto (autonomous AI agent security) fits their worldview.'
  }`
}

async function researchWithPerplexity(input: z.infer<typeof requestSchema>) {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY not configured')

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: RESEARCH_SYSTEM_PROMPT },
        { role: 'user', content: buildResearchPrompt(input) },
      ],
      max_tokens: 1500,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Perplexity API error ${response.status}: ${text}`)
  }

  const data = await response.json()
  const raw = data.choices?.[0]?.message?.content?.trim() || ''
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

async function researchWithAnthropic(input: z.infer<typeof requestSchema>) {
  const { generateJSON } = await import('@/lib/ai/anthropic')
  return generateJSON(RESEARCH_SYSTEM_PROMPT, buildResearchPrompt(input), {
    temperature: 0.3,
    maxTokens: 1500,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = requestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      )
    }

    let result
    if (process.env.PERPLEXITY_API_KEY) {
      result = await researchWithPerplexity(validation.data)
    } else if (process.env.ANTHROPIC_API_KEY) {
      result = await researchWithAnthropic(validation.data)
    } else {
      return NextResponse.json(
        { error: 'No research provider configured. Set PERPLEXITY_API_KEY or ANTHROPIC_API_KEY.' },
        { status: 503 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Research lead error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to research lead' },
      { status: 500 }
    )
  }
}
