import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { extractGoogleDocId } from '@/lib/google/lead-magnets'
import { isMissingRelation } from '@/lib/supabase/missing-column'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'

const leadMagnetUpdateSchema = z.object({
  name: z.string().trim().min(2),
  google_doc_url: z.string().trim().min(10),
  cta_phrase: z.string().trim().min(5),
  cta_link_text: z.string().trim().min(2),
  filename_template: z.string().trim().min(2),
  is_default: z.boolean(),
})

function migrationRequiredResponse() {
  return NextResponse.json(
    {
      error: 'Campaign lead magnets need database migration 040_campaign_lead_magnets.sql before documents can be managed.',
      code: 'MIGRATION_REQUIRED',
    },
    { status: 400 },
  )
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; leadMagnetId: string }> },
) {
  try {
    const { id, leadMagnetId } = await params
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const validation = leadMagnetUpdateSchema.safeParse(await request.json())
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 })
    }

    const googleDocId = extractGoogleDocId(validation.data.google_doc_url)
    if (!googleDocId) return NextResponse.json({ error: 'Paste a valid Google Doc link or document id' }, { status: 400 })

    const { data: existing, error: existingError } = await supabase
      .from('campaign_lead_magnets')
      .select('id,is_default')
      .eq('id', leadMagnetId)
      .eq('campaign_id', id)
      .eq('org_id', orgId)
      .maybeSingle()

    if (existingError && isMissingRelation(existingError, 'campaign_lead_magnets')) return migrationRequiredResponse()
    if (existingError) throw existingError
    if (!existing) return NextResponse.json({ error: 'Lead magnet not found' }, { status: 404 })

    if (validation.data.is_default) {
      const { error: clearDefaultError } = await supabase
        .from('campaign_lead_magnets')
        .update({ is_default: false })
        .eq('campaign_id', id)
        .eq('org_id', orgId)
        .neq('id', leadMagnetId)

      if (clearDefaultError) throw clearDefaultError
    }

    const { data, error } = await supabase
      .from('campaign_lead_magnets')
      .update({
        name: validation.data.name,
        google_doc_id: googleDocId,
        google_doc_url: validation.data.google_doc_url,
        cta_phrase: validation.data.cta_phrase,
        cta_link_text: validation.data.cta_link_text,
        filename_template: validation.data.filename_template,
        is_default: existing.is_default || validation.data.is_default,
      })
      .eq('id', leadMagnetId)
      .eq('campaign_id', id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error && isMissingRelation(error, 'campaign_lead_magnets')) return migrationRequiredResponse()
    if (error) throw error
    return NextResponse.json({ data })
  } catch (error) {
    console.error('PATCH /api/campaigns/[id]/lead-magnets/[leadMagnetId] failed', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update lead magnet' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; leadMagnetId: string }> },
) {
  try {
    const { id, leadMagnetId } = await params
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const { data: leadMagnet, error: leadMagnetError } = await supabase
      .from('campaign_lead_magnets')
      .select('id,is_default')
      .eq('id', leadMagnetId)
      .eq('campaign_id', id)
      .eq('org_id', orgId)
      .maybeSingle()

    if (leadMagnetError && isMissingRelation(leadMagnetError, 'campaign_lead_magnets')) {
      return migrationRequiredResponse()
    }
    if (leadMagnetError) throw leadMagnetError
    if (!leadMagnet) return NextResponse.json({ error: 'Lead magnet not found' }, { status: 404 })

    const { error: deleteError, count } = await supabase
      .from('campaign_lead_magnets')
      .delete({ count: 'exact' })
      .eq('id', leadMagnetId)
      .eq('campaign_id', id)
      .eq('org_id', orgId)

    if (deleteError && isMissingRelation(deleteError, 'campaign_lead_magnets')) {
      return migrationRequiredResponse()
    }
    if (deleteError) throw deleteError
    if (count === 0) return NextResponse.json({ error: 'Lead magnet not found' }, { status: 404 })

    if (leadMagnet.is_default) {
      const { data: nextDefault, error: nextDefaultError } = await supabase
        .from('campaign_lead_magnets')
        .select('id')
        .eq('campaign_id', id)
        .eq('org_id', orgId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (nextDefaultError) throw nextDefaultError

      if (nextDefault) {
        const { error: promoteError } = await supabase
          .from('campaign_lead_magnets')
          .update({ is_default: true })
          .eq('id', nextDefault.id)
          .eq('campaign_id', id)
          .eq('org_id', orgId)

        if (promoteError) throw promoteError
      }
    }

    return NextResponse.json({ data: { id: leadMagnetId }, success: true })
  } catch (error) {
    console.error('DELETE /api/campaigns/[id]/lead-magnets/[leadMagnetId] failed', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete lead magnet' }, { status: 500 })
  }
}
