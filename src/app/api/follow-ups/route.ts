import { NextRequest, NextResponse } from 'next/server'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'
import { FOLLOW_UP_STAGES } from '@/lib/follow-ups/follow-up-engine'
import { LEAD_TYPES } from '@/types/leads'

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

    const type = request.nextUrl.searchParams.get('type')
    let leadsQuery = supabase
      .from('leads')
      .select('*')
      .eq('org_id', orgId)
      .in('stage', [...FOLLOW_UP_STAGES])
      .order('last_contacted_at', { ascending: true, nullsFirst: true })

    if (type && LEAD_TYPES.includes(type as typeof LEAD_TYPES[number])) {
      leadsQuery = leadsQuery.eq('type', type)
    }

    const { data: leads, error: leadsError } = await leadsQuery
    if (leadsError) throw leadsError

    const leadIds = (leads || []).map((lead) => lead.id)
    if (leadIds.length === 0) return NextResponse.json({ leads: [], emails: [] })

    const { data: emails, error: emailsError } = await supabase
      .from('lead_emails')
      .select('*')
      .eq('org_id', orgId)
      .in('lead_id', leadIds)
      .order('created_at', { ascending: false })

    if (emailsError) throw emailsError
    const response = NextResponse.json({ leads: leads || [], emails: emails || [] })
    response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30')
    return response
  } catch (error) {
    console.error('GET /api/follow-ups error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load follow-ups' },
      { status: 500 },
    )
  }
}
