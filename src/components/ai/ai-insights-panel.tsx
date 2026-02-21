'use client'

import { useState } from 'react'
import { Sparkles, AlertTriangle, CheckCircle2, ArrowRight, Loader2, RefreshCw, Copy, Mail } from 'lucide-react'

interface ContactInsightsProps {
  type: 'contact'
  data: {
    first_name: string
    last_name: string
    email?: string
    phone?: string
    title?: string
    status: string
    source?: string
    notes?: string
    company_name?: string
    activities_count: number
    last_activity_date?: string
    deals_count: number
    deals_value: number
  }
}

interface DealInsightsProps {
  type: 'deal'
  data: {
    title: string
    value: number | null
    stage: string
    probability: number | null
    expected_close_date: string | null
    notes: string | null
    days_in_stage: number
    activities_count: number
    last_activity_date?: string
  }
}

type AiInsightsPanelProps = (ContactInsightsProps | DealInsightsProps) & {
  className?: string
}

type ContactInsightsResult = {
  summary: string
  nextSteps: string[]
  riskLevel: 'low' | 'medium' | 'high'
}

type DealInsightsResult = {
  score: number
  reasoning: string
  suggestedStage?: string
  suggestedActions: string[]
}

export default function AiInsightsPanel(props: AiInsightsPanelProps) {
  const [insights, setInsights] = useState<ContactInsightsResult | DealInsightsResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInsights = async () => {
    setLoading(true)
    setError(null)
    try {
      const endpoint = props.type === 'contact' ? '/api/ai/contact-insights' : '/api/ai/deal-score'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(props.data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to generate insights')
      }
      const data = await res.json()
      setInsights(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate insights')
    } finally {
      setLoading(false)
    }
  }

  const riskColors = {
    low: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400',
    medium: 'text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400',
    high: 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400',
  }

  const scoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-600'
    if (score >= 40) return 'text-amber-600'
    return 'text-red-600'
  }

  if (!insights && !loading && !error) {
    return (
      <div className={`bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 ${props.className || ''}`}>
        <div className="p-5 text-center">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-950 mb-3">
            <Sparkles className="h-5 w-5 text-indigo-500" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">AI Insights</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
            {props.type === 'contact'
              ? 'Get AI-powered analysis of this contact relationship'
              : 'Get AI-powered deal health score and recommendations'}
          </p>
          <button
            onClick={fetchInsights}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate Insights
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 ${props.className || ''}`}>
        <div className="flex items-center gap-2 mb-3">
          <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Analyzing...</span>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded" />
          <div className="h-3 w-4/5 bg-zinc-100 dark:bg-zinc-800 rounded" />
          <div className="h-3 w-3/5 bg-zinc-100 dark:bg-zinc-800 rounded" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-zinc-900 rounded-xl border border-red-200 dark:border-red-800 p-5 ${props.className || ''}`}>
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
          <div>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={fetchInsights}
              className="mt-2 text-xs text-red-500 hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (props.type === 'contact' && insights) {
    const ci = insights as ContactInsightsResult
    return (
      <div className={`bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 ${props.className || ''}`}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">AI Insights</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${riskColors[ci.riskLevel]}`}>
              {ci.riskLevel === 'low' ? 'Healthy' : ci.riskLevel === 'medium' ? 'Needs Attention' : 'At Risk'}
            </span>
            <button onClick={fetchInsights} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <RefreshCw className="h-3.5 w-3.5 text-zinc-400" />
            </button>
          </div>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">{ci.summary}</p>
          {ci.nextSteps.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">Suggested Next Steps</h4>
              <ul className="space-y-1.5">
                {ci.nextSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <ArrowRight className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (props.type === 'deal' && insights) {
    const di = insights as DealInsightsResult
    return (
      <div className={`bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 ${props.className || ''}`}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Deal Health</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${scoreColor(di.score)}`}>{di.score}</span>
            <span className="text-xs text-zinc-400">/100</span>
            <button onClick={fetchInsights} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <RefreshCw className="h-3.5 w-3.5 text-zinc-400" />
            </button>
          </div>
        </div>
        <div className="px-5 py-4 space-y-4">
          {/* Score bar */}
          <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${di.score >= 70 ? 'bg-emerald-500' : di.score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${di.score}%` }}
            />
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">{di.reasoning}</p>
          {di.suggestedStage && (
            <div className="flex items-center gap-2 p-2.5 bg-indigo-50 dark:bg-indigo-950 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" />
              <p className="text-sm text-indigo-700 dark:text-indigo-300">
                Consider moving to <strong>{di.suggestedStage.replace('_', ' ')}</strong>
              </p>
            </div>
          )}
          {di.suggestedActions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">Recommended Actions</h4>
              <ul className="space-y-1.5">
                {di.suggestedActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <ArrowRight className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}

interface EmailDraftButtonProps {
  recipientName: string
  recipientEmail?: string
  recipientTitle?: string
  companyName?: string
  purpose?: 'follow_up' | 'intro' | 'meeting_request' | 'deal_update' | 'thank_you'
  context?: string
  className?: string
}

export function AiEmailDraftButton({
  recipientName,
  recipientEmail,
  recipientTitle,
  companyName,
  purpose = 'follow_up',
  context,
  className,
}: EmailDraftButtonProps) {
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const generateDraft = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/email-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName,
          recipientEmail,
          recipientTitle,
          companyName,
          purpose,
          additionalContext: context,
        }),
      })
      if (!res.ok) throw new Error('Failed to generate draft')
      const data = await res.json()
      setDraft(data)
      setIsOpen(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <>
      <button
        onClick={generateDraft}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 text-sm ${className || 'px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors'}`}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
        {loading ? 'Drafting...' : 'AI Draft Email'}
      </button>

      {isOpen && draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-lg w-full border border-zinc-200 dark:border-zinc-700 animate-scale-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                <h3 className="font-semibold text-zinc-900 dark:text-white">AI Email Draft</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-sm text-zinc-500 hover:text-zinc-700">Close</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1 block">Subject</label>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white flex-1">{draft.subject}</p>
                  <button onClick={() => copyToClipboard(draft.subject)} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <Copy className="h-3.5 w-3.5 text-zinc-400" />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1 block">Body</label>
                <div className="relative">
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                    {draft.body}
                  </p>
                  <button
                    onClick={() => copyToClipboard(draft.body)}
                    className="absolute top-2 right-2 p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  >
                    <Copy className="h-3.5 w-3.5 text-zinc-400" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={generateDraft}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Regenerate
                </button>
                <button
                  onClick={() => {
                    copyToClipboard(`Subject: ${draft.subject}\n\n${draft.body}`)
                    setIsOpen(false)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
