import { apiRequest } from '@/lib/api/request'

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

export interface OrganizationWorkspace {
  organization: Organization
  currentRole: OrgRole | null
  members: OrgMember[]
  invites: OrgInvite[]
}

type Result<T> = { data: T | null; error: string | null }

async function organizationMutation<T>(body: Record<string, unknown>, fallback: string): Promise<Result<T>> {
  try {
    const data = await apiRequest<T>(
      '/api/organization',
      { method: 'POST', body: JSON.stringify(body) },
      fallback,
    )
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : fallback }
  }
}

export async function getOrganizationWorkspace(): Promise<Result<OrganizationWorkspace>> {
  try {
    const data = await apiRequest<OrganizationWorkspace>(
      '/api/organization',
      {},
      'Failed to load organization',
    )
    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load organization',
    }
  }
}

export async function updateOrg(
  _orgId: string,
  updates: { name?: string; logo_url?: string | null },
): Promise<Result<Organization>> {
  return organizationMutation<Organization>(
    { action: 'update_organization', ...updates },
    'Failed to update organization',
  )
}

export async function updateMemberRole(memberId: string, role: OrgRole): Promise<{ error: string | null }> {
  const result = await organizationMutation<OrgMember>(
    { action: 'update_member_role', member_id: memberId, role },
    'Failed to update team member',
  )
  return { error: result.error }
}

export async function removeMember(memberId: string): Promise<{ error: string | null }> {
  const result = await organizationMutation<{ success: true }>(
    { action: 'remove_member', member_id: memberId },
    'Failed to remove team member',
  )
  return { error: result.error }
}

export async function inviteMember(
  _orgId: string,
  email: string,
  role: 'admin' | 'member' | 'viewer' = 'member',
): Promise<Result<OrgInvite>> {
  return organizationMutation<OrgInvite>(
    { action: 'invite_member', email, role },
    'Failed to invite team member',
  )
}

export async function cancelInvite(inviteId: string): Promise<{ error: string | null }> {
  const result = await organizationMutation<{ success: true }>(
    { action: 'cancel_invite', invite_id: inviteId },
    'Failed to cancel invite',
  )
  return { error: result.error }
}
