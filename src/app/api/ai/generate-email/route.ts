import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimitResponse } from '@/lib/api/auth-guard'
import { generateInitialOutreach } from '@/lib/ai/email-service'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'
import { isMissingRelation } from '@/lib/supabase/missing-column'
import { Lead } from '@/types/leads'

const requestSchema = z.object({
  lead: z.any(), // We trust the service to handle the lead object
  campaignId: z.string().uuid().optional().nullable(),
  customContext: z.string().optional().default(''),
})

interface CampaignContextRow {
  name: string
  campaign_type: string
  description: string | null
  lead_magnet_name: string | null
}

interface LeadMagnetContextRow {
  name: string
  cta_link_text: string
  is_default: boolean
}

function buildCampaignContext(
  campaign: CampaignContextRow,
  templateKey: string | null,
  leadMagnets: LeadMagnetContextRow[],
) {
  const lines = [
    'SELECTED CAMPAIGN (treat this as authoritative):',
    `Campaign name: ${campaign.name}`,
    `Campaign channel/type: ${campaign.campaign_type}`,
    templateKey ? `Campaign template: ${templateKey}` : null,
    campaign.description ? `Campaign description: ${campaign.description}` : null,
    campaign.lead_magnet_name ? `Primary call to action: ${campaign.lead_magnet_name}` : null,
  ].filter(Boolean)

  if (leadMagnets.length > 0) {
    lines.push('Loaded lead magnets (use an exact name; never invent another asset):')
    for (const leadMagnet of leadMagnets) {
      lines.push(
        `- ${leadMagnet.name}${leadMagnet.is_default ? ' (default)' : ''}; linked CTA text: ${leadMagnet.cta_link_text}`,
      )
    }
  } else {
    lines.push('Loaded lead magnets: none. Do not claim a guide, playbook, checklist, or report is available.')
  }

  return lines.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const limited = rateLimitResponse(user.id, 'ai:generate-email', {
      limit: 20,
      windowMs: 60_000,
    })
    if (limited) return limited

    const body = await request.json()
    const validation = requestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.format() },
        { status: 400 }
      )
    }

    const { lead, campaignId, customContext } = validation.data

    // Fetch agent memories for progressive personalization
    let memories: Array<{ memory_type: string; content: string }> = []
    if (lead.id) {
      try {
        const { data: ownedLead } = await supabase
          .from('leads')
          .select('id')
          .eq('id', lead.id)
          .eq('org_id', orgId)
          .single()
        if (ownedLead) {
          const { data } = await supabase
            .from('agent_memory')
            .select('memory_type, content')
            .eq('lead_id', lead.id)
            .order('relevance_score', { ascending: false })
            .limit(10)
          memories = data || []
        }
      } catch {
        // Non-critical
      }
    }

    let campaignContext = ''
    if (campaignId) {
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('name,campaign_type,description,lead_magnet_name')
        .eq('id', campaignId)
        .eq('org_id', orgId)
        .maybeSingle()

      if (campaignError) throw campaignError
      if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

      const [pipelineResult, leadMagnetsResult] = await Promise.all([
        supabase
          .from('campaign_pipelines')
          .select('template_key')
          .eq('campaign_id', campaignId)
          .eq('org_id', orgId)
          .maybeSingle(),
        supabase
          .from('campaign_lead_magnets')
          .select('name,cta_link_text,is_default')
          .eq('campaign_id', campaignId)
          .eq('org_id', orgId)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: true }),
      ])

      if (pipelineResult.error) throw pipelineResult.error
      if (
        leadMagnetsResult.error &&
        !isMissingRelation(leadMagnetsResult.error, 'campaign_lead_magnets')
      ) {
        throw leadMagnetsResult.error
      }

      campaignContext = buildCampaignContext(
        campaign as CampaignContextRow,
        pipelineResult.data?.template_key || null,
        (leadMagnetsResult.error ? [] : leadMagnetsResult.data || []) as LeadMagnetContextRow[],
      )
    }

    const fullContext = [campaignContext, customContext].filter(Boolean).join('\n\n')
    const result = await generateInitialOutreach(lead as Lead, fullContext, memories)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Generate email error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate email' },
      { status: 500 }
    )
  }
}
