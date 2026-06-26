'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Mail, RefreshCw, Users } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface EmailAccount {
  id: string
  email_address: string
  sync_enabled: boolean
  last_synced_at: string | null
}

interface SyncResult {
  leadsScanned?: number
  leadsWithEmails?: number
  leadsUpdated?: number
  newEmails?: number
  pipelineChanges?: Array<{ leadName: string; from: string; to: string; reason: string }>
  message?: string
}

export default function EmailPage() {
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<SyncResult | null>(null)

  const connected = searchParams.get('connected') === 'true'
  const error = searchParams.get('error')

  const loadAccounts = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setAccounts([])
      setLoading(false)
      return
    }

    const { data: accts } = await supabase
      .from('email_accounts')
      .select('id, email_address, sync_enabled, last_synced_at')
      .eq('user_id', user.id)

    setAccounts(accts || [])
    setLoading(false)
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/gmail/sync', { method: 'POST' })
      const body = await res.json()

      if (res.ok && body.success) {
        setLastResult(body)

        const parts = []
        if (body.leadsScanned > 0) parts.push(`${body.leadsScanned} leads checked`)
        if (body.newEmails > 0) parts.push(`${body.newEmails} lead emails saved`)
        if (body.leadsUpdated > 0) parts.push(`${body.leadsUpdated} leads updated`)
        if (body.pipelineChanges?.length > 0) parts.push(`${body.pipelineChanges.length} stage changes`)
        toast.success(parts.length > 0 ? parts.join(' | ') : body.message || 'Synced — nothing new')

        await loadAccounts()
      } else if (body.code === 'TOKEN_EXPIRED') {
        toast.error('Gmail connection expired. Please reconnect in Settings > Email.')
      } else {
        toast.error(body.error || body.message || 'Sync failed')
      }
    } catch (err) {
      console.error('[Gmail Sync] Error:', err)
      toast.error('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    void loadAccounts()
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-6 h-64 rounded-xl bg-white shadow dark:bg-zinc-900" />
      </div>
    )
  }

  const account = accounts[0]

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-950 dark:text-zinc-50">Gmail Sync</h1>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            Sync Gmail conversations for CRM leads only.
          </p>
        </div>
      </div>

      {connected && (
        <div className="mb-6 flex items-center gap-3 rounded-lg bg-green-50 p-4 dark:bg-green-950/30">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          <p className="text-sm text-green-800 dark:text-green-200">Gmail connected successfully.</p>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-lg bg-red-50 p-4 dark:bg-red-950/30">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-800 dark:text-red-200">
            {error === 'no_code' ? 'Authorization failed: no code received from Google.' : 'Failed to connect Gmail. Please try again.'}
          </p>
        </div>
      )}

      {!account ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">
            <Mail className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-zinc-950 dark:text-zinc-50">Connect Gmail</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Rocoto only searches conversations for contacts already saved as leads. It stores those messages on the lead profile and can update campaign stages from the thread.
          </p>
          <a
            href="/api/gmail/connect"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-medium text-white shadow-sm shadow-red-600/20 transition-colors hover:bg-red-500"
          >
            <Mail className="h-4 w-4" />
            Connect Gmail
            <ArrowRight className="h-4 w-4" />
          </a>
        </section>
      ) : (
        <div className="space-y-6">
          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{account.email_address}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {account.last_synced_at
                      ? `Last synced ${new Date(account.last_synced_at).toLocaleString()}`
                      : 'No sync has run yet'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {syncing ? 'Syncing leads...' : 'Sync lead emails'}
              </button>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <Users className="h-5 w-5 text-red-600 dark:text-red-300" />
              <h3 className="mt-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50">Lead scoped</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                Gmail is searched by saved lead email addresses, not as a general inbox summary tool.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <Mail className="h-5 w-5 text-red-600 dark:text-red-300" />
              <h3 className="mt-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50">Saved on lead profiles</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                Matching Gmail messages go into the lead timeline so follow-ups and campaigns have context.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <RefreshCw className="h-5 w-5 text-red-600 dark:text-red-300" />
              <h3 className="mt-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50">Campaign-aware</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                Replies can update campaign events and lead stage when the lead is enrolled.
              </p>
            </div>
          </section>

          {lastResult && (
            <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Last sync</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <Metric label="Leads checked" value={lastResult.leadsScanned || 0} />
                <Metric label="With email threads" value={lastResult.leadsWithEmails || 0} />
                <Metric label="New emails saved" value={lastResult.newEmails || 0} />
                <Metric label="Leads updated" value={lastResult.leadsUpdated || 0} />
              </div>
              {lastResult.pipelineChanges && lastResult.pipelineChanges.length > 0 && (
                <div className="mt-4 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950/40">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Stage changes</p>
                  <div className="mt-2 space-y-2">
                    {lastResult.pipelineChanges.map((change) => (
                      <p key={`${change.leadName}-${change.to}`} className="text-sm text-zinc-700 dark:text-zinc-300">
                        {change.leadName}: {change.from.replaceAll('_', ' ')} to {change.to.replaceAll('_', ' ')}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <p className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{value}</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  )
}
