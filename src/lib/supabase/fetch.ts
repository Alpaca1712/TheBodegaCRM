const DEFAULT_SUPABASE_FETCH_TIMEOUT_MS = 10_000

export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}) {
  const timeoutMs = Number(process.env.SUPABASE_FETCH_TIMEOUT_MS || DEFAULT_SUPABASE_FETCH_TIMEOUT_MS)
  const controller = new AbortController()
  const upstreamSignal = init.signal

  const abortFromUpstream = () => controller.abort(upstreamSignal?.reason)
  if (upstreamSignal?.aborted) abortFromUpstream()
  else upstreamSignal?.addEventListener('abort', abortFromUpstream, { once: true })

  const timeout = setTimeout(() => controller.abort(new Error('Supabase request timed out')), timeoutMs)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
    upstreamSignal?.removeEventListener('abort', abortFromUpstream)
  }
}
