'use client'

import * as React from 'react'
import { X } from 'lucide-react'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  side?: 'right' | 'left'
  className?: string
}

export function Sheet({ open, onOpenChange, children, side = 'right', className }: SheetProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onOpenChange])

  if (!open) return null

  const slideFrom = side === 'right'
    ? 'right-0 animate-slide-in-right'
    : 'left-0 animate-slide-in-left'

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={`absolute top-0 bottom-0 ${slideFrom} w-full max-w-lg bg-white dark:bg-zinc-900 shadow-2xl flex flex-col ${className || ''}`}
      >
        {children}
      </div>
    </div>
  )
}

interface SheetHeaderProps {
  children: React.ReactNode
  onClose?: () => void
  className?: string
}

export function SheetHeader({ children, onClose, className }: SheetHeaderProps) {
  return (
    <div className={`flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 ${className || ''}`}>
      <div className="flex-1 min-w-0">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-4 p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}

interface SheetBodyProps {
  children: React.ReactNode
  className?: string
}

export function SheetBody({ children, className }: SheetBodyProps) {
  return (
    <div className={`flex-1 overflow-y-auto px-6 py-4 ${className || ''}`}>
      {children}
    </div>
  )
}

interface SheetFooterProps {
  children: React.ReactNode
  className?: string
}

export function SheetFooter({ children, className }: SheetFooterProps) {
  return (
    <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 ${className || ''}`}>
      {children}
    </div>
  )
}
