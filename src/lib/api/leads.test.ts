import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted() for mock variables referenced inside vi.mock()
const {
  mockOrder,
  mockEq,
  mockSelect,
  mockFrom,
  mockInsert,
  mockSingle,
  mockLimit,
  mockNot,
  mockIn,
} = vi.hoisted(() => {
  const mockOrder = vi.fn()
  const mockEq = vi.fn()
  const mockSelect = vi.fn()
  const mockFrom = vi.fn()
  const mockInsert = vi.fn()
  const mockSingle = vi.fn()
  const mockLimit = vi.fn()
  const mockNot = vi.fn()
  const mockIn = vi.fn()
  return { mockOrder, mockEq, mockSelect, mockFrom, mockInsert, mockSingle, mockLimit, mockNot, mockIn }
})

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: mockFrom,
  },
}))

import { getPipelineStats, importLeadsFromCSV } from './leads'

describe('getPipelineStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockResolvedValue({
      data: [
        { stage: 'researched' },
        { stage: 'researched' },
        { stage: 'email_sent' },
        { stage: 'replied' },
        { stage: 'replied' },
        { stage: 'replied' },
        { stage: 'meeting_booked' },
      ],
      error: null,
    })
  })

  it('counts leads per stage', async () => {
    const stats = await getPipelineStats()
    expect(stats).toEqual(expect.arrayContaining([
      { stage: 'researched', count: 2 },
      { stage: 'email_sent', count: 1 },
      { stage: 'replied', count: 3 },
      { stage: 'meeting_booked', count: 1 },
    ]))
    expect(stats).toHaveLength(4)
  })

  it('returns empty array when no leads exist', async () => {
    mockSelect.mockResolvedValue({ data: [], error: null })
    const stats = await getPipelineStats()
    expect(stats).toEqual([])
  })

  it('throws on supabase error', async () => {
    mockSelect.mockResolvedValue({ data: null, error: new Error('DB error') })
    await expect(getPipelineStats()).rejects.toThrow('DB error')
  })
})

describe('importLeadsFromCSV', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ insert: mockInsert })
    mockInsert.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ single: mockSingle })
    mockSingle.mockResolvedValue({ data: { id: 'new-id' }, error: null })
  })

  it('imports valid rows successfully', async () => {
    const rows = [
      { company_name: 'Acme', contact_name: 'John', contact_email: 'john@acme.com' },
      { company_name: 'BotCo', contact_name: 'Jane' },
    ]
    const result = await importLeadsFromCSV(rows, 'user-1')
    expect(result.imported).toBe(2)
    expect(result.errors).toHaveLength(0)
    expect(mockInsert).toHaveBeenCalledTimes(2)
  })

  it('skips rows missing required fields and reports errors', async () => {
    const rows = [
      { company_name: 'Acme', contact_name: 'John' },
      { company_name: '', contact_name: 'Jane' },
      { company_name: 'BotCo', contact_name: '' },
      { company_name: 'Corp', contact_name: 'Alice' },
    ]
    const result = await importLeadsFromCSV(rows, 'user-1')
    expect(result.imported).toBe(2)
    expect(result.errors).toHaveLength(2)
    expect(result.errors[0]).toContain('Row 2')
    expect(result.errors[1]).toContain('Row 3')
  })

  it('handles insert errors gracefully', async () => {
    mockSingle.mockRejectedValueOnce(new Error('Duplicate key'))
    mockSingle.mockResolvedValueOnce({ data: { id: 'id-2' }, error: null })

    const rows = [
      { company_name: 'Acme', contact_name: 'John' },
      { company_name: 'BotCo', contact_name: 'Jane' },
    ]
    const result = await importLeadsFromCSV(rows, 'user-1')
    expect(result.imported).toBe(1)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('Row 1')
    expect(result.errors[0]).toContain('Duplicate key')
  })

  it('maps CSV column aliases correctly', async () => {
    const rows = [
      { company: 'Acme Corp', name: 'John Doe', email: 'john@acme.com', title: 'CEO', twitter: '@johndoe' },
    ]
    await importLeadsFromCSV(rows, 'user-1')

    const insertedLead = mockInsert.mock.calls[0][0]
    expect(insertedLead.company_name).toBe('Acme Corp')
    expect(insertedLead.contact_name).toBe('John Doe')
    expect(insertedLead.contact_email).toBe('john@acme.com')
    expect(insertedLead.contact_title).toBe('CEO')
    expect(insertedLead.contact_twitter).toBe('@johndoe')
    expect(insertedLead.user_id).toBe('user-1')
    expect(insertedLead.stage).toBe('researched')
    expect(insertedLead.source).toBe('csv_import')
  })

  it('splits smykm_hooks on pipe delimiter', async () => {
    const rows = [
      { company_name: 'Acme', contact_name: 'John', smykm_hooks: 'hook1|hook2|hook3' },
    ]
    await importLeadsFromCSV(rows, 'user-1')

    const insertedLead = mockInsert.mock.calls[0][0]
    expect(insertedLead.smykm_hooks).toEqual(['hook1', 'hook2', 'hook3'])
  })

  it('defaults type to customer and priority to medium', async () => {
    const rows = [
      { company_name: 'Acme', contact_name: 'John' },
    ]
    await importLeadsFromCSV(rows, 'user-1')

    const insertedLead = mockInsert.mock.calls[0][0]
    expect(insertedLead.type).toBe('customer')
    expect(insertedLead.priority).toBe('medium')
  })
})
