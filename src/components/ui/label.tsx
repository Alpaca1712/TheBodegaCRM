import * as React from 'react'

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  className?: string
  children: React.ReactNode
}

export function Label({ className, children, ...props }: LabelProps) {
  return (
    <label
      className={
        'block text-sm font-medium text-slate-700 mb-1 ' + (className || '')
      }
      {...props}
    >
      {children}
    </label>
  )
}
