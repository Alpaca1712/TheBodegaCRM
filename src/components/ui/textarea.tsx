import * as React from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string
  autoResize?: boolean
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoResize, onInput, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement>(null)

    React.useImperativeHandle(ref, () => innerRef.current!)

    const adjustHeight = React.useCallback(() => {
      if (autoResize && innerRef.current) {
        innerRef.current.style.height = 'auto'
        innerRef.current.style.height = `${innerRef.current.scrollHeight}px`
      }
    }, [autoResize])

    React.useEffect(() => {
      adjustHeight()
    }, [adjustHeight, props.value, props.defaultValue])

    const handleInput = (e: React.InputEvent<HTMLTextAreaElement>) => {
      adjustHeight()
      if (onInput) onInput(e)
    }

    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground',
          'placeholder:text-muted-foreground',
          'focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          autoResize ? 'resize-none overflow-hidden' : 'resize-y',
          'transition-colors',
          className,
        )}
        ref={innerRef}
        onInput={handleInput}
        {...props}
      />
    )
  },
)

Textarea.displayName = 'Textarea'
