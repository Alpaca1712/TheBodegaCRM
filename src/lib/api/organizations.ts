import { createClient } from '@/lib/supabase/client'

export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface OrgMember {
  id: string
  org_id: string
  user_id: string
  role: OrgRole
  invited_by: string | null
  joined_at: string
  profiles?: {
    full_name: string | null
    avatar_url: string | null
  }
  email?: string
}

export interface OrgInvite {
  id: string
  org_id: string
  email: string
  role: 'admin' | 'member' | 'viewer'
  invited_by: string
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

/**
 * Get the active org_id for the current user.
 * This is the core helper used by every API file.
 * Returns the user's active_org_id from their profile,
 * or falls back to their first org membership.
 */
export async function getActiveOrgId(): Promise<string | null> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('active_org_id')
    .eq('user_id', session.user.id)
    .single()

  if (profile?.active_org_id) return profile.active_org_id

  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', session.user.id)
    .limit(1)
    .single()

  if (membership?.org_id) {
    await supabase
      .from('profiles')
      .update({ active_org_id: membership.org_id })
      .eq('user_id', session.user.id)
    return membership.org_id
  }

  return null
}

/**
 * Get the current user's active organization details.
 */
export async function getActiveOrg(): Promise<{ data: Organization | null; error: string | null }> {
  const orgId = await getActiveOrgId()
  if (!orgId) return { data: null, error: 'No organization found' }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as Organization, error: null }
}

/**
 * Get all organizations the current user belongs to.
 */
export async function getUserOrgs(): Promise<{ data: Organization[]; error: string | null }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { data: [], error: 'Not authenticated' }

  const { data: memberships, error: memErr } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', session.user.id)

  if (memErr || !memberships?.length) return { data: [], error: memErr?.message || null }

  const orgIds = memberships.map(m => m.org_id)
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('*')
    .in('id', orgIds)

  if (error) return { data: [], error: error.message }
  return { data: orgs as Organization[], error: null }
}

/**
 * Switch the user's active organization.
 */
export async function switchOrg(orgId: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated' }

  const { data: membership } = await supabase
    .from('org_members')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('org_id', orgId)
    .single()

  if (!membership) return { error: 'You are not a member of this organization' }

  const { error } = await supabase
    .from('profiles')
    .update({ active_org_id: orgId })
    .eq('user_id', session.user.id)

  if (error) return { error: error.message }
  return { error: null }
}

/**
 * Update organization details.
 */
export async function updateOrg(orgId: string, updates: { name?: string; logo_url?: string | null }): Promise<{ data: Organization | null; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', orgId)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as Organization, error: null }
}

// ─── Members ───

export async function getOrgMembers(orgId: string): Promise<{ data: OrgMember[]; error: string | null }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('org_members')
    .select('*, profiles(full_name, avatar_url)')
    .eq('org_id', orgId)
    .order('joined_at', { ascending: true })

  if (error) return { data: [], error: error.message }
  return { data: data as OrgMember[], error: null }
}

export async function updateMemberRole(memberId: string, role: OrgRole): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('org_members')
    .update({ role })
    .eq('id', memberId)

  if (error) return { error: error.message }
  return { error: null }
}

export async function removeMember(memberId: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('org_members')
    .delete()
    .eq('id', memberId)

  if (error) return { error: error.message }
  return { error: null }
}

// ─── Invites ───

export async function inviteMember(orgId: string, email: string, role: 'admin' | 'member' | 'viewer' = 'member'): Promise<{ data: OrgInvite | null; error: string | null }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('org_invites')
    .insert({
      org_id: orgId,
      email,
      role,
      invited_by: session.user.id,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as OrgInvite, error: null }
}

export async function getOrgInvites(orgId: string): Promise<{ data: OrgInvite[]; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('org_invites')
    .select('*')
    .eq('org_id', orgId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false })

  if (error) return { data: [], error: error.message }
  return { data: data as OrgInvite[], error: null }
}

export async function cancelInvite(inviteId: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('org_invites')
    .delete()
    .eq('id', inviteId)

  if (error) return { error: error.message }
  return { error: null }
}

/**
 * Accept an invite by token. Called when a user signs up or logs in with a pending invite.
 */
export async function acceptInvite(token: string): Promise<{ orgId: string | null; error: string | null }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { orgId: null, error: 'Not authenticated' }

  const { data: invite, error: findErr } = await supabase
    .from('org_invites')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .single()

  if (findErr || !invite) return { orgId: null, error: 'Invite not found or already accepted' }

  if (new Date(invite.expires_at) < new Date()) {
    return { orgId: null, error: 'Invite has expired' }
  }

  const { error: memberErr } = await supabase
    .from('org_members')
    .insert({
      org_id: invite.org_id,
      user_id: session.user.id,
      role: invite.role,
      invited_by: invite.invited_by,
    })

  if (memberErr) return { orgId: null, error: memberErr.message }

  await supabase
    .from('org_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  await supabase
    .from('profiles')
    .update({ active_org_id: invite.org_id })
    .eq('user_id', session.user.id)

  return { orgId: invite.org_id, error: null }
}

/**
 * Get the current user's role in the active org.
 */
export async function getCurrentUserRole(): Promise<OrgRole | null> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const orgId = await getActiveOrgId()
  if (!orgId) return null

  const { data } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', session.user.id)
    .single()

  return (data?.role as OrgRole) || null
}
