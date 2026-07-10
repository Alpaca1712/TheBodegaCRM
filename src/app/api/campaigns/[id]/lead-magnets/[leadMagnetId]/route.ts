import { NextRequest, NextResponse } from 'next/server'
import { isMissingRelation } from '@/lib/supabase/missing-column'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'

function migrationRequiredResponse() {
  return NextResponse.json(
    {
      error: 'Campaign lead magnets need database migration 040_campaign_lead_magnets.sql before documents can be managed.',
      code: 'MIGRATION_REQUIRED',
    },
    { status: 400 },
  )
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
