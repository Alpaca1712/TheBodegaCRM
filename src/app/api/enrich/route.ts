import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateCompletion } from '@/lib/ai/novita'

const requestSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().optional(),
  company_name: z.string().optional(),
  linkedin_url: z.string().optional(),
  domain: z.string().optional(),
})

interface EnrichedCompany {
  name: string | null
  domain: string | null
  industry: string | null
  employee_count: number | null
  founded_year: number | null
  linkedin_url: string | null
  description: string | null
  logo_url: string | null
  annual_revenue: string | null
  headquarters: string | null
  tech_stack: string[]
}

interface EnrichedData {
  first_name: string
  last_name: string
  email: string | null
  secondary_emails: string[]
  phone: string | null
  title: string | null
  linkedin_url: string | null
  twitter_url: string | null
  github_url: string | null
  personal_website: string | null
  photo_url: string | null
  headline: string | null
  bio: string | null
  city: string | null
  state: string | null
  country: string | null
  company: EnrichedCompany
  employment_history: Array<{
    title: string
    company: string
    start_date: string | null
    end_date: string | null
    current: boolean
  }>
  education: Array<{
    school: string
    degree: string | null
    field: string | null
    year: number | null
  }>
  skills: string[]
  interests: string[]
  seniority: string | null
  departments: string[]
  email_patterns: string[]
}

interface EnrichedResult {
  found: boolean
  provider: 'perplexity' | 'novita'
  data: EnrichedData | null
}

const ENRICHMENT_SYSTEM_PROMPT = `You are a professional research assistant that finds publicly available information about business professionals. You MUST return ONLY valid JSON with no markdown, no code fences, no explanation.`

function buildUserPrompt(input: z.infer<typeof requestSchema>) {
  const clues = [
    `Name: ${input.first_name} ${input.last_name}`,
    input.email && `Email: ${input.email}`,
    input.company_name && `Company: ${input.company_name}`,
    input.linkedin_url && `LinkedIn: ${input.linkedin_url}`,
    input.domain && `Domain: ${input.domain}`,
  ].filter(Boolean).join('\n')

  return `Research this person thoroughly and return a JSON object with everything you can find. Here is what I know:

${clues}

Return this exact JSON structure (use null for fields you cannot find, empty arrays for list fields with no data, do NOT guess or fabricate):
{
  "found": true,
  "first_name": "string",
  "last_name": "string",
  "email": "primary work or personal email or null",
  "secondary_emails": ["other known email addresses"],
  "phone": "string or null",
  "title": "current job title or null",
  "linkedin_url": "full linkedin profile URL or null",
  "twitter_url": "full twitter/X profile URL or null",
  "github_url": "full github profile URL or null",
  "personal_website": "personal website or blog URL or null",
  "headline": "professional headline or tagline or null",
  "bio": "short professional bio (2-3 sentences) or null",
  "city": "string or null",
  "state": "string or null",
  "country": "string or null",
  "seniority": "one of: entry, senior, manager, director, vp, c_suite, founder, or null",
  "departments": ["e.g. engineering", "sales"],
  "company": {
    "name": "current company name or null",
    "domain": "company website domain or null",
    "industry": "string or null",
    "employee_count": number or null,
    "founded_year": number or null,
    "linkedin_url": "company linkedin URL or null",
    "description": "one sentence company description or null",
    "annual_revenue": "estimated revenue range like '$1M-$10M' or null",
    "headquarters": "city, state/country or null",
    "tech_stack": ["known technologies the company uses"]
  },
  "employment_history": [
    {
      "title": "string",
      "company": "string",
      "start_date": "YYYY or null",
      "end_date": "YYYY or null",
      "current": true/false
    }
  ],
  "education": [
    {
      "school": "university/school name",
      "degree": "degree type or null",
      "field": "field of study or null",
      "year": graduation year number or null
    }
  ],
  "skills": ["professional skills and expertise areas"],
  "interests": ["known professional interests or topics they write/speak about"],
  "email_patterns": ["common email patterns at their company, e.g. first.last@domain.com, flast@domain.com"]
}

If you truly cannot find this person at all, return: {"found": false}
Remember: ONLY raw JSON, no markdown fences, no extra text.`
}

