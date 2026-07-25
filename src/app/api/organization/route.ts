import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgScopedClient } from '@/lib/supabase/org-scope'

const adminRoles = new Set(['owner', 'admin'])
const editableRoles = ['admin', 'member', 'viewer'] as const

const mutationSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('update_organization'),
    name: z.string().trim().min(1).max(120).optional(),
    logo_url: z.string().url().optional().nullable(),
  }),
  z.object({
    action: z.literal('invite_member'),
    email: z.string().trim().email(),
    role: z.enum(editableRoles).default('member'),
  }),
  z.object({
    action: z.literal('update_member_role'),
    member_id: z.string().uuid(),
    role: z.enum(['owner', ...editableRoles]),
  }),
  z.object({
    action: z.literal('remove_member'),
    member_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal('cancel_invite'),
    invite_id: z.string().uuid(),
  }),
])

async function getCurrentRole(
  supabase: Awaited<ReturnType<typeof getOrgScopedClient>>['supabase'],
  orgId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data?.role || null
}

export async function GET() {
  try {
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

    const [organization, membership, members, invites] = await Promise.all([
      supabase.from('organizations').select('*').eq('id', orgId).maybeSingle(),
      supabase.from('org_members').select('role').eq('org_id', orgId).eq('user_id', user.id).maybeSingle(),
      supabase
        .from('org_members')
        .select('*')
        .eq('org_id', orgId)
        .order('joined_at', { ascending: true }),
      supabase
        .from('org_invites')
        .select('*')
        .eq('org_id', orgId)
        .is('accepted_at', null)
        .order('created_at', { ascending: false }),
    ])

    if (organization.error) throw organization.error
    if (membership.error) throw membership.error
    if (members.error) throw members.error
    if (invites.error) throw invites.error
    if (!organization.data) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    const admin = createAdminClient()
    const memberUserIds = (members.data || []).map((member) => member.user_id)
    const profiles = memberUserIds.length > 0
      ? await admin
          .from('profiles')
          .select('user_id,full_name,avatar_url')
          .in('user_id', memberUserIds)
      : { data: [], error: null }
    if (profiles.error) throw profiles.error
    const profilesByUserId = new Map(
      (profiles.data || []).map((profile) => [profile.user_id, {
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
      }]),
    )

    return NextResponse.json({
      organization: organization.data,
      currentRole: membership.data?.role || null,
      members: (members.data || []).map((member) => ({
        ...member,
        profiles: profilesByUserId.get(member.user_id) || {
          full_name: null,
          avatar_url: null,
        },
      })),
      invites: invites.data || [],
    })
  } catch (error) {
    console.error('GET /api/organization error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load organization' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, orgId } = await getOrgScopedClient()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

    const validation = mutationSchema.safeParse(await request.json())
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid organization request', details: validation.error.format() }, { status: 400 })
    }

    const currentRole = await getCurrentRole(supabase, orgId, user.id)
    if (!currentRole) return NextResponse.json({ error: 'Organization membership not found' }, { status: 403 })
    const isAdmin = adminRoles.has(currentRole)
    const input = validation.data

    if (input.action === 'update_organization') {
      if (!isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      const updates = {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.logo_url !== undefined ? { logo_url: input.logo_url } : {}),
      }
      const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', orgId)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json(data)
    }

    if (input.action === 'invite_member') {
      if (!isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      const { data, error } = await supabase
        .from('org_invites')
        .insert({
          org_id: orgId,
          email: input.email.toLowerCase(),
          role: input.role,
          invited_by: user.id,
        })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json(data, { status: 201 })
    }

    if (input.action === 'cancel_invite') {
      if (!isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      const { error, count } = await supabase
        .from('org_invites')
        .delete({ count: 'exact' })
        .eq('id', input.invite_id)
        .eq('org_id', orgId)
      if (error) throw error
      if (!count) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
      return NextResponse.json({ success: true })
    }

    const { data: target, error: targetError } = await supabase
      .from('org_members')
      .select('id,user_id,role')
      .eq('id', input.member_id)
      .eq('org_id', orgId)
      .maybeSingle()

    if (targetError) throw targetError
    if (!target) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    if (!isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    if (target.role === 'owner' && currentRole !== 'owner') {
      return NextResponse.json({ error: 'Only the owner can change an owner account' }, { status: 403 })
    }

    if (input.action === 'remove_member') {
      if (target.role === 'owner') return NextResponse.json({ error: 'The organization owner cannot be removed' }, { status: 400 })
      if (target.user_id === user.id) return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 })
      const { error } = await supabase
        .from('org_members')
        .delete()
        .eq('id', input.member_id)
        .eq('org_id', orgId)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (input.role === 'owner' && currentRole !== 'owner') {
      return NextResponse.json({ error: 'Only the owner can assign ownership' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('org_members')
      .update({ role: input.role })
      .eq('id', input.member_id)
      .eq('org_id', orgId)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('POST /api/organization error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update organization' },
      { status: 500 },
    )
  }
}
