const LOCAL_REDIRECT_BASE = 'https://bodega.local'

export function getSafeInternalRedirect(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//')) return null

  try {
    const url = new URL(trimmed, LOCAL_REDIRECT_BASE)
    if (url.origin !== LOCAL_REDIRECT_BASE) return null
    if (url.pathname === '/login' || url.pathname.startsWith('/signup')) return null
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}
