'use client'

import { AlertTriangle, ArrowRight, X, Check, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export interface DealSuggestionBannerProps {
  /** Current deal stage */
  currentStage: string
  /** AI-suggested stage */
  suggestedStage: string
  /** Explanation from AI */
  reasoning: string
  /** When the suggestion was generated */
  suggestedAt?: string
  /** Callback when user accepts the suggestion */
  onAccept?: (suggestedStage: string) => void
  /** Callback when user dismisses the suggestion */
  onDismiss?: () => void
  /** Optional: stage labels mapping */
  stageLabels?: Record<string, string>
  /** Optional: stage colors mapping */
  stageColors?: Record<string, string>
}

export default function DealSuggestionBanner({
  currentStage,
  suggestedStage,
  reasoning,
  suggestedAt,
  onAccept,
  onDismiss,
  stageLabels = {},
  stageColors = {},
}: DealSuggestionBannerProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)
  
  if (isDismissed) {
    return null
  }
  
  const handleAccept = () => {
    if (onAccept) {
      onAccept(suggestedStage)
    }
    setIsDismissed(true)
  }
  
  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss()
    }
    setIsDismissed(true)
  }
  
  const currentStageLabel = stageLabels[currentStage] || currentStage
  const suggestedStageLabel = stageLabels[suggestedStage] || suggestedStage
  const currentStageColor = stageColors[currentStage] || 'bg-slate-100 text-slate-800'
  const suggestedStageColor = stageColors[suggestedStage] || 'bg-indigo-100 text-indigo-800'
  
  return (
    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex-shrink-0 mt-1">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-4">
              <h3 className="text-sm font-semibold text-amber-900">
                AI Pipeline Suggestion
              </h3>
              {suggestedAt && (
                <div className="flex items-center gap-1 text-xs text-amber-700">
                  <Clock className="h-3 w-3" />
                  {new Date(suggestedAt).toLocaleDateString()}
                </div>
              )}
            </div>
            
            <div className="text-sm text-amber-800">
              <p className="mb-2">{reasoning}</p>
              
              <div className="flex items-center gap-3 mt-3">
                <Badge className={cn('px-3 py-1.5', currentStageColor)}>
                  Current: {currentStageLabel}
                </Badge>
                
                <ArrowRight className="h-4 w-4 text-amber-600" />
                
                <Badge className={cn('px-3 py-1.5', suggestedStageColor)}>
                  Suggested: {suggestedStageLabel}
                </Badge>
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleAccept}
                className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Check className="h-4 w-4" />
                Accept Suggestion
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="gap-1.5 text-amber-700 hover:text-amber-800 hover:bg-amber-100"
              >
                <X className="h-4 w-4" />
                Dismiss
              </Button>
            </div>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-amber-700 hover:text-amber-800 p-1 h-auto"
        >
          {isExpanded ? (
            <span className="sr-only">Collapse</span>
          ) : (
            <span className="sr-only">Expand</span>
          )}
        </Button>
      </div>
    </div>
  )
}
