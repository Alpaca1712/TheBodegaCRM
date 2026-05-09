import * as React from 'react'

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

    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      adjustHeight()
      if (onInput) onInput(e)
    }

    return (
      <textarea
        className={
          'flex min-h-[80px] w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 ' +
          'text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 ' +
          'focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 ' +
          'disabled:opacity-50 disabled:cursor-not-allowed ' +
          (autoResize ? 'resize-none overflow-hidden' : 'resize-y') +
          ' transition-colors ' +
          (className || '')
        }
        ref={innerRef}
        onInput={handleInput}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'
