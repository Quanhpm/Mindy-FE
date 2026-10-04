import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticatedRequest } from '@/features/auth/client';
import { listAllActiveMentors } from './users.browser';

vi.mock('@/features/auth/client', () => ({ authenticatedRequest: vi.fn() }));
beforeEach(() => vi.mocked(authenticatedRequest).mockReset());
const mentor = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  email: 'mentor@example.com',
  phone: null,
  displayName: 'Mentor',
  role: 'MENTOR',
  status: 'ACTIVE',
  lastLoginAt: null,
  createdAt: '2026-10-02T00:00:00Z',
};

describe('active mentor picker data', () => {
  it('reads every filtered page and propagates the abort signal', async () => {
    vi.mocked(authenticatedRequest)
      .mockResolvedValueOnce({ items: [mentor], page: 1, pageSize: 100, total: 101 })
      .mockResolvedValueOnce({ items: [mentor], page: 2, pageSize: 100, total: 101 });
    const signal = new AbortController().signal;
    expect(await listAllActiveMentors(signal)).toHaveLength(2);
    expect(authenticatedRequest).toHaveBeenNthCalledWith(
      1,
      '/admin/users?page=1&pageSize=100&role=MENTOR&status=ACTIVE',
      { signal },
    );
    expect(authenticatedRequest).toHaveBeenNthCalledWith(
      2,
      '/admin/users?page=2&pageSize=100&role=MENTOR&status=ACTIVE',
      { signal },
    );
  });
  it('fails instead of silently truncating inconsistent pagination', async () => {
    vi.mocked(authenticatedRequest).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 100,
      total: 101,
    });
    await expect(listAllActiveMentors()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
});
