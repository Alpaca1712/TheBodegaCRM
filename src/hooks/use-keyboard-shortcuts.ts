import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type ShortcutMap = Record<string, () => void>

function isInputFocused(): boolean {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || (el as HTMLElement).isContentEditable
}

export function useGlobalShortcuts() {
  const router = useRouter()

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isInputFocused()) return

    const key = e.key.toLowerCase()
    const meta = e.metaKey || e.ctrlKey

    if (meta && key === 'k') return

    const shortcuts: ShortcutMap = {
      'g+d': () => router.push('/dashboard'),
      'g+c': () => router.push('/contacts'),
      'g+o': () => router.push('/companies'),
      'g+p': () => router.push('/deals'),
      'g+a': () => router.push('/activities'),
      'g+s': () => router.push('/sequences'),
      'g+e': () => router.push('/email'),
      'g+n': () => router.push('/analytics'),
      'g+i': () => router.push('/investors'),
      'g+t': () => router.push('/settings'),
    }

    if (key === 'g' && !meta && !e.shiftKey) {
      e.preventDefault()
      const handler = (nextEvent: KeyboardEvent) => {
        if (isInputFocused()) return
        const nextKey = nextEvent.key.toLowerCase()
        const combo = `g+${nextKey}`
        if (shortcuts[combo]) {
          nextEvent.preventDefault()
          shortcuts[combo]()
        }
        document.removeEventListener('keydown', handler)
      }
      document.addEventListener('keydown', handler)
      setTimeout(() => document.removeEventListener('keydown', handler), 1000)
      return
    }

    if (key === '?' && !meta) {
      e.preventDefault()
      const event = new CustomEvent('show-keyboard-shortcuts')
      document.dispatchEvent(event)
    }
  }, [router])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
