import * as React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        className={
          'flex h-10 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 ' +
          'text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 ' +
          'focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 ' +
          'disabled:opacity-50 disabled:cursor-not-allowed transition-colors ' + (className || '')
        }
        ref={ref}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
