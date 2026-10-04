import { hasUnsafeUrlCharacters, safeReturnTo } from '../permissions/access-policy';
import { googleCallbackInputSchema } from '../schemas/google-callback.schema';

const cookiePaths: Record<string, string> = {
  access_token: '/',
  refresh_token: '/api/v1/auth/refresh',
  google_oauth_state: '/api/v1/auth/google/callback',
  registration_intent: '/api/v1/auth',
};

export function trustedGoogleRedirect(
  value: string | null,
  phase: 'start' | 'callback',
  appOrigin: string,
): string | null {
  if (!value || hasUnsafeUrlCharacters(value)) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password) return null;
    if (phase === 'start')
      return url.origin === 'https://accounts.google.com' && url.pathname === '/o/oauth2/v2/auth'
        ? url.toString()
        : null;
    if (url.origin !== appOrigin) return null;
    if (['/login', '/register/complete'].includes(url.pathname)) return url.toString();
    const path = `${url.pathname}${url.search}${url.hash}`;
    return safeReturnTo(path, '') === path ? url.toString() : null;
  } catch {
    return null;
  }
}

export function googleResponseCookies(
  values: string[],
  phase: 'start' | 'callback',
  requireSecure = false,
): string[] {
  return values.filter((value) => {
    const [pair, ...attributes] = value.split(';').map((part) => part.trim());
    const name = pair?.split('=')[0];
    if (!name || !(name in cookiePaths) || (phase === 'start' && name !== 'google_oauth_state'))
      return false;
    const parsed = new Map<string, string>();
    for (const attribute of attributes) {
      const separator = attribute.indexOf('=');
      const key = (separator < 0 ? attribute : attribute.slice(0, separator)).toLowerCase();
      if (parsed.has(key)) return false;
      parsed.set(key, separator < 0 ? '' : attribute.slice(separator + 1));
    }
    return (
      parsed.has('httponly') &&
      parsed.get('samesite')?.toLowerCase() === 'lax' &&
      parsed.get('path') === cookiePaths[name] &&
      !parsed.has('domain') &&
      (!requireSecure || parsed.has('secure'))
    );
  });
}

export function googleStateCookie(cookieHeader: string | null): string {
  const cookies = (cookieHeader ?? '')
    .split(';')
    .map((value) => value.trim())
    .filter((value) => value.startsWith('google_oauth_state='));
  return cookies.length === 1 ? (cookies[0] ?? '') : '';
}

export function googleCallbackQuery(params: URLSearchParams): URLSearchParams | null {
  const result = new URLSearchParams();
  for (const [key, max] of [
    ['code', 4096],
    ['state', 512],
    ['error', 200],
  ] as const) {
    const values = params.getAll(key);
    if (values.length > 1 || (values[0]?.length ?? 0) > max) return null;
    if (values[0] !== undefined) result.set(key, values[0]);
  }
  // Google also supplies scope/authuser/prompt; they are not fields in the backend DTO.
  return googleCallbackInputSchema.safeParse(Object.fromEntries(result)).success ? result : null;
}

export function trustedGoogleReturnPath(value: string, origin: string): string | null {
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  try {
    const trusted = trustedGoogleRedirect(new URL(value, origin).href, 'callback', origin);
    if (!trusted) return null;
    const destination = new URL(trusted);
    const path = `${destination.pathname}${destination.search}${destination.hash}`;
    return path === value ? path : null;
  } catch {
    return null;
  }
}
