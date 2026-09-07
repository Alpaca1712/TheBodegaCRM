import * as React from 'react'
import { cn } from '@/lib/utils'

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  className?: string
  children: React.ReactNode
}

export function Label({ className, children, ...props }: LabelProps) {
  return (
    <label
      className={cn('mb-1 block text-sm font-medium text-foreground', className)}
      {...props}
    >
      {children}
    </label>
  )
}
