const rules: readonly [string, RegExp][] = [
  ['POST', /^auth\/(login|refresh|logout|logout-all)$/],
  ['GET', /^auth\/me$/],
  ['GET', /^admin\/users$/],
  ['POST', /^admin\/users$/],
  ['GET', /^admin\/users\/[a-f\d-]{36}$/i],
  ['PATCH', /^admin\/users\/[a-f\d-]{36}\/status$/i],
];

export function isAllowedEndpoint(method: string, path: string): boolean {
  return rules.some(([verb, pattern]) => verb === method && pattern.test(path));
}

export function isAllowedOrigin(method: string, origin: string | null, expected: string): boolean {
  return method === 'GET' || origin === expected;
}

export function authCookies(cookieHeader: string | null, path: string): string {
  const allowed = path === 'auth/refresh' ? ['access_token', 'refresh_token'] : ['access_token'];
  return (cookieHeader ?? '')
    .split(';')
    .map((cookie) => cookie.trim())
    .filter((cookie) => allowed.includes(cookie.split('=')[0] ?? ''))
    .join('; ');
}
