import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDeal, getDeals, getDealById, updateDeal, deleteDeal, updateDealStage } from './deals';
import { supabase } from '@/lib/supabase/client';



// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('deals API', () => {
  const mockDeal = {
    id: 'deal-123',
    name: 'Enterprise CRM Deal',
    stage: 'proposal',
    value: 50000,
    probability: 75,
    expected_close_date: '2024-12-31',
    status: 'open',
    notes: 'Large enterprise deal',
    company_id: 'company-123',
    contact_id: 'contact-123',
    user_id: 'user-123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockUpdatedDeal = {
    ...mockDeal,
    name: 'Updated Deal',
    stage: 'negotiation',
    value: 60000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getDeals should return all deals', async () => {
    const mockResponse = { data: [mockDeal], error: null };
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue(mockResponse),
    };

    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const result = await getDeals();

    expect(supabase.from).toHaveBeenCalledWith('deals');
    expect(mockChain.select).toHaveBeenCalledWith('*');
    expect(result.data).toEqual([mockDeal]);
    expect(result.error).toBeNull();
  });

  it('getDealById should return a single deal', async () => {
    const mockResponse = { data: mockDeal, error: null };
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockResponse),
    };

    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const result = await getDealById(mockDeal.id);

    expect(supabase.from).toHaveBeenCalledWith('deals');
    expect(mockChain.select).toHaveBeenCalledWith('*');
    expect(mockChain.eq).toHaveBeenCalledWith('id', mockDeal.id);
    expect(result.data).toEqual(mockDeal);
    expect(result.error).toBeNull();
  });

  it('createDeal should create a new deal', async () => {
    const newDeal = {
      name: 'New Deal',
      stage: 'lead',
      value: 10000,
      probability: 50,
      expected_close_date: '2024-06-30',
      notes: 'Initial deal',
      company_id: 'company-456',
      contact_id: 'contact-456',
    };

    const mockResponse = { data: { ...newDeal, id: 'new-deal-id' }, error: null };
    const mockChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockResponse),
    };

    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const result = await createDeal(newDeal);

    expect(supabase.from).toHaveBeenCalledWith('deals');
    expect(mockChain.insert).toHaveBeenCalledWith({
      ...newDeal,
      status: 'open',
      user_id: expect.any(String),
    });
    expect(mockChain.select).toHaveBeenCalled();
    expect(result.data).toEqual({ ...newDeal, id: 'new-deal-id' });
    expect(result.error).toBeNull();
  });

  it('updateDeal should update a deal', async () => {
    const updates = {
      name: 'Updated Deal',
      stage: 'negotiation',
      value: 60000,
    };

    const mockResponse = { data: mockUpdatedDeal, error: null };
    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockResponse),
    };

    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const result = await updateDeal(mockDeal.id, updates);

    expect(supabase.from).toHaveBeenCalledWith('deals');
    expect(mockChain.update).toHaveBeenCalledWith({
      ...updates,
      updated_at: expect.any(String),
    });
    expect(mockChain.eq).toHaveBeenCalledWith('id', mockDeal.id);
    expect(result.data).toEqual(mockUpdatedDeal);
    expect(result.error).toBeNull();
  });

  it('deleteDeal should delete a deal', async () => {
    const mockResponse = { error: null };
    const mockChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockResponse),
    };

    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const result = await deleteDeal(mockDeal.id);

    expect(supabase.from).toHaveBeenCalledWith('deals');
    expect(mockChain.delete).toHaveBeenCalled();
    expect(mockChain.eq).toHaveBeenCalledWith('id', mockDeal.id);
    expect(result.error).toBeNull();
  });

  it('updateDealStage should update deal stage and status', async () => {
    const mockResponse = { data: { ...mockDeal, status: 'won', stage: 'won' }, error: null };
    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockResponse),
    };

    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const result = await updateDealStage(mockDeal.id, 'won');

    expect(supabase.from).toHaveBeenCalledWith('deals');
    expect(mockChain.update).toHaveBeenCalledWith({
      stage: 'won',
      status: 'won',
      close_date: expect.any(String),
    });
    expect(mockChain.eq).toHaveBeenCalledWith('id', mockDeal.id);
    expect(result.data).toEqual({ ...mockDeal, status: 'won', stage: 'won' });
    expect(result.error).toBeNull();
  });
});
