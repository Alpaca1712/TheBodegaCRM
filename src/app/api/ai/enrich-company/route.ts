import { researchWithWebSearchJSON } from '@/lib/ai/anthropic'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface TeamMember {
  name: string
  title: string
  department: string | null
  linkedin_url: string | null
  photo_url: string | null
  reports_to: string | null
}

interface EnrichResult {
  team_members: TeamMember[]
  org_hierarchy: Array<{
    name: string
    title: string
    reports_to: string | null
    department: string | null
  }>
  company_size_estimate: string | null
  key_departments: string[]
}

const SYSTEM_PROMPT = `You are a company intelligence researcher. Your job is to find the organizational structure and key team members at a target company using web search.

Search strategy:
1. Search "[company name] team" and "[company name] about us" for team pages
2. Search "[company name] LinkedIn" to find the company LinkedIn page
3. Search "[company name] leadership team" or "[company name] executives"
4. Search for specific department heads: "[company name] CTO", "[company name] VP Engineering", etc.
5. Search "[company name] crunchbase" for funding and team info

For each person found, determine:
- Their full name
- Their exact title
- Their department (Engineering, Sales, Product, Marketing, Leadership, Operations, Legal, Finance, Other)
- Their LinkedIn URL if findable
- Who they report to (their manager's name, or null if unknown)

Build a reporting hierarchy. The CEO/founder reports to null. VPs report to C-suite. Directors report to VPs. etc.

IMPORTANT: Only include people you actually found evidence of. Do NOT fabricate team members.
NEVER use em dashes or en dashes in any output.

Return ONLY valid JSON.`

export async function POST(request: NextRequest) {
  try {
    const { leadId } = await request.json()
    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: lead } = await supabase
      .from('leads')
      .select('company_name, company_website, company_description, contact_name')
      .eq('id', leadId)
      .single()

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const clues = [
      `Company: ${lead.company_name}`,
      lead.company_website && `Website: ${lead.company_website}`,
      lead.company_description && `Description: ${lead.company_description}`,
      lead.contact_name && `Known contact: ${lead.contact_name}`,
    ].filter(Boolean).join('\n')

    const result = await researchWithWebSearchJSON<EnrichResult>(
      SYSTEM_PROMPT,
      `Find the organizational structure and key team members at this company:\n\n${clues}\n\nReturn JSON: {"team_members": [{"name": "...", "title": "...", "department": "...", "linkedin_url": "...", "photo_url": null, "reports_to": "manager name or null"}], "org_hierarchy": [{"name": "...", "title": "...", "reports_to": "...", "department": "..."}], "company_size_estimate": "...", "key_departments": ["..."]}`,
      { maxTokens: 4096, temperature: 0.2, maxSearches: 8 }
    )

    if (!result.team_members) result.team_members = []

    // Match team members to existing leads in the CRM
    const { data: existingLeads } = await supabase
      .from('leads')
      .select('id, contact_name, contact_email, contact_linkedin')
      .ilike('company_name', lead.company_name)

    const orgChart = result.team_members.map(member => {
      const match = existingLeads?.find(l =>
        l.contact_name.toLowerCase() === member.name.toLowerCase() ||
        (member.linkedin_url && l.contact_linkedin && l.contact_linkedin.includes(member.linkedin_url.split('/in/')[1] || '___'))
      )
      return {
        ...member,
        lead_id: match?.id || null,
      }
    })

    // Save to lead
    await supabase.from('leads').update({ org_chart: orgChart }).eq('id', leadId)

    return NextResponse.json({
      org_chart: orgChart,
      company_size_estimate: result.company_size_estimate,
      key_departments: result.key_departments || [],
    })
  } catch (error) {
    console.error('Enrich company error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to enrich company' },
      { status: 500 }
    )
  }
}
