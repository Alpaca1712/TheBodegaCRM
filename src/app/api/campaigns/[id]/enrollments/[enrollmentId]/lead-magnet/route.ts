import { NextRequest, NextResponse } from 'next/server'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'
import { getGoogleAccountAccess } from '@/lib/google/auth'
import { generateLeadMagnetPdfFromGoogleDoc, type GoogleDocLeadMagnet } from '@/lib/google/lead-magnets'
import { buildChallengeTrackingUrl, ensureLeadToken } from '@/lib/landing-links/server'
import { isMissingRelation } from '@/lib/supabase/missing-column'
import type { Lead } from '@/types/leads'

interface EnrollmentWithLead {
  id: string
  campaign_id: string
  lead_id: string
  org_id: string
  lead: Pick<Lead, 'id' | 'contact_name' | 'company_name' | 'contact_title' | 'contact_email' | 'lead_token'> | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; enrollmentId: string }> },
) {
  try {
    const { id, enrollmentId } = await params
    const leadMagnetId = request.nextUrl.searchParams.get('lead_magnet_id')
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('campaign_enrollments')
      .select(`
        id,
        campaign_id,
        lead_id,
        org_id,
        lead:leads (
          id,
          contact_name,
          company_name,
          contact_title,
          contact_email,
          lead_token
        )
      `)
      .eq('id', enrollmentId)
      .eq('campaign_id', id)
      .eq('org_id', orgId)
      .single()

    if (enrollmentError || !enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
    const typedEnrollment = enrollment as unknown as EnrollmentWithLead
    const lead = Array.isArray(typedEnrollment.lead) ? typedEnrollment.lead[0] : typedEnrollment.lead
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    let leadMagnetQuery = supabase
      .from('campaign_lead_magnets')
      .select('*')
      .eq('campaign_id', id)
      .eq('org_id', orgId)

    leadMagnetQuery = leadMagnetId
      ? leadMagnetQuery.eq('id', leadMagnetId)
      : leadMagnetQuery.eq('is_default', true)

    let { data: leadMagnet, error: leadMagnetError } = await leadMagnetQuery
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!leadMagnetId && !leadMagnet && !leadMagnetError) {
      const fallback = await supabase
        .from('campaign_lead_magnets')
        .select('*')
        .eq('campaign_id', id)
        .eq('org_id', orgId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      leadMagnet = fallback.data
      leadMagnetError = fallback.error
    }

    if (leadMagnetError && isMissingRelation(leadMagnetError, 'campaign_lead_magnets')) {
      return NextResponse.json({ error: 'Run migration 040_campaign_lead_magnets.sql first.' }, { status: 400 })
    }
    if (leadMagnetError) throw leadMagnetError
    if (!leadMagnet) return NextResponse.json({ error: 'No lead magnet document configured for this campaign' }, { status: 404 })

    const google = await getGoogleAccountAccess(supabase, user.id)
    if (!google) {
      return NextResponse.json({ error: 'Connect Google first, then reconnect with Drive and Docs permissions.' }, { status: 400 })
    }

    const leadToken = await ensureLeadToken({
      supabase,
      leadId: typedEnrollment.lead_id,
      orgId,
      existingToken: lead.lead_token,
    })
    const challengeLink = buildChallengeTrackingUrl({ leadToken, campaignId: id })
    const pdf = await generateLeadMagnetPdfFromGoogleDoc({
      accessToken: google.accessToken,
      leadMagnet: leadMagnet as GoogleDocLeadMagnet,
      lead,
      challengeLink,
    })

    return new NextResponse(pdf.data, {
      headers: {
        'Content-Type': pdf.contentType,
        'Content-Disposition': `attachment; filename="${pdf.filename.replace(/"/g, "'")}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('GET /api/campaigns/[id]/enrollments/[enrollmentId]/lead-magnet failed', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to generate lead magnet PDF' }, { status: 500 })
  }
}
