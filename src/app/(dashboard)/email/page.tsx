'use client'

import { useState, useEffect } from 'react'
import { Mail, Sparkles, ArrowRight, AlertCircle, CheckCircle2, Inbox, ExternalLink, Copy, X, RefreshCw, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface EmailAccount {
  id: string
  email_address: string
  sync_enabled: boolean
  last_synced_at: string | null
}

import type { EmailSummary } from '@/types/database'

const SENTIMENT_STYLES: Record<string, string> = {
  positive: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  neutral: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  negative: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  urgent: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
}

export default function EmailPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [emails, setEmails] = useState<EmailSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [expandedFollowUp, setExpandedFollowUp] = useState<string | null>(null)
  const [searchParams] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search)
    }
    return new URLSearchParams()
  })

  const connected = searchParams.get('connected') === 'true'
  const error = searchParams.get('error')

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/gmail/sync', { method: 'POST' })
      if (res.ok) {
        toast.success('Emails synced successfully')
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const { data: summaries } = await supabase
            .from('email_summaries')
            .select('*')
            .eq('user_id', session.user.id)
            .order('date', { ascending: false })
            .limit(30)
          setEmails(summaries || [])
        }
      } else {
        toast.error('Sync failed')
      }
    } catch {
      toast.error('Sync failed')
    }
    setSyncing(false)
  }

  const copyFollowUp = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Follow-up copied to clipboard')
  }

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)
        return
      }

      const { data: accts } = await supabase
        .from('email_accounts')
        .select('id, email_address, sync_enabled, last_synced_at')
        .eq('user_id', session.user.id)

      setAccounts(accts || [])

      if (accts && accts.length > 0) {
        const { data: summaries } = await supabase
          .from('email_summaries')
          .select('*')
          .eq('user_id', session.user.id)
          .order('date', { ascending: false })
          .limit(30)

        setEmails(summaries || [])
      }

      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-zinc-200 rounded w-48 mb-6" />
        <div className="bg-white rounded-xl shadow p-6 h-64" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Email AI</h1>
          <p className="text-zinc-500 mt-1">AI-powered email summaries and follow-up suggestions</p>
        </div>
      </div>

      {/* Status banners */}
      {connected && (
        <div className="mb-6 rounded-lg bg-green-50 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-800">Gmail connected successfully! Emails will sync shortly.</p>
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-800">
            {error === 'no_code' ? 'Authorization failed — no code received from Google.' : 'Failed to connect Gmail. Please try again.'}
          </p>
        </div>
      )}

      {accounts.length === 0 ? (
        /* No account connected */
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
            <Mail className="h-8 w-8 text-indigo-600" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-zinc-900">Connect your Gmail</h2>
          <p className="mt-2 text-zinc-500 max-w-md mx-auto">
            Link your Gmail account to get AI-powered summaries, sentiment analysis, and follow-up suggestions for your CRM contacts.
          </p>
          <div className="mt-6 space-y-3">
            <a
              href="/api/gmail/connect"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-500 shadow-sm shadow-indigo-600/20 transition-colors"
            >
              <Mail className="h-4 w-4" />
              Connect Gmail
              <ArrowRight className="h-4 w-4" />
            </a>
            <p className="text-xs text-zinc-400">
              Read-only access. We only store metadata and AI summaries — not full email content.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="p-4 bg-zinc-50 rounded-lg">
              <Sparkles className="h-5 w-5 text-indigo-500 mb-2" />
              <h3 className="font-medium text-zinc-900 text-sm">AI Summaries</h3>
              <p className="text-xs text-zinc-500 mt-1">Get quick summaries of emails related to your deals and contacts.</p>
            </div>
            <div className="p-4 bg-zinc-50 rounded-lg">
              <ArrowRight className="h-5 w-5 text-indigo-500 mb-2" />
              <h3 className="font-medium text-zinc-900 text-sm">Follow-up Drafts</h3>
              <p className="text-xs text-zinc-500 mt-1">AI-generated follow-up emails you can send with one click.</p>
            </div>
            <div className="p-4 bg-zinc-50 rounded-lg">
              <Inbox className="h-5 w-5 text-indigo-500 mb-2" />
              <h3 className="font-medium text-zinc-900 text-sm">Deal Intelligence</h3>
              <p className="text-xs text-zinc-500 mt-1">Auto-detect deal stage changes from email conversations.</p>
            </div>
          </div>
        </div>
      ) : (
        /* Account connected — show email summaries */
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{accounts[0].email_address}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {accounts[0].last_synced_at
                    ? `Last synced: ${new Date(accounts[0].last_synced_at).toLocaleString()}`
                    : 'Pending initial sync'}
                </p>
              </div>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>

          {emails.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center">
              <Inbox className="mx-auto h-12 w-12 text-zinc-300" />
              <h3 className="mt-4 text-lg font-medium text-zinc-900">No emails synced yet</h3>
              <p className="mt-2 text-sm text-zinc-500">Emails will appear here once the first sync completes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {emails.map((email) => (
                <div key={email.id} className="bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-zinc-900 truncate">{email.subject || '(no subject)'}</p>
                        {email.ai_sentiment && (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SENTIMENT_STYLES[email.ai_sentiment] || SENTIMENT_STYLES.neutral}`}>
                            {email.ai_sentiment}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-500 mt-0.5">{email.from_address}</p>

                      {email.ai_summary ? (
                        <div className="mt-2 p-3 bg-indigo-50 rounded-lg">
                          <div className="flex items-center gap-1 mb-1">
                            <Sparkles className="h-3 w-3 text-indigo-500" />
                            <span className="text-xs font-medium text-indigo-600">AI Summary</span>
                          </div>
                          <p className="text-sm text-zinc-700">{email.ai_summary}</p>
                        </div>
                      ) : email.snippet ? (
                        <p className="text-sm text-zinc-600 mt-1 line-clamp-2">{email.snippet}</p>
                      ) : null}

                      {email.ai_action_items && email.ai_action_items.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-zinc-500 mb-1">Action items:</p>
                          <ul className="space-y-1">
                            {email.ai_action_items.map((item, i) => (
                              <li key={i} className="text-xs text-zinc-600 flex items-start gap-1">
                                <span className="text-indigo-500 mt-0.5">•</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {email.ai_follow_up_draft && (
                        <>
                          <button
                            onClick={() => setExpandedFollowUp(expandedFollowUp === email.id ? null : email.id)}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                          >
                            {expandedFollowUp === email.id ? <X className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
                            {expandedFollowUp === email.id ? 'Hide follow-up' : 'View suggested follow-up'}
                          </button>
                          {expandedFollowUp === email.id && (
                            <div className="mt-2 p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg border border-emerald-100 dark:border-emerald-900">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" /> AI Follow-up Draft
                                </span>
                                <button
                                  onClick={() => copyFollowUp(email.ai_follow_up_draft!)}
                                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1"
                                >
                                  <Copy className="h-3 w-3" /> Copy
                                </button>
                              </div>
                              <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{email.ai_follow_up_draft}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 whitespace-nowrap">
                      {new Date(email.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
