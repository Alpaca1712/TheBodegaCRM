import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createActivity, getActivities, getActivityById, updateActivity, deleteActivity } from './activities';
import { supabase } from '@/lib/supabase/client';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        ilike: vi.fn(() => ({
          or: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                range: vi.fn(() => ({
                  single: vi.fn(),
                  maybeSingle: vi.fn(),
                })),
              })),
            })),
          })),
        })),
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            range: vi.fn(() => ({
              single: vi.fn(),
              maybeSingle: vi.fn(),
            })),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({})),
      })),
    })),
  },
}));

describe('activities API', () => {
  const mockActivity = {
    id: '123e4567-e89b-12d3-a456-426614174003',
    user_id: 'user-123',
    title: 'Client Meeting',
    description: 'Discuss project requirements',
    type: 'meeting' as const,
    status: 'completed' as const,
    due_date: '2024-02-20T14:00:00Z',
    completed_at: '2024-02-20T15:30:00Z',
    contact_id: '123e4567-e89b-12d3-a456-426614174000',
    company_id: '123e4567-e89b-12d3-a456-426614174001',
    deal_id: '123e4567-e89b-12d3-a456-426614174002',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getActivities should fetch activities with filters', async () => {
    const mockData = [mockActivity];
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

    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const result = await getActivities({
      search: 'Meeting',
      type: 'meeting',
      status: 'completed',
      page: 1,
      pageSize: 20,
      sortBy: 'due_date',
      sortOrder: 'asc',
    });

    expect(supabase.from).toHaveBeenCalledWith('activities');
    expect(result.data).toEqual(mockData);
    expect(result.count).toBe(mockCount);
    expect(result.error).toBeNull();
  });

  it('getActivityById should fetch a single activity', async () => {
    const mockResponse = { data: mockActivity, error: null };
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockResponse),
    };

    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const result = await getActivityById(mockActivity.id);

    expect(supabase.from).toHaveBeenCalledWith('activities');
    expect(result.data).toEqual(mockActivity);
    expect(result.error).toBeNull();
  });

  it('createActivity should insert a new activity', async () => {
    const newActivity = {
      title: 'Follow-up Call',
      type: 'call' as const,
      status: 'pending' as const,
      due_date: '2024-02-21T10:00:00Z',
    };

    const mockResponse = { data: { ...mockActivity, ...newActivity }, error: null };
    const mockChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockResponse),
    };

    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const result = await createActivity(newActivity);

    expect(supabase.from).toHaveBeenCalledWith('activities');
    expect(mockChain.insert).toHaveBeenCalledWith(newActivity);
    expect(result.data).toEqual(mockResponse.data);
    expect(result.error).toBeNull();
  });

  it('updateActivity should update an existing activity', async () => {
    const updates = { status: 'completed', completed_at: '2024-02-20T16:00:00Z' };
    const mockResponse = { data: { ...mockActivity, ...updates }, error: null };
    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockResponse),
    };

    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const result = await updateActivity(mockActivity.id, updates);

    expect(supabase.from).toHaveBeenCalledWith('activities');
    expect(mockChain.update).toHaveBeenCalledWith(updates);
    expect(mockChain.eq).toHaveBeenCalledWith('id', mockActivity.id);
    expect(result.data).toEqual(mockResponse.data);
    expect(result.error).toBeNull();
  });

  it('deleteActivity should delete an activity', async () => {
    const deleteResponse = { error: null };
    const mockChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(deleteResponse),
    };

    (supabase.from as jest.Mock).mockReturnValue(mockChain);

    const result = await deleteActivity(mockActivity.id);

    expect(supabase.from).toHaveBeenCalledWith('activities');
    expect(mockChain.delete).toHaveBeenCalled();
    expect(mockChain.eq).toHaveBeenCalledWith('id', mockActivity.id);
    expect(result.error).toBeNull();
  });
});
