import * as React from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={
          'flex min-h-[80px] w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 ' +
          'text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 ' +
          'focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 ' +
          'disabled:opacity-50 disabled:cursor-not-allowed resize-y transition-colors ' + (className || '')
        }
        ref={ref}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'
