'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeadStage } from '@/types'

/** Forward funnel shared by blog, web, partnerships, and Coo Crew. */
export const PIPELINE_STAGES: LeadStage[] = [
  'new',
  'contacted',
  'replied',
  'interested',
  'meeting_booked',
  'customer',
]

const EXIT_STAGES: LeadStage[] = [
  'not_interested',
  'unsubscribed',
  'bounced',
  'lost',
]

function labelFor(stage: LeadStage) {
  return stage.replace(/_/g, ' ')
}

export function PipelineStepper({
  stage,
  onSelect,
  disabled,
  className,
}: {
  stage: LeadStage
  onSelect?: (stage: LeadStage) => void
  disabled?: boolean
  className?: string
}) {
  const onPipeline = PIPELINE_STAGES.includes(stage)
  const currentIndex = onPipeline ? PIPELINE_STAGES.indexOf(stage) : -1
  const isExit = EXIT_STAGES.includes(stage)

  return (
    <div className={cn('space-y-2', className)}>
      <ol className="flex items-start gap-0 overflow-x-auto pb-1">
        {PIPELINE_STAGES.map((step, index) => {
          const done = onPipeline && index < currentIndex
          const current = onPipeline && index === currentIndex
          const upcoming = !done && !current
          const clickable = Boolean(onSelect) && !disabled

          return (
            <li key={step} className="flex min-w-0 flex-1 items-start">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onSelect?.(step)}
                className={cn(
                  'group flex w-full min-w-[4.5rem] flex-col items-center gap-1.5 px-0.5 text-center',
                  clickable ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                <span className="flex w-full items-center">
                  {index > 0 ? (
                    <span
                      className={cn(
                        'h-0.5 flex-1 rounded-full',
                        done || current ? 'bg-foreground' : 'bg-border',
                      )}
                      aria-hidden
                    />
                  ) : (
                    <span className="flex-1" aria-hidden />
                  )}
                  <span
                    className={cn(
                      'relative z-[1] flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors',
                      done && 'border-foreground bg-foreground text-background',
                      current && 'border-foreground bg-background text-foreground ring-2 ring-foreground/15',
                      upcoming && 'border-border bg-muted text-muted-foreground',
                      clickable && upcoming && 'group-hover:border-foreground/40 group-hover:text-foreground',
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : index + 1}
                  </span>
                  {index < PIPELINE_STAGES.length - 1 ? (
                    <span
                      className={cn(
                        'h-0.5 flex-1 rounded-full',
                        done ? 'bg-foreground' : 'bg-border',
                      )}
                      aria-hidden
                    />
                  ) : (
                    <span className="flex-1" aria-hidden />
                  )}
                </span>
                <span
                  className={cn(
                    'max-w-full px-0.5 text-[10px] font-medium leading-tight capitalize',
                    current ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {labelFor(step)}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      {isExit ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs">
          <span className="font-medium text-muted-foreground">Exited pipeline:</span>
          <span className="rounded-md bg-background px-2 py-0.5 font-semibold capitalize text-foreground">
            {labelFor(stage)}
          </span>
          {onSelect && !disabled ? (
            <span className="text-muted-foreground">Click a stage above to move them back onto the funnel.</span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
