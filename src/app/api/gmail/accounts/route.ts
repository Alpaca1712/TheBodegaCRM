import { NextResponse } from 'next/server'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'

export async function GET() {
  try {
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

    const { data, error } = await supabase
      .from('email_accounts')
      .select('id,email_address,sync_enabled,last_synced_at')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) throw error
    return NextResponse.json({ accounts: data || [] })
  } catch (error) {
    console.error('GET /api/gmail/accounts error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load Gmail accounts' },
      { status: 500 },
    )
  }
}
