import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode
  className?: string
  variant?: 'default' | 'primary' | 'outline' | 'secondary' | 'ghost' | 'destructive'
  size?: 'default' | 'sm' | 'lg'
  isLoading?: boolean
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  default: 'bg-foreground text-background hover:opacity-90',
  primary: 'bg-primary text-primary-foreground hover:opacity-90',
  outline: 'border border-border bg-transparent text-foreground hover:bg-muted',
  secondary: 'bg-muted text-foreground hover:bg-muted/80',
  ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
  destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
}

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  default: 'h-10 px-4 py-2 text-sm',
  sm: 'h-8 px-3 text-sm',
  lg: 'h-11 px-6 text-sm',
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
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && (
        <Loader2
          className={cn(
            'h-4 w-4 animate-spin text-current',
            children != null && children !== false ? 'mr-2' : undefined,
          )}
        />
      )}
      {children}
    </button>
  )
}
