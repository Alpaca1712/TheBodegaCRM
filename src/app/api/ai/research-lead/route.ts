import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { researchWithWebSearchJSON } from '@/lib/ai/anthropic'
import { createClient } from '@/lib/supabase/server'

const requestSchema = z.object({
  leadId: z.string().uuid().optional(),
  type: z.enum(['customer', 'investor', 'partnership']).optional(),
  contact_name: z.string().optional().nullable(),
  company_name: z.string().optional().nullable(),
  product_name: z.string().optional().nullable(),
  fund_name: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  linkedin_url: z.string().optional().nullable(),
  twitter_url: z.string().optional().nullable(),
}).refine(
  (data) => (data.contact_name && data.company_name) || data.linkedin_url || data.leadId,
  { message: 'Provide leadId, (contact_name + company_name), or a linkedin_url' }
)

const RESEARCH_SYSTEM_PROMPT = `You are a research assistant for Rocoto. Rocoto tries to break AI agents before bad actors do by talking to them the same way users do (email, text, voice, chat, Slack) and finding ways to take them over. Then they help fix everything. Your job is to find deep, specific details about a person and their company using web search for Sam McKenna's "Show Me You Know Me" cold email methodology.

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

Also search for their contact information, company details, and visual identity:
- Their LinkedIn profile URL (search "[name] LinkedIn")
- Their Twitter/X handle (search "[name] Twitter" or look on their personal site)
- Their email address (check company website contact pages, personal blogs, GitHub profiles)
- Their phone number (check company website, personal site, or public directories)
- Their job title at the company
- The company website URL
- Their profile photo URL (check LinkedIn, company team page, GitHub, Twitter, Gravatar). Look for direct image URLs from team pages, about pages, or speaker bios.
- The company logo URL (check the company website favicon, logo on their homepage, or press kit page). Look for direct image URLs.
- Key team members at the company: search the company's team/about page and LinkedIn company page. Find names, titles, departments, and LinkedIn URLs of key people (executives, VPs, directors, product leads). This is critical for building an org chart.

SOURCING RULES:
- For EVERY fact you include in personal_details, smykm_hooks, attack_surface_notes, or investment_thesis_notes, you MUST include the source URL in the "research_sources" array.
- Each source should have: the URL you found it at, a short title, and a one-sentence description of what you found there.
- Include ALL URLs you found useful during research (blog posts, GitHub repos, podcast pages, news articles, company pages, etc.)
- If you found a detail but can't provide a URL, still include it in the text fields but don't fabricate a URL.

WRITING RULES FOR ALL TEXT FIELDS:
- NEVER use em dashes (\u2014) or en dashes (\u2013) anywhere in any field. Use commas, periods, "and", colons, or parentheses instead. This is critical because this research feeds directly into cold emails.
- Write in plain, conversational English. No corporate jargon.
- Be specific and cite real sources (blog post titles, podcast names, repo names).

After searching, return ONLY valid JSON with this structure:
{
  "contact_name": "The person's full name (ALWAYS include this, even if it was provided in the input)",
  "company_name": "The company they work at (ALWAYS include this, even if it was provided in the input)",
  "company_description": "What the company does, in 2-3 sentences. Be specific about their product.",
  "attack_surface_notes": "For customers: specific ways their AI agent/product could be vulnerable. Name channels, tools, data access patterns. For investors: null",
  "investment_thesis_notes": "For investors: what they invest in, their stated beliefs, their thesis with specific quotes if found. For customers: null",
  "personal_details": "Personal story, career arc, interesting background details. Include specific blog post titles, podcast episode names, conference talk titles, GitHub repos. Cite real sources you found.",
  "smykm_hooks": ["3-5 specific details that ONLY this person would recognize in a subject line or email opener. These should reference real things you found: a specific blog post title, a quote from a podcast, a GitHub repo name, an old company they founded, etc."],
  "research_sources": [
    {"url": "https://example.com/article", "title": "Article or page title", "detail": "What you found here (1 sentence)"},
    {"url": "https://github.com/user/repo", "title": "GitHub repo name", "detail": "What this repo is about"}
  ],
  "contact_email": "Their email address if found, or null",
  "contact_linkedin": "Full LinkedIn profile URL if found (e.g. https://linkedin.com/in/...), or null",
  "contact_twitter": "Twitter/X handle with @ prefix if found (e.g. @handle), or null",
  "contact_title": "Their current job title if found, or null",
  "contact_phone": "Their phone number if found, or null",
  "company_website": "Company website URL if found, or null",
  "contact_photo_url": "Direct URL to their profile photo (from team page, LinkedIn CDN, GitHub avatar, speaker bio, etc.), or null. Must be a direct image URL ending in .jpg/.png/.webp or a CDN URL.",
  "company_logo_url": "Direct URL to the company logo image (from website, press kit, clearbit logo API at https://logo.clearbit.com/[domain]), or null",
  "team_members": [
    {"name": "Full name", "title": "Job title", "department": "Engineering|Sales|Product|Marketing|Leadership|Operations|Other", "linkedin_url": "LinkedIn URL or null"}
  ]
}`

