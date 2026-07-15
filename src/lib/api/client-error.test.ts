import { describe, expect, it } from 'vitest'
import { apiErrorMessage, clientErrorMessage } from './client-error'

describe('apiErrorMessage', () => {
  it('returns the server error when one is available', async () => {
    const response = new Response(JSON.stringify({ error: 'Reconnect Gmail' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    })

    await expect(apiErrorMessage(response, 'Failed to send')).resolves.toBe('Reconnect Gmail')
  })

  it('supports nested provider errors and safe non-JSON fallbacks', async () => {
    const nested = new Response(JSON.stringify({ error: { message: 'Model unavailable' } }), { status: 503 })
    await expect(apiErrorMessage(nested, 'Generation failed')).resolves.toBe('Model unavailable')

    const html = new Response('<html>Bad gateway</html>', { status: 502 })
    await expect(apiErrorMessage(html, 'Generation failed')).resolves.toBe('Generation failed (502)')
  })
})

describe('clientErrorMessage', () => {
  it('uses Error messages and falls back for unknown values', () => {
    expect(clientErrorMessage(new Error('Specific failure'), 'Failed')).toBe('Specific failure')
    expect(clientErrorMessage(null, 'Failed')).toBe('Failed')
  })
})
