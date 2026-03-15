import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { researchWithWebSearchJSON, generateJSON } from '@/lib/ai/anthropic'

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

const RESEARCH_SYSTEM_PROMPT = `You are a research assistant for Rocoto, an AI agent security company. Your job is to find deep, specific details about a person and their company using web search for Sam McKenna's "Show Me You Know Me" cold email methodology.

You MUST actively search the web. Do NOT rely on your training data alone. Run multiple searches:
1. Search their full name + company name
2. Search for their personal blog, technical writing, or Medium posts
3. Search for podcast appearances or conference talks they've given
4. Search for their GitHub profile or open source contributions
5. Search for recent news about their company
6. For investors: search for their investment thesis blog posts and portfolio

You need to find things that are NOT on their LinkedIn headline or company About page. Dig for:
- Personal blog posts, technical writing, specific quotes
- GitHub contributions, open source projects
- Podcast appearances, conference talks (with specific episode names or quotes)
- Specific product features or technical decisions they've made
- Career arc (tracing their path from early career to now)
- Personal story, side projects, old startups
- Specific technical details about their product's architecture
- For investors: their specific investment thesis, blog posts about what they look for, portfolio company patterns

After searching, return ONLY valid JSON with this structure:
{
  "company_description": "What the company does, in 2-3 sentences. Be specific about their product.",
  "attack_surface_notes": "For customers: specific ways their AI agent/product could be vulnerable. Name channels, tools, data access patterns. For investors: null",
  "investment_thesis_notes": "For investors: what they invest in, their stated beliefs, their thesis with specific quotes if found. For customers: null",
  "personal_details": "Personal story, career arc, interesting background details. Include specific blog post titles, podcast episode names, conference talk titles, GitHub repos. Cite real sources you found.",
  "smykm_hooks": ["3-5 specific details that ONLY this person would recognize in a subject line or email opener. These should reference real things you found — a specific blog post title, a quote from a podcast, a GitHub repo name, an old company they founded, etc."]
}`

function buildResearchPrompt(input: z.infer<typeof requestSchema>): string {
  const clues = [
    `Name: ${input.contact_name}`,
    `Company: ${input.company_name}`,
    input.product_name && `Product: ${input.product_name}`,
    input.fund_name && `Fund: ${input.fund_name}`,
    input.website && `Website: ${input.website}`,
    input.linkedin_url && `LinkedIn: ${input.linkedin_url}`,
    input.twitter_url && `Twitter/X: ${input.twitter_url}`,
    `Type: ${input.type}`,
  ]
    .filter(Boolean)
    .join('\n')

  return `Research this ${input.type === 'customer' ? 'potential customer' : 'potential investor'} thoroughly using web search:

${clues}

Search the web for deep, specific details for a "Show Me You Know Me" cold email. I need details that would make them think "this person actually did their homework." Do NOT make anything up — only include details you actually found via search.

${input.type === 'customer'
    ? 'Focus on: how their AI agent/product works, what channels it uses, what data it accesses, what tools it connects to, and specifically how it could be vulnerable to prompt injection, jailbreaking, data exfiltration, or tool abuse. Search their product docs, blog, and any technical content.'
    : 'Focus on: their investment thesis, what kinds of founders they back, their stated beliefs about the market, blog posts they have written, and how Rocoto (autonomous AI agent security) fits their worldview. Search for their writing, interviews, and portfolio.'
  }`
}

interface ResearchResult {
  company_description: string
  attack_surface_notes: string | null
  investment_thesis_notes: string | null
  personal_details: string
  smykm_hooks: string[]
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

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured.' },
        { status: 503 }
      )
    }

    let result: ResearchResult

    try {
      // Primary: Claude with web search (autonomous multi-query research)
      result = await researchWithWebSearchJSON<ResearchResult>(
        RESEARCH_SYSTEM_PROMPT,
        buildResearchPrompt(validation.data),
        { maxTokens: 4096, temperature: 0.3, maxSearches: 10 }
      )
    } catch (webSearchError) {
      // Fallback: Claude without web search (training data only)
      console.warn('Web search research failed, falling back to training data:', webSearchError)
      result = await generateJSON<ResearchResult>(
        RESEARCH_SYSTEM_PROMPT,
        buildResearchPrompt(validation.data),
        { temperature: 0.3, maxTokens: 2048 }
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
