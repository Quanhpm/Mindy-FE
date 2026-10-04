import { z } from 'zod';
import { type User, userSchema } from '@/shared/api/contracts/identity';
import { ApiError } from '@/shared/lib/http/api-error';
import { request } from '@/shared/lib/http/browser';
import {
  type GoogleCallbackInput,
  googleCallbackInputSchema,
  googleCallbackResultSchema,
} from '../schemas/google-callback.schema';
import {
  type GoogleRegistrationInput,
  type RegistrationContext,
  registrationContextSchema,
} from '../schemas/google-registration.schema';
import type { LoginInput } from '../schemas/login.schema';
import {
  captureSessionScope,
  invalidateSessionScope,
  matchesSessionScope,
  type SessionScope,
} from '../session/session-scope';
import { trustedGoogleReturnPath } from './google-policy';

const authResponseSchema = z.object({ user: userSchema, accessTokenExpiresAt: z.string() });
let pendingRecovery: Promise<User> | null = null;
let pendingSessionOperation: Promise<void> = Promise.resolve();

function withSessionLock<T>(operation: () => Promise<T>): Promise<T> {
  // A late refresh response can rotate or clear cookies issued by a newer login.
  // Serialize all session-issuing calls in this tab and across supported browsers.
  const result = pendingSessionOperation.then(async (): Promise<T> => {
    if (typeof navigator !== 'undefined' && navigator.locks)
      return await navigator.locks.request('mindy-auth-refresh', operation);
    return await operation();
  });
  pendingSessionOperation = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export async function currentUser(): Promise<User> {
  return userSchema.parse(await request('/auth/me'));
}

async function recoverInsideLock(): Promise<User> {
  // A different tab may already have replaced the cookies while we waited for the lock.
  try {
    return await currentUser();
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
  }
  const result = authResponseSchema.parse(await request('/auth/refresh', { method: 'POST' }));
  return result.user;
}

export function recoverSession(): Promise<User> {
  if (!pendingRecovery) {
    pendingRecovery = recoverWithLock().finally(() => {
      pendingRecovery = null;
    });
  }
  return pendingRecovery;
}

function recoverWithLock(): Promise<User> {
  return withSessionLock(recoverInsideLock);
}

export async function authenticatedRequest(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  if (!['GET', 'HEAD', 'OPTIONS'].includes((options.method ?? 'GET').toUpperCase()))
    return mutationWithSessionLock(path, options);
  return requestWithRecovery(path, options, recoverSession);
}

function mutationWithSessionLock(path: string, options: RequestInit): Promise<unknown> {
  const expected = captureSessionScope();
  return withSessionLock(async () => {
    options.signal?.throwIfAborted();
    assertSessionScope(expected);
    try {
      // Cookies can belong to another account before its BroadcastChannel event
      // reaches this tab. Verify the principal while holding the same lock used
      // by login/refresh/logout, before sending any business mutation.
      const identity = await recoverInsideLock();
      assertSessionScope(expected, identity);
    } catch (error) {
      handleRecoveryFailure(error, expected);
    }
    options.signal?.throwIfAborted();
    return requestWithRecovery(path, options, recoverInsideLock, expected);
  });
}

async function requestWithRecovery(
  path: string,
  options: RequestInit,
  recover: () => Promise<User>,
  expected: SessionScope = captureSessionScope(),
): Promise<unknown> {
  try {
    const result = await request(path, options);
    assertSessionScope(expected);
    return result;
  } catch (error) {
    if (
      !(error instanceof ApiError) ||
      error.status !== 401 ||
      error.code !== 'AUTHENTICATION_REQUIRED'
    )
      throw error;
    assertSessionScope(expected);
    try {
      const identity = await recover();
      assertSessionScope(expected, identity);
      // Only replay once after the auth guard rejected the original request before mutation.
      const result = await request(path, options);
      assertSessionScope(expected);
      return result;
    } catch (recoveryError) {
      handleRecoveryFailure(recoveryError, expected);
    }
  }
}

function handleRecoveryFailure(error: unknown, expected: SessionScope): never {
  if (error instanceof ApiError && error.code === 'SESSION_CHANGED') throw error;
  assertSessionScope(expected);
  if (error instanceof ApiError && error.status === 401)
    window.dispatchEvent(new Event('mindy:session-expired'));
  throw error;
}

function assertSessionScope(expected: SessionScope, recovered?: User): void {
  if (
    matchesSessionScope(expected) &&
    (!recovered || (expected.userId !== null && recovered.id === expected.userId))
  )
    return;
  // Never replay an old account's operation with a newer account's cookies.
  // Reload also prevents a stale 401 from clearing that newer session.
  invalidateSessionScope();
  window.dispatchEvent(new Event('mindy:session-changed'));
  throw new ApiError(409, 'SESSION_CHANGED', 'Tài khoản đã thay đổi. Vui lòng thử lại.');
}

export async function login(input: LoginInput): Promise<User> {
  return withSessionLock(async () => {
    const result = authResponseSchema.parse(
      await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ ...input, deviceName: 'Mindy Web' }),
      }),
    );
    return result.user;
  });
}

export async function logout(all: boolean): Promise<void> {
  await mutationWithSessionLock(all ? '/auth/logout-all' : '/auth/logout', { method: 'POST' });
}

export async function registerAccount(
  input: import('../schemas/register.schema').RegisterInput,
): Promise<void> {
  z.object({ message: z.string() }).parse(
    await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...input, phone: input.phone || undefined }),
    }),
  );
}

export async function resendVerification(email: string): Promise<void> {
  z.object({ message: z.string() }).parse(
    await request('/auth/email/resend', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  );
}

export async function verifyEmail(token: string): Promise<User> {
  z.string().min(32).max(512).parse(token);
  return withSessionLock(async () => {
    const result = authResponseSchema.parse(
      await request('/auth/email/verify', {
        method: 'POST',
        body: JSON.stringify({ token, deviceName: 'Mindy Web' }),
      }),
    );
    return result.user;
  });
}

export async function registrationContext(signal?: AbortSignal): Promise<RegistrationContext> {
  const result = registrationContextSchema.safeParse(
    await request('/auth/registration-context', { signal }),
  );
  if (!result.success)
    throw new ApiError(502, 'INVALID_RESPONSE', 'Unexpected registration context');
  return result.data;
}

export async function completeGoogleRegistration(input: GoogleRegistrationInput): Promise<User> {
  return withSessionLock(async () => {
    const result = authResponseSchema.safeParse(
      await request('/auth/google/complete-registration', {
        method: 'POST',
        body: JSON.stringify({
          displayName: input.displayName,
          ...(input.phone.trim() ? { phone: input.phone.trim() } : {}),
          deviceName: 'Mindy Web',
        }),
      }),
    );
    if (!result.success)
      throw new ApiError(502, 'INVALID_RESPONSE', 'Unexpected authentication response');
    return result.data.user;
  });
}

export async function finalizeGoogleCallback(input: GoogleCallbackInput): Promise<string> {
  const payload = googleCallbackInputSchema.parse(input);
  return withSessionLock(async () => {
    invalidateSessionScope();
    const result = googleCallbackResultSchema.safeParse(
      await request('/auth/google/callback', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    );
    const destination = result.success
      ? trustedGoogleReturnPath(result.data.redirectTo, window.location.origin)
      : null;
    if (!destination)
      throw new ApiError(502, 'INVALID_RESPONSE', 'Unexpected Google callback response');
    window.dispatchEvent(new Event('mindy:session-changed'));
    return destination;
  });
}
