import * as React from 'react'

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  className?: string
  variant?: 'default' | 'secondary' | 'outline' | 'destructive'
}

export function Badge({ 
  className, 
  children, 
  variant = 'default',
  ...props 
}: BadgeProps) {
  const variantStyles = {
    default: 'bg-indigo-100 text-indigo-800',
    secondary: 'bg-slate-100 text-slate-800',
    outline: 'border border-slate-300',
    destructive: 'bg-red-100 text-red-800',
  }
  
  return (
    <div
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${variantStyles[variant]} ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  )
}
