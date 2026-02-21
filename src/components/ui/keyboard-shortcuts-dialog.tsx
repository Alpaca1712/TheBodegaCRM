'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const shortcutGroups = [
  {
    label: 'Navigation',
    shortcuts: [
      { keys: ['G', 'D'], description: 'Go to Dashboard' },
      { keys: ['G', 'C'], description: 'Go to Contacts' },
      { keys: ['G', 'O'], description: 'Go to Companies' },
      { keys: ['G', 'P'], description: 'Go to Pipeline' },
      { keys: ['G', 'A'], description: 'Go to Activities' },
      { keys: ['G', 'S'], description: 'Go to Sequences' },
      { keys: ['G', 'E'], description: 'Go to Email' },
      { keys: ['G', 'N'], description: 'Go to Analytics' },
      { keys: ['G', 'I'], description: 'Go to Investors' },
    ],
  },
  {
    label: 'Quick Actions',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Open command palette' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
    ],
  },
]

export default function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = () => setOpen(true)
    document.addEventListener('show-keyboard-shortcuts', handler)
    return () => document.removeEventListener('show-keyboard-shortcuts', handler)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-white">Keyboard Shortcuts</h2>
          <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {shortcutGroups.map((group) => (
            <div key={group.label}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-2">
                {group.label}
              </h3>
              <div className="space-y-1.5">
                {group.shortcuts.map((s) => (
                  <div key={s.description} className="flex items-center justify-between py-1">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">{s.description}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, i) => (
                        <span key={i}>
                          <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded border border-zinc-200 dark:border-zinc-700">
                            {k}
                          </kbd>
                          {i < s.keys.length - 1 && <span className="text-zinc-300 dark:text-zinc-600 mx-0.5 text-xs">then</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 text-center">
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Press <kbd className="px-1 py-0.5 text-[10px] bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700">?</kbd> anytime to toggle this panel</p>
        </div>
      </div>
    </div>
  )
}
