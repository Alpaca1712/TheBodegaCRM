import * as React from 'react'
import Image from 'next/image'

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  className?: string
}

interface AvatarImageProps extends Omit<React.ComponentProps<typeof Image>, 'src' | 'alt'> {
  src: string
  alt: string
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

export function AvatarImage({ className, src, alt, ...props }: AvatarImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={`aspect-square h-full w-full object-cover ${className || ''}`}
      {...props}
    />
  )
}

export function AvatarFallback({ className, children, ...props }: AvatarProps) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center rounded-full bg-zinc-200 ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  )
}