function parseEnrichmentResponse(
  raw: string,
  provider: 'perplexity' | 'novita',
  input: z.infer<typeof requestSchema>,
): EnrichedResult {
  const jsonStr = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    console.error(`Failed to parse ${provider} response as JSON:`, raw)
    return { found: false, provider, data: null }
  }

  if (!parsed.found) {
    return { found: false, provider, data: null }
  }

  const company = (parsed.company || {}) as Record<string, unknown>

  const toStrArray = (val: unknown): string[] =>
    Array.isArray(val) ? val.filter(Boolean).map(String) : []

  const history = toStrArray(parsed.employment_history).length === 0 && Array.isArray(parsed.employment_history)
    ? parsed.employment_history.slice(0, 5).map((job: Record<string, unknown>) => ({
        title: String(job.title || ''),
        company: String(job.company || ''),
        start_date: job.start_date ? String(job.start_date) : null,
        end_date: job.end_date ? String(job.end_date) : null,
        current: Boolean(job.current),
      }))
    : Array.isArray(parsed.employment_history)
      ? parsed.employment_history.slice(0, 5).map((job: Record<string, unknown>) => ({
          title: String(job.title || ''),
          company: String(job.company || ''),
          start_date: job.start_date ? String(job.start_date) : null,
          end_date: job.end_date ? String(job.end_date) : null,
          current: Boolean(job.current),
        }))
      : []

  const education = Array.isArray(parsed.education)
    ? parsed.education.slice(0, 5).map((edu: Record<string, unknown>) => ({
        school: String(edu.school || ''),
        degree: edu.degree ? String(edu.degree) : null,
        field: edu.field ? String(edu.field) : null,
        year: typeof edu.year === 'number' ? edu.year : null,
      }))
    : []

  return {
    found: true,
    provider,
    data: {
      first_name: String(parsed.first_name || input.first_name),
      last_name: String(parsed.last_name || input.last_name),
      email: parsed.email ? String(parsed.email) : null,
      secondary_emails: toStrArray(parsed.secondary_emails),
      phone: parsed.phone ? String(parsed.phone) : null,
      title: parsed.title ? String(parsed.title) : null,
      linkedin_url: parsed.linkedin_url ? String(parsed.linkedin_url) : null,
      twitter_url: parsed.twitter_url ? String(parsed.twitter_url) : null,
      github_url: parsed.github_url ? String(parsed.github_url) : null,
      personal_website: parsed.personal_website ? String(parsed.personal_website) : null,
      photo_url: null,
      headline: parsed.headline ? String(parsed.headline) : null,
      bio: parsed.bio ? String(parsed.bio) : null,
      city: parsed.city ? String(parsed.city) : null,
      state: parsed.state ? String(parsed.state) : null,
      country: parsed.country ? String(parsed.country) : null,
      company: {
        name: company.name ? String(company.name) : null,
        domain: company.domain ? String(company.domain) : null,
        industry: company.industry ? String(company.industry) : null,
        employee_count: typeof company.employee_count === 'number' ? company.employee_count : null,
        founded_year: typeof company.founded_year === 'number' ? company.founded_year : null,
        linkedin_url: company.linkedin_url ? String(company.linkedin_url) : null,
        description: company.description ? String(company.description) : null,
        logo_url: null,
        annual_revenue: company.annual_revenue ? String(company.annual_revenue) : null,
        headquarters: company.headquarters ? String(company.headquarters) : null,
        tech_stack: toStrArray(company.tech_stack),
      },
      employment_history: history,
      education,
      skills: toStrArray(parsed.skills),
      interests: toStrArray(parsed.interests),
      seniority: parsed.seniority ? String(parsed.seniority) : null,
      departments: toStrArray(parsed.departments),
      email_patterns: toStrArray(parsed.email_patterns),
    },
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = requestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 })
    }

    const input = validation.data

    // Perplexity Sonar — LLM with built-in web search (best results)
    if (process.env.PERPLEXITY_API_KEY) {
      const result = await enrichWithPerplexity(input)
      return NextResponse.json(result)
    }

    // Novita AI — uses LLM training data knowledge (no live web search, but no extra key needed)
    if (process.env.NOVITA_API_KEY) {
      const result = await enrichWithNovita(input)
      return NextResponse.json(result)
    }

    return NextResponse.json(
      { error: 'No enrichment provider configured. Add PERPLEXITY_API_KEY (recommended) or NOVITA_API_KEY to your environment variables.' },
      { status: 503 }
    )
  } catch (error) {
    console.error('Enrichment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to enrich contact' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// Perplexity Sonar — LLM with built-in real-time web search
// ---------------------------------------------------------------------------
async function enrichWithPerplexity(input: z.infer<typeof requestSchema>): Promise<EnrichedResult> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: ENRICHMENT_SYSTEM_PROMPT + ' Search the web thoroughly using LinkedIn, company websites, news articles, and public directories.' },
        { role: 'user', content: buildUserPrompt(input) },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('Perplexity API error:', res.status, errText)
    throw new Error(`Perplexity API returned ${res.status}`)
  }

  const completion = await res.json()
  const raw = completion.choices?.[0]?.message?.content || ''
  return parseEnrichmentResponse(raw, 'perplexity', input)
}

// ---------------------------------------------------------------------------
// Novita AI — LLM knowledge-based enrichment (no web search, uses training data)
// ---------------------------------------------------------------------------
async function enrichWithNovita(input: z.infer<typeof requestSchema>): Promise<EnrichedResult> {
  const raw = await generateCompletion(
    ENRICHMENT_SYSTEM_PROMPT + ' Use your training knowledge about public figures, companies, and professionals. Only include information you are confident about — do NOT fabricate data.',
    buildUserPrompt(input),
    { temperature: 0.1, maxTokens: 2000 },
  )
  return parseEnrichmentResponse(raw, 'novita', input)
}
