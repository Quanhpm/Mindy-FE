import { afterEach, describe, expect, it, vi } from 'vitest';
import { request } from './browser';

afterEach(() => vi.unstubAllGlobals());

describe('API transport', () => {
  it('accepts a 204 logout response without parsing JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(request('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/logout',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' }),
    );
  });
  it('preserves validation arrays and request IDs in errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json(
          {
            code: 'HTTP_ERROR',
            message: ['email must be an email', 'password is too short'],
            requestId: 'request-1',
          },
          { status: 422 },
        ),
      ),
    );
    await expect(request('/admin/users')).rejects.toMatchObject({
      status: 422,
      requestId: 'request-1',
      message: 'email must be an email password is too short',
    });
  });
  it('does not retry a failed mutation', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Network failed'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(request('/admin/users', { method: 'POST' })).rejects.toMatchObject({
      code: 'API_UNAVAILABLE',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
