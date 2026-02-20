import * as React from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string
}

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={
        'flex min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 ' +
        'text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 ' +
        'focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 ' +
        'disabled:cursor-not-allowed resize-y ' + (className || '')
      }
      {...props}
    />
  )
}
