import { buildAnalyticsSummary } from '@/lib/analytics/summary'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found. Please complete setup.' }, { status: 400 })

    const [leadsRes, emailsRes, interactionsRes] = await Promise.all([
      supabase
        .from('leads')
        .select('id,type,stage,source')
        .eq('org_id', orgId),
      supabase
        .from('lead_emails')
        .select('lead_id,direction,cta_type,sent_at,created_at')
        .eq('org_id', orgId),
      supabase
        .from('lead_interactions')
        .select('lead_id,channel,occurred_at')
        .eq('org_id', orgId),
    ])

    if (leadsRes.error) throw leadsRes.error
    if (emailsRes.error) throw emailsRes.error
    if (interactionsRes.error) throw interactionsRes.error

    const response = NextResponse.json(buildAnalyticsSummary(
      leadsRes.data || [],
      emailsRes.data || [],
      interactionsRes.data || [],
    ))
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
    return response
  } catch (error) {
    console.error('GET /api/analytics error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
