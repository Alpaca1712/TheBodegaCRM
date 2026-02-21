'use client'

import { Sparkles, ExternalLink, Mail } from 'lucide-react'
import { EmailSummary } from '@/types/database'

export interface EmailSummaryListProps {
  emails: EmailSummary[]
  isLoading?: boolean
  onViewFollowUp?: (emailId: string, draft: string) => void
}

const SENTIMENT_STYLES: Record<string, string> = {
  positive: 'bg-green-100 text-green-700 border-green-200',
  neutral: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  negative: 'bg-red-100 text-red-700 border-red-200',
  urgent: 'bg-orange-100 text-orange-700 border-orange-200',
}

const SENTIMENT_LABELS: Record<string, string> = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
  urgent: 'Urgent',
}

export default function EmailSummaryList({ emails, isLoading = false, onViewFollowUp }: EmailSummaryListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow p-4">
            <div className="h-4 bg-zinc-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-zinc-200 rounded w-1/2 mb-3" />
            <div className="h-3 bg-zinc-200 rounded w-full mb-1" />
            <div className="h-3 bg-zinc-200 rounded w-5/6" />
          </div>
        ))}
      </div>
    )
  }

  if (emails.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center">
        <Mail className="mx-auto h-12 w-12 text-zinc-300" />
        <h3 className="mt-4 text-lg font-medium text-zinc-900">No emails found</h3>
        <p className="mt-2 text-sm text-zinc-500">Try syncing your email accounts or adjusting your filters.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {emails.map((email) => (
        <div key={email.id} className="bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow border border-zinc-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-zinc-900 truncate">{email.subject || '(no subject)'}</p>
                {email.ai_sentiment && (
                  <span 
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${SENTIMENT_STYLES[email.ai_sentiment] || SENTIMENT_STYLES.neutral}`}
                  >
                    {SENTIMENT_LABELS[email.ai_sentiment] || email.ai_sentiment}
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-500 mt-0.5 truncate">{email.from_address}</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {new Date(email.date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>

              {email.ai_summary && (
                <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <div className="flex items-center gap-1 mb-1">
                    <Sparkles className="h-3 w-3 text-indigo-500" />
                    <span className="text-xs font-medium text-indigo-600">AI Summary</span>
                  </div>
                  <p className="text-sm text-zinc-700">{email.ai_summary}</p>
                </div>
              )}

              {email.snippet && !email.ai_summary && (
                <p className="text-sm text-zinc-600 mt-2 line-clamp-2">{email.snippet}</p>
              )}

              {email.ai_action_items && email.ai_action_items.length > 0 && (
                <div className="mt-3">
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

              {email.ai_follow_up_draft && onViewFollowUp && (
                <button 
                  onClick={() => onViewFollowUp(email.id, email.ai_follow_up_draft!)}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  View suggested follow-up
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
