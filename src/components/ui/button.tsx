import * as React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode
  className?: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive'
  size?: 'default' | 'sm' | 'lg'
}

export function Button({ 
  className, 
  children, 
  variant = 'default',
  size = 'default',
  ...props 
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
  
  const variantStyles = {
    default: 'bg-indigo-600 text-white hover:bg-indigo-700',
    outline: 'border border-slate-300 bg-transparent hover:bg-slate-100',
    secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300',
    ghost: 'hover:bg-slate-100',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
  }
  
  const sizeStyles = {
    default: 'h-10 px-4 py-2',
    sm: 'h-8 px-3 text-sm',
    lg: 'h-12 px-8',
  }
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  )
}
