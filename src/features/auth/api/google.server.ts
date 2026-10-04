import 'server-only';
import { getServerEnv } from '@/shared/config/env.server';
import { safeReturnTo } from '../permissions/access-policy';
import { googleCallbackInputSchema } from '../schemas/google-callback.schema';
import { googleSessionMarker } from '../session/session-marker';
import {
  googleCallbackQuery,
  googleResponseCookies,
  googleStateCookie,
  trustedGoogleRedirect,
} from './google-policy';

const clearedState =
  'google_oauth_state=; Path=/api/v1/auth/google/callback; Max-Age=0; HttpOnly; SameSite=Lax';
const callbackFailure = '/login?error=google_authentication_failed';

function navigationHeaders(): Headers {
  return new Headers({
    'Cache-Control': 'private, no-store',
    Vary: 'Cookie',
    'Referrer-Policy': 'no-referrer',
  });
}

export async function googleNavigation(
  request: Request,
  phase: 'start' | 'callback',
): Promise<Response> {
  if (phase === 'callback') {
    // Provider navigation must not issue session cookies. The browser WebLock
    // covers the subsequent POST and its complete Set-Cookie response.
    const query = googleCallbackQuery(new URL(request.url).searchParams);
    const headers = navigationHeaders();
    headers.set('Location', query ? `/login/google/callback?${query}` : callbackFailure);
    if (!query) headers.append('Set-Cookie', clearedState);
    return new Response(null, { status: 303, headers });
  }
  let env: ReturnType<typeof getServerEnv>;
  try {
    env = getServerEnv();
  } catch {
    return startFailure();
  }
  const params = new URLSearchParams({
    returnTo: safeReturnTo(new URL(request.url).searchParams.get('returnTo'), '/account'),
  });
  return exchangeGoogle(request, 'start', params, env);
}

function startFailure(): Response {
  const headers = navigationHeaders();
  headers.set('Location', '/login?error=google_unavailable');
  return new Response(null, { status: 303, headers });
}

export async function finalizeGoogleNavigation(request: Request): Promise<Response> {
  const rejection = (status: number, code: string) =>
    Response.json(
      { code, message: 'Google callback request rejected.' },
      { status, headers: navigationHeaders() },
    );
  let env: ReturnType<typeof getServerEnv>;
  try {
    env = getServerEnv();
  } catch {
    return rejection(503, 'API_UNAVAILABLE');
  }
  if (request.method !== 'POST') return rejection(405, 'METHOD_NOT_ALLOWED');
  if (request.headers.get('origin') !== env.APP_ORIGIN) return rejection(403, 'ORIGIN_NOT_ALLOWED');
  if (new URL(request.url).search) return rejection(400, 'INVALID_CALLBACK_REQUEST');
  if (
    request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json'
  )
    return rejection(415, 'INVALID_CALLBACK_REQUEST');

  const reader = request.body?.getReader();
  let payload: unknown;
  try {
    if (!reader) return rejection(400, 'INVALID_CALLBACK_REQUEST');
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 32_768) {
        await reader.cancel();
        return rejection(413, 'PAYLOAD_TOO_LARGE');
      }
      chunks.push(chunk.value);
    }
    payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return rejection(400, 'INVALID_CALLBACK_REQUEST');
  } finally {
    reader?.releaseLock();
  }
  const input = googleCallbackInputSchema.safeParse(payload);
  if (!input.success) return rejection(422, 'INVALID_CALLBACK_REQUEST');
  return exchangeGoogle(request, 'callback', new URLSearchParams(input.data), env);
}

async function exchangeGoogle(
  request: Request,
  phase: 'start' | 'callback',
  params: URLSearchParams,
  env: ReturnType<typeof getServerEnv>,
): Promise<Response> {
  const responseHeaders = navigationHeaders();
  function failure(): Response {
    if (phase === 'start') return startFailure();
    responseHeaders.append('Set-Cookie', clearedState);
    return Response.json({ redirectTo: callbackFailure }, { headers: responseHeaders });
  }
  const path = phase === 'start' ? 'auth/google' : 'auth/google/callback';
  const headers = new Headers({ accept: 'application/json' });
  const cookie = phase === 'callback' ? googleStateCookie(request.headers.get('cookie')) : '';
  if (cookie) headers.set('cookie', cookie);
  const agent = request.headers.get('user-agent');
  if (agent) headers.set('user-agent', agent);
  try {
    const upstream = await fetch(`${env.API_BASE_URL.replace(/\/$/, '')}/${path}?${params}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    });
    const redirect = trustedGoogleRedirect(upstream.headers.get('location'), phase, env.APP_ORIGIN);
    if (upstream.status !== 302 || !redirect) return failure();
    const cookies = googleResponseCookies(
      upstream.headers.getSetCookie(),
      phase,
      env.APP_ORIGIN.startsWith('https:'),
    );
    if (phase === 'start' && cookies.length === 0) return failure();
    if (phase === 'callback') {
      const target = new URL(redirect).pathname;
      const names = cookies.map((value) => value.split('=')[0]);
      if (target === '/register/complete' && !names.includes('registration_intent'))
        return failure();
      if (
        target !== '/register/complete' &&
        target !== '/login' &&
        (!names.includes('access_token') || !names.includes('refresh_token'))
      )
        return failure();
    }
    for (const value of cookies) responseHeaders.append('Set-Cookie', value);
    const destination = new URL(redirect);
    if (phase === 'start') {
      responseHeaders.set('Location', destination.toString());
      return new Response(null, { status: 302, headers: responseHeaders });
    }
    if (destination.pathname !== '/register/complete' && destination.pathname !== '/login')
      destination.searchParams.set(googleSessionMarker, 'google');
    return Response.json(
      { redirectTo: `${destination.pathname}${destination.search}${destination.hash}` },
      { headers: responseHeaders },
    );
  } catch {
    return failure();
  }
}
