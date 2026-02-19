'use client'

import * as React from 'react'

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
}

export function Switch({ checked, onCheckedChange, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={
        'inline-flex h-6 w-11 items-center rounded-full ' +
        'transition-colors focus-visible:outline-none focus-visible:ring-2 ' +
        'focus-visible:ring-offset-2 ' + (checked ? 'bg-indigo-600' : 'bg-slate-300') + ' ' + (className || '')
      }
    >
      <span
        className={
          'pointer-events-none inline-block h-5 w-5 transform rounded-full ' +
          'bg-white shadow-lg ring-0 transition-transform ' + 
          (checked ? 'translate-x-6' : 'translate-x-1')
        }
      />
    </button>
  )
}
