import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchAll } from './search';

// Mock Supabase client
const mockOr = vi.fn();
const mockLimit = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

describe('search API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up the chain: from() -> select() -> or() -> limit()
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ or: mockOr });
    mockOr.mockReturnValue({ limit: mockLimit });
  });

  it('searchAll should return empty array for empty query', async () => {
    const result = await searchAll('');
    expect(result).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('searchAll should return empty array for whitespace-only query', async () => {
    const result = await searchAll('   ');
    expect(result).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('searchAll should return customer results grouped by type', async () => {
    const mockLeads = [
      { id: 'lead-1', type: 'customer', contact_name: 'John Doe', company_name: 'Acme AI', contact_email: 'john@acme.ai', stage: 'researched' },
      { id: 'lead-2', type: 'customer', contact_name: 'Jane Smith', company_name: 'BotCo', contact_email: 'jane@botco.com', stage: 'email_sent' },
    ];

    mockLimit.mockResolvedValue({ data: mockLeads, error: null });

    const result = await searchAll('John');

    expect(mockFrom).toHaveBeenCalledWith('leads');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('customer');
    expect(result[0].title).toBe('Customers');
    expect(result[0].results).toHaveLength(2);
    expect(result[0].results[0].title).toBe('John Doe');
    expect(result[0].results[0].subtitle).toBe('Acme AI · researched');
    expect(result[0].results[0].route).toBe('/leads/lead-1');
  });

  it('searchAll should return both customer and investor categories', async () => {
    const mockLeads = [
      { id: 'lead-1', type: 'customer', contact_name: 'John Doe', company_name: 'Acme AI', contact_email: 'john@acme.ai', stage: 'researched' },
      { id: 'lead-2', type: 'investor', contact_name: 'Nick VC', company_name: 'Seed Fund', contact_email: 'nick@seed.vc', stage: 'email_drafted' },
    ];

    mockLimit.mockResolvedValue({ data: mockLeads, error: null });

    const result = await searchAll('test');

    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('customer');
    expect(result[0].results).toHaveLength(1);
    expect(result[1].type).toBe('investor');
    expect(result[1].results).toHaveLength(1);
    expect(result[1].results[0].title).toBe('Nick VC');
  });

  it('searchAll should filter out empty categories', async () => {
    const mockLeads = [
      { id: 'lead-1', type: 'investor', contact_name: 'Nick VC', company_name: 'Seed Fund', contact_email: 'nick@seed.vc', stage: 'replied' },
    ];

    mockLimit.mockResolvedValue({ data: mockLeads, error: null });

    const result = await searchAll('Nick');

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('investor');
  });

  it('searchAll should return empty array on Supabase error', async () => {
    mockLimit.mockResolvedValue({ data: null, error: new Error('DB error') });

    const result = await searchAll('test');
    expect(result).toEqual([]);
  });

  it('searchAll should return empty array when exception is thrown', async () => {
    mockLimit.mockRejectedValue(new Error('Network error'));

    const result = await searchAll('test');
    expect(result).toEqual([]);
  });
});
