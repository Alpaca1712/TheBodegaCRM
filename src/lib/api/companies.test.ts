import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCompanies, getCompanyById, updateCompany, deleteCompany } from './companies';

// Create mocks using vi.hoisted to avoid hoisting issues
const { mockFrom, mockAuthGetSession, mockCreateClient } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockAuthGetSession: vi.fn(),
  mockCreateClient: vi.fn(() => ({
    from: mockFrom,
    auth: {
      getSession: mockAuthGetSession,
    },
  })),
}));

// Mock the createClient function
vi.mock('@/lib/supabase/client', () => ({
  createClient: mockCreateClient,
}));

describe('companies API', () => {
  const mockCompany = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    user_id: 'user-123',
    name: 'Acme Corp',
    website: 'https://acme.example.com',
    phone: '+1234567890',
    email: 'info@acme.example.com',
    industry: 'Technology',
    size: 'medium' as const,
    address: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    zip_code: '94105',
    country: 'USA',
    notes: 'Test company',
    logo_url: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getCompanies should fetch companies with filters', async () => {
    const mockData = [mockCompany];
    const mockCount = 1;
    const mockResponse = { data: mockData, count: mockCount, error: null };

    const mockChain = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(mockResponse),
    };

    mockFrom.mockReturnValue(mockChain);
    mockAuthGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-123' } } }, error: null });

    const result = await getCompanies({
      search: 'Acme',
      industry: 'Technology',
      page: 1,
      pageSize: 20,
      sortBy: 'name',
      sortOrder: 'asc',
    });

    expect(mockFrom).toHaveBeenCalledWith('companies');
    expect(result.data).toEqual(mockData);
    expect(result.count).toBe(mockCount);
    expect(result.error).toBeNull();
  });

  it('getCompanyById should fetch a single company', async () => {
    const mockResponse = { data: mockCompany, error: null };
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockResponse),
    };

    mockFrom.mockReturnValue(mockChain);
    mockAuthGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-123' } } }, error: null });

    const result = await getCompanyById(mockCompany.id);

    expect(mockFrom).toHaveBeenCalledWith('companies');
    expect(result.data).toEqual(mockCompany);
    expect(result.error).toBeNull();
  });

  it('updateCompany should update an existing company', async () => {
    const updates = { name: 'Acme Corporation' };
    const mockResponse = { data: { ...mockCompany, ...updates }, error: null };
    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockResponse),
    };

    mockFrom.mockReturnValue(mockChain);
    mockAuthGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-123' } } }, error: null });

    const result = await updateCompany(mockCompany.id, updates);

    expect(mockFrom).toHaveBeenCalledWith('companies');
    expect(mockChain.update).toHaveBeenCalledWith(updates);
    expect(mockChain.eq).toHaveBeenCalledWith('id', mockCompany.id);
    expect(result.data).toEqual(mockResponse.data);
    expect(result.error).toBeNull();
  });

  it('deleteCompany should delete a company', async () => {
    const mockResponse = { error: null };
    const mockChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockResponse),
    };

    mockFrom.mockReturnValue(mockChain);
    mockAuthGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-123' } } }, error: null });

    const result = await deleteCompany(mockCompany.id);

    expect(mockFrom).toHaveBeenCalledWith('companies');
    expect(mockChain.delete).toHaveBeenCalled();
    expect(mockChain.eq).toHaveBeenNthCalledWith(1, 'id', mockCompany.id);
    expect(mockChain.eq).toHaveBeenNthCalledWith(2, 'user_id', 'user-123');
    expect(result.error).toBeNull();
  });
});
