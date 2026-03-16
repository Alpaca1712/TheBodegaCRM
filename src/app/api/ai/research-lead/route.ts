import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { researchWithWebSearchJSON } from '@/lib/ai/anthropic'

const requestSchema = z.object({
  type: z.enum(['customer', 'investor', 'partnership']),
  contact_name: z.string().optional().nullable(),
  company_name: z.string().optional().nullable(),
  product_name: z.string().optional().nullable(),
  fund_name: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  linkedin_url: z.string().optional().nullable(),
  twitter_url: z.string().optional().nullable(),
}).refine(
  (data) => (data.contact_name && data.company_name) || data.linkedin_url,
  { message: 'Provide either (contact_name + company_name) or a linkedin_url' }
)

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

IMPORTANT: You may receive ONLY a LinkedIn URL with no name or company. In that case:
1. Search the LinkedIn URL directly to find the person's name, title, and company
2. Then proceed with the full research using the name and company you found

Also search for their contact information and company details:
- Their LinkedIn profile URL (search "[name] LinkedIn")
- Their Twitter/X handle (search "[name] Twitter" or look on their personal site)
- Their email address (check company website contact pages, personal blogs, GitHub profiles)
- Their job title at the company
- The company website URL

After searching, return ONLY valid JSON with this structure:
{
  "contact_name": "The person's full name (ALWAYS include this, even if it was provided in the input)",
  "company_name": "The company they work at (ALWAYS include this, even if it was provided in the input)",
  "company_description": "What the company does, in 2-3 sentences. Be specific about their product.",
  "attack_surface_notes": "For customers: specific ways their AI agent/product could be vulnerable. Name channels, tools, data access patterns. For investors: null",
  "investment_thesis_notes": "For investors: what they invest in, their stated beliefs, their thesis with specific quotes if found. For customers: null",
  "personal_details": "Personal story, career arc, interesting background details. Include specific blog post titles, podcast episode names, conference talk titles, GitHub repos. Cite real sources you found.",
  "smykm_hooks": ["3-5 specific details that ONLY this person would recognize in a subject line or email opener. These should reference real things you found — a specific blog post title, a quote from a podcast, a GitHub repo name, an old company they founded, etc."],
  "contact_email": "Their email address if found, or null",
  "contact_linkedin": "Full LinkedIn profile URL if found (e.g. https://linkedin.com/in/...), or null",
  "contact_twitter": "Twitter/X handle with @ prefix if found (e.g. @handle), or null",
  "contact_title": "Their current job title if found, or null",
  "company_website": "Company website URL if found, or null"
}`

function buildResearchPrompt(input: z.infer<typeof requestSchema>): string {
  const linkedInOnly = !input.contact_name && !input.company_name && input.linkedin_url

  const clues = [
    input.contact_name && `Name: ${input.contact_name}`,
    input.company_name && `Company: ${input.company_name}`,
    input.product_name && `Product: ${input.product_name}`,
    input.fund_name && `Fund: ${input.fund_name}`,
    input.website && `Website: ${input.website}`,
    input.linkedin_url && `LinkedIn: ${input.linkedin_url}`,
    input.twitter_url && `Twitter/X: ${input.twitter_url}`,
    `Type: ${input.type}`,
  ]
    .filter(Boolean)
    .join('\n')

  const typeLabel = input.type === 'customer' ? 'potential customer' : input.type === 'investor' ? 'potential investor' : 'potential partner'

  const focusMap: Record<string, string> = {
    customer: 'Focus on: how their AI agent/product works, what channels it uses, what data it accesses, what tools it connects to, and specifically how it could be vulnerable to prompt injection, jailbreaking, data exfiltration, or tool abuse. Search their product docs, blog, and any technical content.',
    investor: 'Focus on: their investment thesis, what kinds of founders they back, their stated beliefs about the market, blog posts they have written, and how Rocoto (autonomous AI agent security) fits their worldview. Search for their writing, interviews, and portfolio.',
    partnership: 'Focus on: what services/products they offer, their client base, how a partnership with Rocoto (autonomous AI agent security) would create mutual value. For agencies: what kind of leads they generate and for whom. For cyber insurance: their coverage areas and how AI agent security fits. For resellers/integrators: their technology stack and distribution channels. Search for their case studies, partnerships, and market positioning.',
  }

  const linkedInInstruction = linkedInOnly
    ? `I only have a LinkedIn URL. FIRST search this LinkedIn profile to find the person's full name, job title, and company. Then use that information to do the full SMYKM research.\n\n`
    : ''

  return `${linkedInInstruction}Research this ${typeLabel} thoroughly using web search:

${clues}

Search the web for deep, specific details for a "Show Me You Know Me" cold email. I need details that would make them think "this person actually did their homework." Do NOT make anything up — only include details you actually found via search.

IMPORTANT: Always return "contact_name" and "company_name" in your JSON response, even if they were provided in the input.

${focusMap[input.type]}`
}

interface ResearchResult {
  contact_name: string | null
  company_name: string | null
  company_description: string
  attack_surface_notes: string | null
  investment_thesis_notes: string | null
  personal_details: string
  smykm_hooks: string[]
  contact_email: string | null
  contact_linkedin: string | null
  contact_twitter: string | null
  contact_title: string | null
  company_website: string | null
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

    const result = await researchWithWebSearchJSON<ResearchResult>(
      RESEARCH_SYSTEM_PROMPT,
      buildResearchPrompt(validation.data),
      { maxTokens: 4096, temperature: 0.3, maxSearches: 10 }
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Research lead error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to research lead' },
      { status: 500 }
    )
  }
}
