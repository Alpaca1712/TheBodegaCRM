import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createContact, getContacts, getContactById, updateContact, deleteContact } from './contacts';

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

describe('contacts API', () => {
  const mockContact = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    user_id: 'user-123',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    company_id: null,
    title: 'CEO',
    status: 'active' as const,
    source: 'website',
    notes: 'Test contact',
    avatar_url: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getContacts should fetch contacts with filters', async () => {
    const mockData = [mockContact];
    const mockCount = 1;
    const mockResponse = { data: mockData, count: mockCount, error: null };

    const mockChain = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockResponse),
      maybeSingle: vi.fn().mockResolvedValue(mockResponse),
    };

    mockFrom.mockReturnValue(mockChain);
    mockAuthGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-123' } } }, error: null });

    const result = await getContacts({
      search: 'John',
      status: 'active',
      page: 1,
      pageSize: 20,
      sortBy: 'last_name',
      sortOrder: 'asc',
    });

    expect(mockFrom).toHaveBeenCalledWith('contacts');
    expect(result.data).toEqual(mockData);
    expect(result.count).toBe(mockCount);
    expect(result.error).toBeNull();
  });

  it('getContactById should fetch a single contact', async () => {
    const mockResponse = { data: mockContact, error: null };
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockResponse),
      maybeSingle: vi.fn().mockResolvedValue(mockResponse),
    };

    mockFrom.mockReturnValue(mockChain);
    mockAuthGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-123' } } }, error: null });

    const result = await getContactById(mockContact.id);

    expect(mockFrom).toHaveBeenCalledWith('contacts');
    expect(result.data).toEqual(mockContact);
    expect(result.error).toBeNull();
  });

  it('createContact should insert a new contact', async () => {
    const newContact = {
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@example.com',
      status: 'lead' as const,
    };

    const mockResponse = { data: { ...mockContact, ...newContact }, error: null };
    const mockChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockResponse),
    };

    mockFrom.mockReturnValue(mockChain);
    mockAuthGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-123' } } }, error: null });

    const result = await createContact(newContact);

    expect(mockFrom).toHaveBeenCalledWith('contacts');
    expect(mockChain.insert).toHaveBeenCalledWith(newContact);
    expect(result.data).toEqual(mockResponse.data);
    expect(result.error).toBeNull();
  });

  it('updateContact should update an existing contact', async () => {
    const updates = { first_name: 'Jonathan' };
    const mockResponse = { data: { ...mockContact, ...updates }, error: null };
    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockResponse),
    };

    mockFrom.mockReturnValue(mockChain);
    mockAuthGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-123' } } }, error: null });

    const result = await updateContact(mockContact.id, updates);

    expect(mockFrom).toHaveBeenCalledWith('contacts');
    expect(mockChain.update).toHaveBeenCalledWith(updates);
    expect(mockChain.eq).toHaveBeenCalledWith('id', mockContact.id);
    expect(result.data).toEqual(mockResponse.data);
    expect(result.error).toBeNull();
  });

  it('deleteContact should delete a contact', async () => {
    const mockResponse = { error: null };
    const mockChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };

    mockChain.eq.mockReturnValue(mockResponse);
    mockFrom.mockReturnValue(mockChain);
    mockAuthGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-123' } } }, error: null });

    const result = await deleteContact(mockContact.id);

    expect(mockFrom).toHaveBeenCalledWith('contacts');
    expect(mockChain.delete).toHaveBeenCalled();
    expect(mockChain.eq).toHaveBeenNthCalledWith(1, 'id', mockContact.id);
    expect(mockChain.eq).toHaveBeenNthCalledWith(2, 'user_id', 'user-123');
    expect(result.error).toBeNull();
  });
});
