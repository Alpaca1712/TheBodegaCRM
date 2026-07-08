import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'
import { extractGoogleDocId } from '@/lib/google/lead-magnets'
import { isMissingRelation } from '@/lib/supabase/missing-column'

const leadMagnetSchema = z.object({
  name: z.string().min(2),
  google_doc_url: z.string().min(10),
  cta_phrase: z.string().min(5).default('Apply for our Pentest Challenge, and walk into your next deal ready.'),
  cta_link_text: z.string().min(2).default('Pentest Challenge'),
  filename_template: z.string().min(2).default('{{company_name}} - {{lead_magnet}}.pdf'),
  is_default: z.boolean().default(false),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const { data, error } = await supabase
      .from('campaign_lead_magnets')
      .select('*')
      .eq('campaign_id', id)
      .eq('org_id', orgId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })

    if (error && isMissingRelation(error, 'campaign_lead_magnets')) {
      return NextResponse.json({ data: [], migration_required: true })
    }
    if (error) throw error

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('GET /api/campaigns/[id]/lead-magnets failed', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load lead magnets' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const body = await request.json()
    const validation = leadMagnetSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 })
    }

    const googleDocId = extractGoogleDocId(validation.data.google_doc_url)
    if (!googleDocId) return NextResponse.json({ error: 'Paste a valid Google Doc link or document id' }, { status: 400 })

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (campaignError || !campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    if (validation.data.is_default) {
      const { error: clearDefaultError } = await supabase
        .from('campaign_lead_magnets')
        .update({ is_default: false })
        .eq('campaign_id', id)
        .eq('org_id', orgId)

      if (clearDefaultError && !isMissingRelation(clearDefaultError, 'campaign_lead_magnets')) throw clearDefaultError
    }

    const { data, error } = await supabase
      .from('campaign_lead_magnets')
      .insert({
        campaign_id: id,
        org_id: orgId,
        user_id: user.id,
        name: validation.data.name,
        google_doc_id: googleDocId,
        google_doc_url: validation.data.google_doc_url,
        cta_phrase: validation.data.cta_phrase,
        cta_link_text: validation.data.cta_link_text,
        filename_template: validation.data.filename_template,
        is_default: validation.data.is_default,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('POST /api/campaigns/[id]/lead-magnets failed', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save lead magnet' }, { status: 500 })
  }
}
