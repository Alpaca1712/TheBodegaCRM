'use client'

import { useState, useEffect } from 'react'
import { Users, Mail, Shield, Trash2, UserPlus, Building, Copy, Check } from 'lucide-react'
import Link from 'next/link'
import {
  getActiveOrg,
  getOrgMembers,
  getOrgInvites,
  inviteMember,
  removeMember,
  updateMemberRole,
  cancelInvite,
  getCurrentUserRole,
  updateOrg,
  type Organization,
  type OrgMember,
  type OrgInvite,
  type OrgRole,
} from '@/lib/api/organizations'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700',
  admin: 'bg-indigo-100 text-indigo-700',
  member: 'bg-zinc-100 text-zinc-600',
  viewer: 'bg-zinc-50 text-zinc-500',
}

export default function TeamSettingsPage() {
  const [org, setOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<OrgMember[]>([])
  const [invites, setInvites] = useState<OrgInvite[]>([])
  const [currentRole, setCurrentRole] = useState<OrgRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [copied, setCopied] = useState(false)

  const isAdmin = currentRole === 'owner' || currentRole === 'admin'

  useEffect(() => {
    async function load() {
      const [orgRes, roleRes] = await Promise.all([
        getActiveOrg(),
        getCurrentUserRole(),
      ])

      if (orgRes.data) {
        setOrg(orgRes.data)
        setOrgName(orgRes.data.name)

        const [membersRes, invitesRes] = await Promise.all([
          getOrgMembers(orgRes.data.id),
          getOrgInvites(orgRes.data.id),
        ])
        setMembers(membersRes.data)
        setInvites(invitesRes.data)
      }
      setCurrentRole(roleRes)
      setLoading(false)
    }
    load()
  }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!org || !inviteEmail.trim()) return
    setInviting(true)
    setError(null)

    const { data, error: invErr } = await inviteMember(org.id, inviteEmail.trim(), inviteRole)
    if (invErr) {
      setError(invErr)
    } else if (data) {
      setInvites(prev => [data, ...prev])
      setInviteEmail('')
      setSuccess(`Invite sent to ${inviteEmail}`)
      setTimeout(() => setSuccess(null), 3000)
    }
    setInviting(false)
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!window.confirm(`Remove ${memberName} from the team?`)) return
    const { error: rmErr } = await removeMember(memberId)
    if (rmErr) {
      setError(rmErr)
    } else {
      setMembers(prev => prev.filter(m => m.id !== memberId))
    }
  }

  const handleRoleChange = async (memberId: string, newRole: OrgRole) => {
    const { error: roleErr } = await updateMemberRole(memberId, newRole)
    if (roleErr) {
      setError(roleErr)
    } else {
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
    }
  }

  const handleCancelInvite = async (inviteId: string) => {
    const { error: cancelErr } = await cancelInvite(inviteId)
    if (cancelErr) {
      setError(cancelErr)
    } else {
      setInvites(prev => prev.filter(i => i.id !== inviteId))
    }
  }

  const handleSaveName = async () => {
    if (!org || !orgName.trim()) return
    const { error: updateErr } = await updateOrg(org.id, { name: orgName.trim() })
    if (updateErr) {
      setError(updateErr)
    } else {
      setOrg(prev => prev ? { ...prev, name: orgName.trim() } : prev)
      setEditingName(false)
      setSuccess('Organization name updated')
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const handleCopyInviteLink = async (token: string) => {
    const siteUrl = window.location.origin
    await navigator.clipboard.writeText(`${siteUrl}/invite/${token}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-zinc-200 rounded w-48 mb-6" />
        <div className="bg-white rounded-xl shadow p-6 h-64" />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="text-center py-12">
        <Building className="mx-auto h-12 w-12 text-zinc-300" />
        <h3 className="mt-4 text-lg font-medium text-zinc-900">No organization found</h3>
        <p className="mt-2 text-sm text-zinc-500">Your account isn&apos;t associated with an organization yet.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-zinc-500 hover:text-zinc-900">← Back to settings</Link>
        <h1 className="text-3xl font-bold text-zinc-900 mt-2">Team Settings</h1>
        <p className="text-zinc-500 mt-1">Manage your organization and team members</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-800">{success}</div>
      )}

      {/* Organization Info */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
          <Building className="h-5 w-5" />
          Organization
        </h2>
        <div className="flex items-center gap-4">
          {editingName ? (
            <div className="flex-1 flex gap-2">
              <input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="flex-1 px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button onClick={handleSaveName} className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 shadow-sm shadow-indigo-600/20 text-sm">Save</button>
              <button onClick={() => { setEditingName(false); setOrgName(org.name) }} className="px-3 py-2 border border-zinc-300 rounded-lg text-sm">Cancel</button>
            </div>
          ) : (
            <>
              <div className="flex-1">
                <p className="text-xl font-medium text-zinc-900">{org.name}</p>
                <p className="text-sm text-zinc-500">slug: {org.slug}</p>
              </div>
              {isAdmin && (
                <button onClick={() => setEditingName(true)} className="px-3 py-2 border border-zinc-300 rounded-lg text-sm hover:bg-zinc-50">
                  Edit Name
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Invite Form */}
      {isAdmin && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member
          </h2>
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              required
              className="flex-1 px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member' | 'viewer')}
              className="px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 shadow-sm shadow-indigo-600/20 disabled:opacity-50 text-sm font-medium"
            >
              {inviting ? 'Sending...' : 'Send Invite'}
            </button>
          </form>
        </div>
      )}

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Pending Invites
          </h2>
          <div className="space-y-3">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                <div>
                  <p className="font-medium text-zinc-900">{invite.email}</p>
                  <p className="text-xs text-zinc-500">
                    Invited as {invite.role} · Expires {new Date(invite.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyInviteLink(invite.token)}
                    className="p-2 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100"
                    title="Copy invite link"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleCancelInvite(invite.id)}
                      className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Members */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Members ({members.length})
        </h2>
        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-indigo-700 font-medium text-sm">
                    {(member.profiles?.full_name || member.email || '?')[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-zinc-900">{member.profiles?.full_name || 'Unnamed'}</p>
                  <p className="text-xs text-zinc-500">
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isAdmin && member.role !== 'owner' ? (
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value as OrgRole)}
                    className="px-2 py-1 border border-zinc-200 rounded text-xs"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                ) : (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[member.role]}`}>
                    <Shield className="h-3 w-3" />
                    {ROLE_LABELS[member.role]}
                  </span>
                )}
                {isAdmin && member.role !== 'owner' && (
                  <button
                    onClick={() => handleRemoveMember(member.id, member.profiles?.full_name || 'this member')}
                    className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
