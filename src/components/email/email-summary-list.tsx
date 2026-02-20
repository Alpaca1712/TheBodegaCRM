'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Mail,
  Clock,
  User,
  Briefcase,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

interface EmailSummary {
  id: string
  subject: string
  from_address: string
  date: string
  ai_summary: string
  ai_sentiment: 'positive' | 'neutral' | 'negative'
  ai_action_items: string[]
  ai_suggested_stage: string | null
  contact?: {
    id: string
    first_name: string
    last_name: string
  } | null
  deal?: {
    id: string
    title: string
    stage: string
  } | null
  investor?: {
    id: string
    name: string
  } | null
  is_read: boolean
}

interface EmailSummaryListProps {
  summaries: EmailSummary[]
  isLoading?: boolean
  onRefresh?: () => void
  onSelect?: (summary: EmailSummary) => void
}

const sentimentColors: Record<string, string> = {
  positive: 'bg-green-100 text-green-800 border-green-200',
  neutral: 'bg-blue-100 text-blue-800 border-blue-200',
  negative: 'bg-red-100 text-red-800 border-red-200',
}

const sentimentIcons: Record<string, React.ReactNode> = {
  positive: <TrendingUp className="w-4 h-4" />,
  neutral: <Clock className="w-4 h-4" />,
  negative: <TrendingDown className="w-4 h-4" />,
}

export function EmailSummaryList({
  summaries,
  isLoading = false,
  onRefresh,
  onSelect,
}: EmailSummaryListProps) {
  const [expandedSummaryId, setExpandedSummaryId] = useState<string | null>(null)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 1) {
      return 'Just now'
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedSummaryId(expandedSummaryId === id ? null : id)
    if (onSelect && expandedSummaryId !== id) {
      const summary = summaries.find(s => s.id === id)
      if (summary) onSelect(summary)
    }
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Summaries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex space-x-4">
                <div className="rounded-full bg-slate-200 h-12 w-12"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (summaries.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Summaries
          </CardTitle>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Sync Emails
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-slate-500">
            <Mail className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium mb-2">No email summaries yet</p>
            <p className="text-sm mb-6">Connect your email account to start syncing and summarizing emails</p>
            {onRefresh && (
              <Button onClick={onRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email Summaries
          <Badge variant="outline" className="ml-2">
            {summaries.length}
          </Badge>
        </CardTitle>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Sync Emails
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {summaries.map((summary) => (
            <div
              key={summary.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all hover:border-slate-300 ${
                expandedSummaryId === summary.id ? 'border-indigo-300 bg-indigo-50' : ''
              } ${!summary.is_read ? 'border-l-4 border-l-indigo-500' : ''}`}
              onClick={() => toggleExpand(summary.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${sentimentColors[summary.ai_sentiment]}`}>
                    {sentimentIcons[summary.ai_sentiment]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-900">
                        {summary.subject || '(No subject)'}
                      </h3>
                      <Badge className={sentimentColors[summary.ai_sentiment]}>
                        {summary.ai_sentiment}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">
                      From: {summary.from_address}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(summary.date)}
                      </span>
                      {summary.contact && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {summary.contact.first_name} {summary.contact.last_name}
                        </span>
                      )}
                      {summary.deal && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {summary.deal.title} ({summary.deal.stage})
                        </span>
                      )}
                      {summary.investor && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {summary.investor.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-slate-400">
                  {expandedSummaryId === summary.id ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </div>
              </div>
              
              {expandedSummaryId === summary.id && (
                <div className="mt-4 pl-11 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">AI Summary</h4>
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded">
                      {summary.ai_summary}
                    </p>
                  </div>
                  
                  {summary.ai_action_items && summary.ai_action_items.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Action Items</h4>
                      <ul className="space-y-1">
                        {summary.ai_action_items.map((item, index) => (
                          <li key={index} className="text-sm text-slate-600 flex items-start gap-2">
                            <span className="text-indigo-500 mt-1">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {summary.ai_suggested_stage && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Suggested Deal Stage</h4>
                      <Badge variant="outline" className="text-slate-700">
                        {summary.ai_suggested_stage}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
