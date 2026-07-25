import { beforeEach, describe, expect, it, vi } from 'vitest'
import { searchAll } from './search'

describe('searchAll', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('does not request empty searches', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    await expect(searchAll('   ')).resolves.toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('requests the authenticated same-origin leads endpoint', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      data: [
        { id: 'lead-1', type: 'customer', contact_name: 'John Doe', company_name: 'Acme AI', stage: 'researched' },
        { id: 'lead-2', type: 'investor', contact_name: 'Nick VC', company_name: 'Seed Fund', stage: 'email_drafted' },
      ],
    }), { status: 200 }))

    const result = await searchAll('John & Nick')

    expect(fetch).toHaveBeenCalledWith(
      '/api/leads?search=John%20%26%20Nick&limit=20',
      expect.objectContaining({ credentials: 'same-origin' }),
    )
    expect(result.map((category) => category.type)).toEqual(['customer', 'investor'])
    expect(result[0].results[0]).toEqual(expect.objectContaining({
      title: 'John Doe',
      subtitle: 'Acme AI · researched',
      route: '/leads/lead-1',
    }))
  })

  it('returns an empty result when the server rejects the search', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401 },
    ))

    await expect(searchAll('test')).resolves.toEqual([])
  })
})
