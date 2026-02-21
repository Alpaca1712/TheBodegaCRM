import * as React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={
        'flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 ' +
        'text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 ' +
        'focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 ' +
        'disabled:cursor-not-allowed ' + (className || '')
      }
      {...props}
    />
  )
}
