import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/lib/http/api-error';
import { request } from '@/shared/lib/http/browser';
import {
  authenticatedRequest,
  recoverSession,
  registerAccount,
  resendVerification,
  verifyEmail,
} from './auth.browser';

vi.mock('@/shared/lib/http/browser', () => ({ request: vi.fn() }));
const user = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  email: 'test@example.com',
  phone: null,
  displayName: 'Test',
  role: 'ADMIN',
  status: 'ACTIVE',
  lastLoginAt: null,
  createdAt: '2026-09-30T00:00:00Z',
};
const expired = () => new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Expired');
beforeEach(() => {
  vi.mocked(request).mockReset();
  vi.stubGlobal('navigator', {});
  vi.stubGlobal('window', new EventTarget());
});
afterEach(() => vi.unstubAllGlobals());

describe('session recovery', () => {
  it('shares one refresh between concurrent requests', async () => {
    vi.mocked(request)
      .mockRejectedValueOnce(expired())
      .mockResolvedValueOnce({ user, accessTokenExpiresAt: '2026-09-30T01:00:00Z' });
    const result = await Promise.all([recoverSession(), recoverSession(), recoverSession()]);
    expect(result).toEqual([user, user, user]);
    expect(vi.mocked(request).mock.calls.filter(([path]) => path === '/auth/refresh')).toHaveLength(
      1,
    );
  });
  it('rechecks the session after acquiring the cross-tab lock', async () => {
    const lock = vi.fn(async (_name: string, callback: () => Promise<unknown>) => callback());
    vi.stubGlobal('navigator', { locks: { request: lock } });
    vi.mocked(request).mockResolvedValue(user);
    await expect(recoverSession()).resolves.toEqual(user);
    expect(lock).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledExactlyOnceWith('/auth/me');
  });
  it('replays an auth-rejected request only once after recovery', async () => {
    vi.mocked(request)
      .mockRejectedValueOnce(expired())
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce({ items: [] });
    await expect(authenticatedRequest('/admin/users')).resolves.toEqual({ items: [] });
    expect(request).toHaveBeenCalledTimes(3);
  });
  it('never tries refresh on a forbidden response', async () => {
    vi.mocked(request).mockRejectedValue(new ApiError(403, 'INSUFFICIENT_ROLE', 'Forbidden'));
    await expect(authenticatedRequest('/admin/users')).rejects.toMatchObject({ status: 403 });
    expect(request).toHaveBeenCalledOnce();
  });
  it('ends the session when refresh fails, without a retry loop', async () => {
    const listener = vi.fn();
    window.addEventListener('mindy:session-expired', listener);
    vi.mocked(request)
      .mockRejectedValueOnce(expired())
      .mockRejectedValueOnce(expired())
      .mockRejectedValueOnce(new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Invalid'));
    await expect(authenticatedRequest('/admin/users')).rejects.toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
    });
    expect(request).toHaveBeenCalledTimes(3);
    expect(listener).toHaveBeenCalledOnce();
  });
});

describe('public registration', () => {
  it('omits an empty optional phone and accepts the registration response', async () => {
    vi.mocked(request).mockResolvedValue({ message: 'Accepted' });
    await registerAccount({
      email: 'test@example.com',
      password: 'secret12',
      displayName: 'Test',
      phone: '',
    });
    expect(request).toHaveBeenCalledWith('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'secret12',
        displayName: 'Test',
      }),
    });
  });
  it('verifies with the URL token and returns the authenticated user', async () => {
    vi.mocked(request).mockResolvedValue({ user, accessTokenExpiresAt: '2026-10-02T01:00:00Z' });
    const token = 'a'.repeat(43);
    await expect(verifyEmail(token)).resolves.toEqual(user);
    expect(request).toHaveBeenCalledWith('/auth/email/verify', {
      method: 'POST',
      body: JSON.stringify({ token, deviceName: 'Mindy Web' }),
    });
  });
  it('rejects malformed tokens without making a request', async () => {
    await expect(verifyEmail('short')).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
  it('sends resend requests and preserves backend failures', async () => {
    vi.mocked(request).mockRejectedValue(
      new ApiError(503, 'MAIL_DELIVERY_UNAVAILABLE', 'Unavailable'),
    );
    await expect(resendVerification('test@example.com')).rejects.toMatchObject({
      code: 'MAIL_DELIVERY_UNAVAILABLE',
    });
    expect(request).toHaveBeenCalledWith('/auth/email/resend', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });
  });
});
