import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/lib/http/api-error';
import { request } from '@/shared/lib/http/browser';
import { bindSessionIdentity, invalidateSessionScope } from '../session/session-scope';
import {
  authenticatedRequest,
  completeGoogleRegistration,
  finalizeGoogleCallback,
  logout,
  recoverSession,
  registerAccount,
  registrationContext,
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
  vi.stubGlobal(
    'window',
    Object.assign(new EventTarget(), { location: { origin: 'http://localhost:3001' } }),
  );
  bindSessionIdentity(user.id);
});
afterEach(() => vi.unstubAllGlobals());

describe('session recovery', () => {
  it('waits for an in-flight refresh before logout clears the final session cookies', async () => {
    let finishRefresh: (value: unknown) => void = () => undefined;
    const refreshResponse = new Promise<unknown>((resolve) => {
      finishRefresh = resolve;
    });
    vi.mocked(request)
      .mockRejectedValueOnce(expired())
      .mockImplementationOnce(() => refreshResponse)
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(undefined);
    const recovery = recoverSession();
    await vi.waitFor(() =>
      expect(request).toHaveBeenCalledWith('/auth/refresh', { method: 'POST' }),
    );
    const signout = logout(false);
    await Promise.resolve();
    expect(request).toHaveBeenCalledTimes(2);
    finishRefresh({ user, accessTokenExpiresAt: '2026-10-02T00:30:00Z' });
    await expect(recovery).resolves.toEqual(user);
    await expect(signout).resolves.toBeUndefined();
    expect(request).toHaveBeenNthCalledWith(3, '/auth/me');
    expect(request).toHaveBeenNthCalledWith(4, '/auth/logout', { method: 'POST' });
  });
  it('recovers a guard-rejected logout within its existing lock and retries only once', async () => {
    vi.mocked(request)
      .mockResolvedValueOnce(user)
      .mockRejectedValueOnce(expired())
      .mockRejectedValueOnce(expired())
      .mockResolvedValueOnce({ user, accessTokenExpiresAt: '2026-10-02T00:30:00Z' })
      .mockResolvedValueOnce(undefined);
    await expect(logout(true)).resolves.toBeUndefined();
    expect(vi.mocked(request).mock.calls.map(([path]) => path)).toEqual([
      '/auth/me',
      '/auth/logout-all',
      '/auth/me',
      '/auth/refresh',
      '/auth/logout-all',
    ]);
  });
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
  it('does not replay a checkout mutation when recovery reads a different account', async () => {
    const changed = vi.fn();
    const expiredListener = vi.fn();
    window.addEventListener('mindy:session-changed', changed);
    window.addEventListener('mindy:session-expired', expiredListener);
    vi.mocked(request)
      .mockResolvedValueOnce(user)
      .mockRejectedValueOnce(expired())
      .mockResolvedValueOnce({ ...user, id: '223e4567-e89b-42d3-a456-426614174000' });
    await expect(
      authenticatedRequest('/me/cart/checkout', { method: 'POST', body: '{"paymentType":"CASH"}' }),
    ).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
    expect(vi.mocked(request).mock.calls.map(([path]) => path)).toEqual([
      '/auth/me',
      '/me/cart/checkout',
      '/auth/me',
    ]);
    expect(changed).toHaveBeenCalledOnce();
    expect(expiredListener).not.toHaveBeenCalled();
  });
  it('does not replay when the provider invalidated the request generation during recovery', async () => {
    let finishMe: (value: unknown) => void = () => undefined;
    const meResponse = new Promise<unknown>((resolve) => {
      finishMe = resolve;
    });
    vi.mocked(request).mockImplementationOnce(() => meResponse);
    const result = authenticatedRequest('/me/cart/items', { method: 'POST', body: '{}' });
    await vi.waitFor(() => expect(request).toHaveBeenCalledWith('/auth/me'));
    invalidateSessionScope();
    finishMe(user);
    await expect(result).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
    expect(request).toHaveBeenCalledOnce();
  });
  it('rejects a mutation before its first POST if the cookies already belong to another account', async () => {
    const changed = vi.fn();
    window.addEventListener('mindy:session-changed', changed);
    vi.mocked(request).mockResolvedValue({ ...user, id: '223e4567-e89b-42d3-a456-426614174000' });
    await expect(
      authenticatedRequest('/me/cart/checkout', {
        method: 'POST',
        body: '{"paymentType":"CASH"}',
      }),
    ).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
    expect(request).toHaveBeenCalledExactlyOnceWith('/auth/me');
    expect(changed).toHaveBeenCalledOnce();
  });
  it('does not logout a different account before its session broadcast arrives', async () => {
    vi.mocked(request).mockResolvedValue({ ...user, id: '223e4567-e89b-42d3-a456-426614174000' });
    await expect(logout(true)).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
    expect(request).toHaveBeenCalledExactlyOnceWith('/auth/me');
  });
  it('holds the same cross-tab lock across principal verification and the one mutation', async () => {
    let locked = false;
    const lock = vi.fn(async (_name: string, operation: () => Promise<unknown>) => {
      expect(locked).toBe(false);
      locked = true;
      try {
        return await operation();
      } finally {
        locked = false;
      }
    });
    vi.stubGlobal('navigator', { locks: { request: lock } });
    vi.mocked(request).mockImplementation(async (path) => {
      expect(locked).toBe(true);
      return path === '/auth/me' ? user : { orders: [] };
    });
    await expect(
      authenticatedRequest('/me/cart/checkout', {
        method: 'POST',
        body: '{"paymentType":"CASH"}',
      }),
    ).resolves.toEqual({ orders: [] });
    expect(lock).toHaveBeenCalledOnce();
    expect(vi.mocked(request).mock.calls.map(([path]) => path)).toEqual([
      '/auth/me',
      '/me/cart/checkout',
    ]);
  });
  it('refreshes the same principal before sending a mutation exactly once', async () => {
    vi.mocked(request)
      .mockRejectedValueOnce(expired())
      .mockResolvedValueOnce({ user, accessTokenExpiresAt: '2026-10-02T01:00:00Z' })
      .mockResolvedValueOnce({ orders: [] });
    await expect(
      authenticatedRequest('/me/cart/checkout', {
        method: 'POST',
        body: '{"paymentType":"CASH"}',
      }),
    ).resolves.toEqual({ orders: [] });
    expect(vi.mocked(request).mock.calls.map(([path]) => path)).toEqual([
      '/auth/me',
      '/auth/refresh',
      '/me/cart/checkout',
    ]);
  });
  it('does not let an old request 401 clear a newly bound account', async () => {
    const expiredListener = vi.fn();
    window.addEventListener('mindy:session-expired', expiredListener);
    let rejectRequest: (error: unknown) => void = () => undefined;
    vi.mocked(request).mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectRequest = reject;
        }),
    );
    const result = authenticatedRequest('/me/orders');
    bindSessionIdentity('223e4567-e89b-42d3-a456-426614174000');
    rejectRequest(expired());
    await expect(result).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
    expect(request).toHaveBeenCalledOnce();
    expect(expiredListener).not.toHaveBeenCalled();
  });
  it('never tries refresh on a forbidden response', async () => {
    vi.mocked(request).mockRejectedValue(new ApiError(403, 'INSUFFICIENT_ROLE', 'Forbidden'));
    await expect(authenticatedRequest('/admin/users')).rejects.toMatchObject({ status: 403 });
    expect(request).toHaveBeenCalledOnce();
  });
  it('preserves validation failures without refreshing or replaying a mutation', async () => {
    vi.mocked(request)
      .mockResolvedValueOnce(user)
      .mockRejectedValueOnce(new ApiError(422, 'HTTP_ERROR', 'Invalid input'));
    await expect(
      authenticatedRequest('/admin/users', { method: 'POST', body: '{}' }),
    ).rejects.toMatchObject({ status: 422 });
    expect(vi.mocked(request).mock.calls.map(([path]) => path)).toEqual([
      '/auth/me',
      '/admin/users',
    ]);
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

describe('Google onboarding API', () => {
  it('waits for refresh before Google finalization can replace its session cookies', async () => {
    let finishRefresh: (value: unknown) => void = () => undefined;
    const refreshResponse = new Promise<unknown>((resolve) => {
      finishRefresh = resolve;
    });
    vi.mocked(request)
      .mockRejectedValueOnce(expired())
      .mockImplementationOnce(() => refreshResponse)
      .mockResolvedValueOnce({ redirectTo: '/account?mindyAuth=google' });
    const recovery = recoverSession();
    await vi.waitFor(() =>
      expect(request).toHaveBeenCalledWith('/auth/refresh', { method: 'POST' }),
    );
    const finalization = finalizeGoogleCallback({ code: 'one-use-code', state: 'state' });
    await Promise.resolve();
    expect(request).toHaveBeenCalledTimes(2);
    finishRefresh({ user, accessTokenExpiresAt: '2026-10-02T00:30:00Z' });
    await recovery;
    await expect(finalization).resolves.toBe('/account?mindyAuth=google');
    expect(request).toHaveBeenNthCalledWith(3, '/auth/google/callback', {
      method: 'POST',
      body: JSON.stringify({ code: 'one-use-code', state: 'state' }),
    });
  });
  it('uses the shared cross-tab session WebLock for Google callback cookies', async () => {
    const lock = vi.fn(async (_name: string, operation: () => Promise<unknown>) => operation());
    vi.stubGlobal('navigator', { locks: { request: lock } });
    vi.mocked(request).mockResolvedValue({ redirectTo: '/account?mindyAuth=google' });
    await finalizeGoogleCallback({ code: 'code', state: 'state' });
    expect(lock).toHaveBeenCalledWith('mindy-auth-refresh', expect.any(Function));
  });
  it('rejects untrusted callback response navigation and never retries its authorization code', async () => {
    vi.mocked(request).mockResolvedValue({ redirectTo: '//evil.example/account' });
    await expect(finalizeGoogleCallback({ code: 'code', state: 'state' })).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
    expect(request).toHaveBeenCalledOnce();
  });
  it('waits for an in-flight refresh before issuing new onboarding session cookies', async () => {
    let finishRefresh: (value: unknown) => void = () => undefined;
    const refreshResponse = new Promise<unknown>((resolve) => {
      finishRefresh = resolve;
    });
    vi.mocked(request)
      .mockRejectedValueOnce(expired())
      .mockImplementationOnce(() => refreshResponse)
      .mockResolvedValueOnce({ user, accessTokenExpiresAt: '2026-10-02T01:00:00Z' });
    const recovery = recoverSession();
    await vi.waitFor(() =>
      expect(request).toHaveBeenCalledWith('/auth/refresh', { method: 'POST' }),
    );
    const completion = completeGoogleRegistration({ displayName: 'Google User', phone: '' });
    await Promise.resolve();
    expect(request).toHaveBeenCalledTimes(2);
    finishRefresh({ user, accessTokenExpiresAt: '2026-10-02T00:30:00Z' });
    await expect(recovery).resolves.toEqual(user);
    await expect(completion).resolves.toEqual(user);
    expect(request).toHaveBeenNthCalledWith(
      3,
      '/auth/google/complete-registration',
      expect.any(Object),
    );
  });
  it('uses the same cross-tab WebLock as refresh for onboarding', async () => {
    const lock = vi.fn(async (_name: string, operation: () => Promise<unknown>) => operation());
    vi.stubGlobal('navigator', { locks: { request: lock } });
    vi.mocked(request).mockResolvedValue({ user, accessTokenExpiresAt: '2026-10-02T01:00:00Z' });
    await completeGoogleRegistration({ displayName: 'Google User', phone: '' });
    expect(lock).toHaveBeenCalledWith('mindy-auth-refresh', expect.any(Function));
  });
  it('reads runtime-validated registration context without using auth recovery', async () => {
    const context = {
      email: 'google@example.com',
      displayName: 'Google User',
      avatarUrl: null,
      expiresAt: '2026-10-02T00:15:00Z',
    };
    vi.mocked(request).mockResolvedValue(context);
    expect(await registrationContext()).toEqual(context);
    expect(request).toHaveBeenCalledExactlyOnceWith('/auth/registration-context', {
      signal: undefined,
    });
    vi.mocked(request).mockResolvedValue({ ...context, expiresAt: 'yesterday' });
    await expect(registrationContext()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
  it('only submits the permitted Google completion fields and omits blank phone', async () => {
    vi.mocked(request).mockResolvedValue({ user, accessTokenExpiresAt: '2026-10-02T01:00:00Z' });
    expect(await completeGoogleRegistration({ displayName: 'Google User', phone: '' })).toEqual(
      user,
    );
    expect(request).toHaveBeenCalledExactlyOnceWith('/auth/google/complete-registration', {
      method: 'POST',
      body: JSON.stringify({ displayName: 'Google User', deviceName: 'Mindy Web' }),
    });
  });
  it('does not try refresh for an expired onboarding intent', async () => {
    vi.mocked(request).mockRejectedValue(
      new ApiError(401, 'INVALID_REGISTRATION_INTENT', 'Expired'),
    );
    await expect(
      completeGoogleRegistration({ displayName: 'Google User', phone: '' }),
    ).rejects.toMatchObject({ code: 'INVALID_REGISTRATION_INTENT' });
    expect(request).toHaveBeenCalledOnce();
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
