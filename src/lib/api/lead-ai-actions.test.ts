import { describe, expect, it, vi, afterEach } from 'vitest';
import { postLeadAiAction } from './lead-ai-actions';

describe('postLeadAiAction', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts the lead id to the requested AI endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ result: 'ready' }),
    } as Response);

    const result = await postLeadAiAction<{ result: string }>('/api/ai/battle-card', 'lead-123');

    expect(result).toEqual({ result: 'ready' });
    expect(fetchMock).toHaveBeenCalledWith('/api/ai/battle-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: 'lead-123' }),
    });
  });

  it('prefers API error text when a request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Too many AI requests' }),
    } as Response);

    await expect(postLeadAiAction('/api/ai/sales-coaching', 'lead-123')).rejects.toThrow('Too many AI requests');
  });

  it('falls back to status code when the error response is not JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('invalid json');
      },
    } as unknown as Response);

    await expect(postLeadAiAction('/api/ai/account-snapshot', 'lead-123')).rejects.toThrow('Failed (500)');
  });
});
