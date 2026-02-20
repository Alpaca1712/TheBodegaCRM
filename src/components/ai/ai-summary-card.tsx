'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertCircle, ThumbsUp, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AiSummaryCardProps {
  summary: string
  sentiment: 'positive' | 'neutral' | 'negative' | 'urgent'
  actionItems: string[]
  suggestedStage?: string | null
  className?: string
}

const sentimentConfig = {
  positive: {
    label: 'Positive',
    icon: ThumbsUp,
    variant: 'default' as const,
    color: 'bg-green-100 text-green-800 border-green-200',
  },
  neutral: {
    label: 'Neutral',
    icon: Clock,
    variant: 'secondary' as const,
    color: 'bg-slate-100 text-slate-800 border-slate-200',
  },
  negative: {
    label: 'Negative',
    icon: AlertCircle,
    variant: 'destructive' as const,
    color: 'bg-red-100 text-red-800 border-red-200',
  },
  urgent: {
    label: 'Urgent',
    icon: AlertCircle,
    variant: 'destructive' as const,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
  },
}

export default function AiSummaryCard({
  summary,
  sentiment,
  actionItems,
  suggestedStage,
  className,
}: AiSummaryCardProps) {
  const config = sentimentConfig[sentiment]
  const SentimentIcon = config.icon
  
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">AI Summary</CardTitle>
          <Badge 
            variant={config.variant}
            className={cn('gap-1.5', config.color)}
          >
            <SentimentIcon className="h-3.5 w-3.5" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <p className="text-slate-700 text-sm leading-relaxed">{summary}</p>
        </div>
        
        {actionItems.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-800 mb-2">Action Items</h4>
            <ul className="space-y-2">
              {actionItems.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-600 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {suggestedStage && (
          <div>
            <h4 className="text-sm font-medium text-slate-800 mb-1">Suggested Deal Stage</h4>
            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200">
              {suggestedStage}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
