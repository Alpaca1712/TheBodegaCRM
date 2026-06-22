import { createClient } from '@/lib/supabase/server'

export async function getOrgScopedClient() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, user: null, orgId: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('active_org_id')
    .eq('user_id', user.id)
    .single()

  if (profile?.active_org_id) {
    return { supabase, user, orgId: profile.active_org_id as string }
  }

  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (membership?.org_id) {
    await supabase
      .from('profiles')
      .update({ active_org_id: membership.org_id })
      .eq('user_id', user.id)

    return { supabase, user, orgId: membership.org_id as string }
  }

  return { supabase, user, orgId: null }
}