function buildResearchPrompt(input: z.infer<typeof requestSchema>): string {
  const linkedInOnly = !input.contact_name && !input.company_name && input.linkedin_url
  const leadType = input.type ?? 'customer'

  const clues = [
    input.contact_name && `Name: ${input.contact_name}`,
    input.company_name && `Company: ${input.company_name}`,
    input.product_name && `Product: ${input.product_name}`,
    input.fund_name && `Fund: ${input.fund_name}`,
    input.website && `Website: ${input.website}`,
    input.linkedin_url && `LinkedIn: ${input.linkedin_url}`,
    input.twitter_url && `Twitter/X: ${input.twitter_url}`,
    `Type: ${leadType}`,
  ]
    .filter(Boolean)
    .join('\n')

  const typeLabel = leadType === 'customer' ? 'potential customer' : leadType === 'investor' ? 'potential investor' : 'potential partner'

  const focusMap: Record<string, string> = {
    customer: 'Focus on: how their AI agent/product works, what channels it uses, what data it accesses, what tools it connects to, and specifically how it could be vulnerable to prompt injection, jailbreaking, data exfiltration, or tool abuse. Search their product docs, blog, and any technical content.',
    investor: 'Focus on: their investment thesis, what kinds of founders they back, their stated beliefs about the market, blog posts they have written, and how Rocoto (testing AI agents for security holes through their user-facing channels) fits their worldview. Search for their writing, interviews, and portfolio.',
    partnership: 'Focus on: what services/products they offer, their client base, how a partnership with Rocoto (testing AI agents for security holes through their user-facing channels) would create mutual value. For agencies: what kind of leads they generate and for whom. For cyber insurance: their coverage areas and how AI agent testing fits. For resellers/integrators: their technology stack and distribution channels. Search for their case studies, partnerships, and market positioning.',
  }

  const linkedInInstruction = linkedInOnly
    ? `I only have a LinkedIn URL. FIRST search this LinkedIn profile to find the person's full name, job title, and company. Then use that information to do the full SMYKM research.\n\n`
    : ''

  return `${linkedInInstruction}Research this ${typeLabel} thoroughly using web search:

${clues}

Search the web for deep, specific details for a "Show Me You Know Me" cold email. I need details that would make them think "this person actually did their homework." Do NOT make anything up, only include details you actually found via search.

IMPORTANT: Always return "contact_name" and "company_name" in your JSON response, even if they were provided in the input.

${focusMap[leadType]}`
}

interface ResearchSource {
  url: string
  title: string
  detail: string
}

interface TeamMember {
  name: string
  title: string
  department: string | null
  linkedin_url: string | null
}

interface ResearchResult {
  contact_name: string | null
  company_name: string | null
  company_description: string
  attack_surface_notes: string | null
  investment_thesis_notes: string | null
  personal_details: string
  smykm_hooks: string[]
  research_sources: ResearchSource[]
  contact_email: string | null
  contact_linkedin: string | null
  contact_twitter: string | null
  contact_title: string | null
  contact_phone: string | null
  company_website: string | null
  contact_photo_url: string | null
  company_logo_url: string | null
  team_members: TeamMember[]
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = requestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      )
    }

    const { leadId } = validation.data
    let researchInput = { ...validation.data }

    if (leadId) {
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .eq('user_id', user.id)
        .single()

      if (!lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
      }

      researchInput = {
        ...researchInput,
        contact_name: validation.data.contact_name || lead.contact_name,
        company_name: validation.data.company_name || lead.company_name,
        product_name: validation.data.product_name || lead.product_name,
        fund_name: validation.data.fund_name || lead.fund_name,
        website: validation.data.website || lead.company_website,
        linkedin_url: validation.data.linkedin_url || lead.contact_linkedin,
        twitter_url: validation.data.twitter_url || lead.contact_twitter,
        type: validation.data.type || lead.type,
      }
    }

    if (!researchInput.type) {
      return NextResponse.json({ error: 'Lead type is required' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured.' },
        { status: 503 }
      )
    }

    const result = await researchWithWebSearchJSON<ResearchResult>(
      RESEARCH_SYSTEM_PROMPT,
      buildResearchPrompt(researchInput),
      { maxTokens: 4096, temperature: 0.3, maxSearches: 10 }
    )

    const strip = (s: string | null) => s ? s.replace(/[\u2013\u2014]/g, ',') : s
    result.company_description = strip(result.company_description) ?? result.company_description
    result.attack_surface_notes = strip(result.attack_surface_notes)
    result.investment_thesis_notes = strip(result.investment_thesis_notes)
    result.personal_details = strip(result.personal_details) ?? result.personal_details
    result.smykm_hooks = result.smykm_hooks.map(h => h.replace(/[\u2013\u2014]/g, ','))

    if (!result.company_logo_url && result.company_website) {
      try {
        const domain = new URL(result.company_website.startsWith('http') ? result.company_website : `https://${result.company_website}`).hostname.replace('www.', '')
        result.company_logo_url = `https://logo.clearbit.com/${domain}`
      } catch { /* ignore */ }
    }

    if (!result.team_members) result.team_members = []

    if (leadId) {
      const updateData: Record<string, unknown> = {
        contact_name: result.contact_name || researchInput.contact_name,
        company_name: result.company_name || researchInput.company_name,
        company_description: result.company_description,
        attack_surface_notes: result.attack_surface_notes,
        investment_thesis_notes: result.investment_thesis_notes,
        personal_details: result.personal_details,
        smykm_hooks: result.smykm_hooks,
        research_sources: result.research_sources,
        contact_email: result.contact_email,
        contact_linkedin: result.contact_linkedin || researchInput.linkedin_url,
        contact_twitter: result.contact_twitter || researchInput.twitter_url,
        contact_title: result.contact_title,
        contact_phone: result.contact_phone,
        company_website: result.company_website || researchInput.website,
        contact_photo_url: result.contact_photo_url,
        company_logo_url: result.company_logo_url,
      }

      if (result.team_members?.length) {
        updateData.org_chart = result.team_members.map(m => ({
          name: m.name,
          title: m.title,
          department: m.department || null,
          linkedin_url: m.linkedin_url || null,
          photo_url: null,
          reports_to: null,
          lead_id: null,
        }))
      }

      const { error: updateError } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', leadId)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Failed to update lead with research:', updateError)
      }
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
