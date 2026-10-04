import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { finalizeGoogleNavigation, googleNavigation } from './google.server';

vi.mock('server-only', () => ({}));

const stateCookie =
  'google_oauth_state=opaque; Path=/api/v1/auth/google/callback; HttpOnly; SameSite=Lax';
const registrationCookie = 'registration_intent=opaque; Path=/api/v1/auth; HttpOnly; SameSite=Lax';
const accessCookie = 'access_token=opaque; Path=/; HttpOnly; SameSite=Lax';
const refreshCookie = 'refresh_token=opaque; Path=/api/v1/auth/refresh; HttpOnly; SameSite=Lax';

function redirect(location: string, cookies: string[] = []) {
  const headers = new Headers({ location });
  for (const cookie of cookies) headers.append('set-cookie', cookie);
  return new Response(null, { status: 302, headers });
}
function navigation(path: string, cookies?: string) {
  return new Request(`http://localhost:3001/api/v1/auth/google${path}`, {
    headers: cookies ? { cookie: cookies } : undefined,
  });
}
function finalization(
  input: unknown = { code: 'abc', state: 'xyz' },
  headers: Record<string, string> = {},
) {
  return new Request('http://localhost:3001/api/v1/auth/google/callback', {
    method: 'POST',
    headers: { origin: 'http://localhost:3001', 'content-type': 'application/json', ...headers },
    body: JSON.stringify(input),
  });
}
beforeEach(() => {
  vi.stubEnv('APP_ORIGIN', 'http://localhost:3001');
  vi.stubEnv('API_BASE_URL', 'http://localhost:3000/api/v1');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('Google navigation adapter', () => {
  it('starts Google with a safe local return path and a scoped HttpOnly state cookie', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        redirect('https://accounts.google.com/o/oauth2/v2/auth?state=opaque', [stateCookie]),
      );
    vi.stubGlobal('fetch', fetch);
    const response = await googleNavigation(
      navigation('?returnTo=https%3A%2F%2Fevil.example', 'access_token=secret'),
      'start',
    );
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth?state=opaque',
    );
    expect(response.headers.getSetCookie()).toEqual([stateCookie]);
    const [url, options] = fetch.mock.calls[0] ?? [];
    expect(url).toBe('http://localhost:3000/api/v1/auth/google?returnTo=%2Faccount');
    expect(options.redirect).toBe('manual');
    expect(options.headers.get('cookie')).toBeNull();
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
  it('bridges provider GET to the browser without exchanging the code or issuing session cookies', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const response = await googleNavigation(
      navigation('/callback?code=abc&state=xyz&scope=openid&authuser=0&prompt=consent'),
      'callback',
    );
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/login/google/callback?code=abc&state=xyz');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('forwards only the scoped state cookie during POST finalization and accepts onboarding intent', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        redirect('http://localhost:3001/register/complete', [
          stateCookie,
          registrationCookie,
          'tracking=bad; Path=/; HttpOnly; SameSite=Lax',
        ]),
      );
    vi.stubGlobal('fetch', fetch);
    const response = await finalizeGoogleNavigation(
      finalization(undefined, {
        cookie: 'tracking=1; google_oauth_state=opaque; access_token=secret; refresh_token=secret',
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ redirectTo: '/register/complete' });
    expect(response.headers.getSetCookie()).toEqual([stateCookie, registrationCookie]);
    const [url, options] = fetch.mock.calls[0] ?? [];
    expect(url).toBe('http://localhost:3000/api/v1/auth/google/callback?code=abc&state=xyz');
    expect(options.method).toBe('GET');
    expect(options.headers.get('cookie')).toBe('google_oauth_state=opaque');
  });
  it('keeps distinct access and refresh cookies for an existing Google user', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          redirect('http://localhost:3001/account', [accessCookie, refreshCookie]),
        ),
    );
    const response = await finalizeGoogleNavigation(finalization());
    expect(response.headers.getSetCookie()).toEqual([accessCookie, refreshCookie]);
    expect(await response.json()).toEqual({ redirectTo: '/account?mindyAuth=google' });
  });
  it('rejects untrusted Google or frontend redirects without issuing auth cookies', async () => {
    for (const location of [
      'https://accounts.google.com.evil.example/o/oauth2/v2/auth',
      'https://accounts.google.com/other',
    ]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(redirect(location, [accessCookie])));
      const response = await googleNavigation(navigation(''), 'start');
      expect(response.status).toBe(303);
      expect(response.headers.get('location')).toBe('/login?error=google_unavailable');
      expect(response.headers.getSetCookie()).toEqual([]);
    }
    for (const location of [
      'https://evil.example/account',
      'http://localhost:3001/api/v1/auth/google',
      'http://localhost:3001/account/../../api/v1/auth/google',
    ]) {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(redirect(location, [accessCookie, refreshCookie])),
      );
      const response = await finalizeGoogleNavigation(finalization());
      expect(await response.json()).toEqual({
        redirectTo: '/login?error=google_authentication_failed',
      });
      expect(response.headers.getSetCookie().join(';')).not.toContain('access_token');
    }
  });
  it('preserves trusted return parameters and hash, marking only an authenticated session', async () => {
    for (const [location, cookies, expected] of [
      [
        'http://localhost:3001/management/users?page=2#member',
        [accessCookie, refreshCookie],
        '/management/users?page=2&mindyAuth=google#member',
      ],
      ['http://localhost:3001/register/complete', [registrationCookie], '/register/complete'],
      [
        'http://localhost:3001/login?error=google_authentication_failed',
        [stateCookie],
        '/login?error=google_authentication_failed',
      ],
    ] as const) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(redirect(location, [...cookies])));
      const response = await finalizeGoogleNavigation(finalization());
      expect(await response.json()).toEqual({ redirectTo: expected });
    }
  });
  it('rejects malformed provider queries without contacting the backend', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    for (const query of [
      'state=a&state=b',
      'code=abc',
      'code=abc&state=',
      `code=${'a'.repeat(4097)}&state=a`,
    ]) {
      const response = await googleNavigation(navigation(`/callback?${query}`), 'callback');
      expect(response.status).toBe(303);
      expect(response.headers.get('location')).toBe('/login?error=google_authentication_failed');
      expect(response.headers.getSetCookie().join(';')).not.toContain('access_token');
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it('requires matching Origin and strictly bounded JSON for finalization', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect(
      (
        await finalizeGoogleNavigation(
          finalization(undefined, { origin: 'https://untrusted.example' }),
        )
      ).status,
    ).toBe(403);
    expect(
      (await finalizeGoogleNavigation(finalization(undefined, { 'content-type': 'text/plain' })))
        .status,
    ).toBe(415);
    expect(
      (
        await finalizeGoogleNavigation(
          finalization({ code: 'abc', state: 'xyz', returnTo: '/account' }),
        )
      ).status,
    ).toBe(422);
    expect(
      (await finalizeGoogleNavigation(finalization({ code: 'a'.repeat(33_000), state: 'xyz' })))
        .status,
    ).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('requires correctly scoped cookies and handles unavailable backend without returning raw details', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          redirect('https://accounts.google.com/o/oauth2/v2/auth', [
            'google_oauth_state=bad; Path=/; HttpOnly; SameSite=Lax',
          ]),
        ),
    );
    expect((await googleNavigation(navigation(''), 'start')).status).toBe(303);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(redirect('http://localhost:3001/account', [accessCookie])),
    );
    const incomplete = await finalizeGoogleNavigation(finalization());
    expect(await incomplete.json()).toEqual({
      redirectTo: '/login?error=google_authentication_failed',
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const failed = await finalizeGoogleNavigation(finalization());
    expect(await failed.json()).toEqual({
      redirectTo: '/login?error=google_authentication_failed',
    });
  });
});
