import { z } from 'zod';
import { type User, userSchema } from '@/shared/api/contracts/identity';
import { ApiError } from '@/shared/lib/http/api-error';
import { request } from '@/shared/lib/http/browser';
import type { LoginInput } from '../schemas/login.schema';

const authResponseSchema = z.object({ user: userSchema, accessTokenExpiresAt: z.string() });
let pendingRecovery: Promise<User> | null = null;

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

async function recoverWithLock(): Promise<User> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return await navigator.locks.request('mindy-auth-refresh', recoverInsideLock);
  }
  return recoverInsideLock();
}

export async function authenticatedRequest(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  try {
    return await request(path, options);
  } catch (error) {
    if (
      !(error instanceof ApiError) ||
      error.status !== 401 ||
      error.code !== 'AUTHENTICATION_REQUIRED'
    )
      throw error;
    try {
      await recoverSession();
      // Only replay once after the auth guard rejected the original request before mutation.
      return await request(path, options);
    } catch (recoveryError) {
      if (recoveryError instanceof ApiError && recoveryError.status === 401) {
        window.dispatchEvent(new Event('mindy:session-expired'));
      }
      throw recoveryError;
    }
  }
}

export async function login(input: LoginInput): Promise<User> {
  const result = authResponseSchema.parse(
    await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ ...input, deviceName: 'Mindy Web' }),
    }),
  );
  return result.user;
}

export async function logout(all: boolean): Promise<void> {
  await authenticatedRequest(all ? '/auth/logout-all' : '/auth/logout', { method: 'POST' });
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
  const result = authResponseSchema.parse(
    await request('/auth/email/verify', {
      method: 'POST',
      body: JSON.stringify({ token, deviceName: 'Mindy Web' }),
    }),
  );
  return result.user;
}
