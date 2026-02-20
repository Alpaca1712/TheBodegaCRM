'use client'

import { useState } from 'react'
import { Brain, Mail, Clock, AlertCircle, ArrowRight, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import AiSummaryCard from './ai-summary-card'
import FollowUpDraft from './follow-up-draft'
import { cn } from '@/lib/utils'

export interface EmailSummary {
  id: string
  subject: string
  sender: string
  date: string
  summary: string
  sentiment: 'positive' | 'neutral' | 'negative'
  actionItems: string[]
  suggestedStage?: string
}

export interface FollowUpSuggestion {
  subject: string
  body: string
  basedOnEmailId?: string
}

export interface ContactAiInsightsProps {
  /** Contact ID for fetching data */
  contactId: string
  /** Contact email address */
  contactEmail?: string
  /** Whether to show loading state */
  isLoading?: boolean
  /** Mock data for development */
  mockData?: {
    emailSummaries: EmailSummary[]
    followUpSuggestions: FollowUpSuggestion[]
  }
}

export default function ContactAiInsights({
  contactEmail,
  isLoading = false,
  mockData,
}: ContactAiInsightsProps) {
  const [showAllSummaries, setShowAllSummaries] = useState(false)
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUpSuggestion | null>(null)
  
  // Mock data for development until Gmail integration is complete
  const emailSummaries = mockData?.emailSummaries || []
  const followUpSuggestions = mockData?.followUpSuggestions || []
  
  const recentSummaries = showAllSummaries ? emailSummaries : emailSummaries.slice(0, 2)
  
  if (isLoading) {
    return (
      <Card className="p-4 border-dashed border-slate-300 bg-slate-50">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-slate-200" />
            <div className="h-4 w-32 bg-slate-200 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full bg-slate-200 rounded" />
            <div className="h-3 w-3/4 bg-slate-200 rounded" />
          </div>
        </div>
      </Card>
    )
  }
  
  if (emailSummaries.length === 0) {
    return (
      <Card className="p-6 border-dashed border-slate-300">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 mb-4">
            <Brain className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-sm font-medium text-slate-900 mb-2">No AI insights yet</h3>
          <p className="text-sm text-slate-500 mb-4 max-w-xs mx-auto">
            Connect Gmail to automatically summarize emails and generate follow-up suggestions.
          </p>
          {contactEmail && (
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Connect Gmail
            </Button>
          )}
        </div>
      </Card>
    )
  }
  
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <Brain className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-medium text-slate-900">AI Insights</h3>
            <p className="text-xs text-slate-500">Email analysis & suggestions</p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <Clock className="h-3 w-3" />
          {emailSummaries.length} emails analyzed
        </Badge>
      </div>
      
      <div className="space-y-6">
        {/* Recent Email Summaries */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Recent Email Summaries
            </h4>
            {emailSummaries.length > 2 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllSummaries(!showAllSummaries)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                {showAllSummaries ? 'Show Less' : `Show All (${emailSummaries.length})`}
              </Button>
            )}
          </div>
          
          <div className="space-y-4">
            {recentSummaries.map((summary) => (
              <div key={summary.id} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <div className="flex justify-between items-center">
                    <div className="text-xs font-medium text-slate-700 truncate">
                      {summary.subject}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(summary.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">
                    From: {summary.sender}
                  </div>
                </div>
                <div className="p-4">
                  <AiSummaryCard
                    summary={summary.summary}
                    sentiment={summary.sentiment}
                    actionItems={summary.actionItems}
                    suggestedStage={summary.suggestedStage}
                  />
                  
                  {followUpSuggestions.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const followUp = followUpSuggestions.find(f => f.basedOnEmailId === summary.id)
                        if (followUp) setSelectedFollowUp(followUp)
                      }}
                      className="mt-3 gap-1.5 text-xs"
                    >
                      Generate Follow-up
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Suggested Follow-ups */}
        {followUpSuggestions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-4 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Suggested Follow-ups
            </h4>
            
            <div className="space-y-4">
              {followUpSuggestions.slice(0, 2).map((suggestion, index) => (
                <div
                  key={index}
                  className={cn(
                    'border rounded-lg p-4 cursor-pointer transition-colors',
                    selectedFollowUp?.subject === suggestion.subject
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  )}
                  onClick={() => setSelectedFollowUp(suggestion)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-medium text-slate-900 mb-1">
                        {suggestion.subject}
                      </h5>
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {suggestion.body.substring(0, 100)}...
                      </p>
                    </div>
                    <Button size="sm" variant="ghost">
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Follow-up Editor Modal */}
      {selectedFollowUp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h3 className="font-medium text-slate-900">Edit & Send Follow-up</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFollowUp(null)}
              >
                Close
              </Button>
            </div>
            <div className="p-6">
              <FollowUpDraft
                initialSubject={selectedFollowUp.subject}
                initialBody={selectedFollowUp.body}
                contactName="Contact"
                contactEmail={contactEmail || ""}
                onSend={(subject, body) => {
                  console.log('Sending follow-up:', { subject, body })
                  // TODO: Implement actual email sending
                  alert(`Email would be sent to ${contactEmail || 'contact'} with subject: ${subject}`)
                  setSelectedFollowUp(null)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
