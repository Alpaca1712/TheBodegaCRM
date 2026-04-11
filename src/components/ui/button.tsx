import * as React from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode
  className?: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive'
  size?: 'default' | 'sm' | 'lg'
  isLoading?: boolean
}

export function Button({ 
  className, 
  children, 
  variant = 'default',
  size = 'default',
  isLoading = false,
  disabled,
  ...props 
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
  
  const variantStyles = {
    default: 'bg-indigo-600 text-white hover:bg-indigo-700',
    outline: 'border border-zinc-300 bg-transparent hover:bg-zinc-100',
    secondary: 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300',
    ghost: 'hover:bg-zinc-100',
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
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}
