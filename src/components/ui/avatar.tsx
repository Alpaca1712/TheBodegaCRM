import * as React from 'react'

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  className?: string
}

interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string
}

export function Avatar({ className, children, ...props }: AvatarProps) {
  return (
    <div
      className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function AvatarImage({ className, ...props }: AvatarImageProps) {
  return (
    <img
      className={`aspect-square h-full w-full ${className || ''}`}
      {...props}
    />
  )
}

export function AvatarFallback({ className, children, ...props }: AvatarProps) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center rounded-full bg-slate-200 ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  )
}
