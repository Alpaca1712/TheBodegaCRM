import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchAll } from './search';

// Mock the modules with vi.hoisted
const { mockGetContacts, mockGetCompanies, mockGetDeals } = vi.hoisted(() => ({
  mockGetContacts: vi.fn(),
  mockGetCompanies: vi.fn(),
  mockGetDeals: vi.fn(),
}));

vi.mock('./contacts', () => ({
  getContacts: mockGetContacts,
}));

vi.mock('./companies', () => ({
  getCompanies: mockGetCompanies,
}));

vi.mock('./deals', () => ({
  getDeals: mockGetDeals,
}));

describe('search API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('searchAll should return results from all tables', async () => {
    const mockContacts = [
      { id: 'contact-1', first_name: 'John', last_name: 'Doe', email: 'john@example.com', phone: null, avatar_url: null },
    ];
    const mockCompanies = [
      { id: 'company-1', name: 'Acme Corp', industry: 'Tech', size: 'Medium', logo_url: null },
    ];
    const mockDeals = [
      { id: 'deal-1', title: 'Enterprise Deal', value: 50000, stage: 'proposal' as const },
    ];

    mockGetContacts.mockResolvedValue({ data: mockContacts, error: null });
    mockGetCompanies.mockResolvedValue({ data: mockCompanies, error: null });
    mockGetDeals.mockResolvedValue({ data: mockDeals, error: null });

    const result = await searchAll('John');

    expect(mockGetContacts).toHaveBeenCalledWith({ search: 'John' }, { page: 1, limit: 10 });
    expect(mockGetCompanies).toHaveBeenCalledWith({ search: 'John' }, { page: 1, limit: 10 });
    expect(mockGetDeals).toHaveBeenCalledWith({ search: 'John' }, { page: 1, limit: 10 });

    expect(result).toHaveLength(3);
    expect(result[0].type).toBe('contact');
    expect(result[0].results).toHaveLength(1);
    expect(result[0].results[0].title).toBe('John Doe');
    
    expect(result[1].type).toBe('company');
    expect(result[1].results).toHaveLength(1);
    expect(result[1].results[0].title).toBe('Acme Corp');
    
    expect(result[2].type).toBe('deal');
    expect(result[2].results).toHaveLength(1);
    expect(result[2].results[0].title).toBe('Enterprise Deal');
  });

  it('searchAll should return empty array for empty query', async () => {
    const result = await searchAll('');
    expect(result).toEqual([]);
    expect(mockGetContacts).not.toHaveBeenCalled();
    expect(mockGetCompanies).not.toHaveBeenCalled();
    expect(mockGetDeals).not.toHaveBeenCalled();
  });

  it('searchAll should return empty array when API errors', async () => {
    mockGetContacts.mockResolvedValue({ data: null, error: new Error('API error') });
    mockGetCompanies.mockResolvedValue({ data: null, error: new Error('API error') });
    mockGetDeals.mockResolvedValue({ data: null, error: new Error('API error') });

    const result = await searchAll('test');
    expect(result).toEqual([]);
  });

  it('searchAll should filter out categories with no results', async () => {
    const mockContacts = [
      { id: 'contact-1', first_name: 'John', last_name: 'Doe', email: 'john@example.com', phone: null, avatar_url: null },
    ];

    mockGetContacts.mockResolvedValue({ data: mockContacts, error: null });
    mockGetCompanies.mockResolvedValue({ data: [], error: null });
    mockGetDeals.mockResolvedValue({ data: [], error: null });

    const result = await searchAll('John');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('contact');
    expect(result[0].results).toHaveLength(1);
  });
});
