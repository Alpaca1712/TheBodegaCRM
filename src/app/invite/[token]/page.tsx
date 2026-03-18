'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Users, ShieldCheck, AlertTriangle } from 'lucide-react'

interface InviteDetails {
  email: string
  role: string
  orgName: string
  orgId: string
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/invites/${token}`)
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Invalid invite link')
          return
        }
        setInvite(await res.json())
      } catch {
        setError('Failed to load invite')
      } finally {
        setLoading(false)
      }
    }
    fetchInvite()
  }, [token])

  const handleAccept = async () => {
    setAccepting(true)
    try {
      const res = await fetch(`/api/invites/${token}`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?message=Sign in to accept your invite&next=/invite/${token}`)
          return
        }
        setError(data.error || 'Failed to accept invite')
        setAccepting(false)
        return
      }

      router.push('/dashboard')
    } catch {
      setError('Failed to accept invite')
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900">{error}</h1>
          <p className="text-sm text-zinc-500">
            This invite link may have expired or already been used.
          </p>
          <Link
            href="/login"
            className="inline-block px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  if (!invite) return null

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <Users className="h-7 w-7 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">
            Join {invite.orgName}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            You&apos;ve been invited to join as a <span className="font-medium text-zinc-700">{invite.role}</span>
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-zinc-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-zinc-900">{invite.orgName}</p>
              <p className="text-xs text-zinc-500">Organization</p>
            </div>
          </div>
          <div className="text-xs text-zinc-400 border-t border-zinc-100 pt-3">
            Invite sent to <span className="font-medium text-zinc-600">{invite.email}</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50"
          >
            {accepting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {accepting ? 'Joining...' : 'Accept Invite'}
          </button>

          <div className="flex items-center gap-2">
            <Link
              href={`/login?invite_token=${token}&next=/invite/${token}`}
              className="flex-1 text-center px-4 py-2.5 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
            >
              Sign In
            </Link>
            <Link
              href={`/signup?invite_token=${token}`}
              className="flex-1 text-center px-4 py-2.5 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
            >
              Create Account
            </Link>
          </div>

          <p className="text-center text-[11px] text-zinc-400">
            Already have an account? Sign in. New here? Create an account first.
          </p>
        </div>
      </div>
    </div>
  )
}
