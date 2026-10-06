const rules: readonly [string, RegExp][] = [
  ['GET', /^health\/live$/],
  ['POST', /^auth\/(login|register|email\/resend|email\/verify|refresh|logout|logout-all)$/],
  ['GET', /^auth\/(me|registration-context)$/],
  ['POST', /^auth\/google\/complete-registration$/],
  ['GET', /^admin\/users$/],
  ['POST', /^admin\/users$/],
  ['GET', /^admin\/users\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i],
  ['PATCH', /^admin\/users\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}\/status$/i],
  ['GET', /^course-categories$/],
  ['GET', /^courses$/],
  ['GET', /^courses\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}(\/classes)?$/i],
  ['GET', /^classes\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i],
  ['GET', /^me\/cart$/],
  ['POST', /^me\/cart\/(items|checkout)$/],
  ['DELETE', /^me\/cart\/items\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i],
  ['GET', /^me\/orders$/],
  ['GET', /^me\/orders\/payment-result$/],
  ['GET', /^mentor\/cash-orders$/],
  [
    'POST',
    /^mentor\/cash-orders\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}\/confirm$/i,
  ],
  ['GET', /^me\/classes\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}\/preview$/i],
  [
    'POST',
    /^me\/orders\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}\/payments\/payos$/i,
  ],
  ['GET', /^me\/classes\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i],
  ['GET', /^admin\/payments\/reconciliation$/],
  [
    'POST',
    /^admin\/payments\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}\/reconcile$/i,
  ],
  ['GET', /^me\/orders\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i],
  ['POST', /^admin\/course-categories$/],
  ['GET', /^admin\/courses$/],
  ['POST', /^admin\/courses$/],
  ['GET', /^admin\/courses\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i],
  ['PATCH', /^admin\/courses\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i],
  [
    'POST',
    /^admin\/courses\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}\/(units|activate)$/i,
  ],
  [
    'PUT',
    /^admin\/courses\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}\/units\/order$/i,
  ],
  ['GET', /^admin\/classes$/],
  ['POST', /^admin\/classes$/],
  ['GET', /^admin\/classes\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i],
  ['PATCH', /^admin\/classes\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i],
  [
    'POST',
    /^admin\/classes\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}\/(sessions|open|start|complete|cancel)$/i,
  ],
];

export function isAllowedEndpoint(method: string, path: string): boolean {
  return rules.some(([verb, pattern]) => verb === method && pattern.test(path));
}

export function isAllowedOrigin(method: string, origin: string | null, expected: string): boolean {
  return method === 'GET' || origin === expected;
}

export function authCookies(cookieHeader: string | null, path: string): string {
  const allowed = ['access_token'];
  if (path === 'auth/refresh') allowed.push('refresh_token');
  if (path === 'auth/registration-context' || path === 'auth/google/complete-registration')
    allowed.push('registration_intent');
  return (cookieHeader ?? '')
    .split(';')
    .map((cookie) => cookie.trim())
    .filter((cookie) => allowed.includes(cookie.split('=')[0] ?? ''))
    .join('; ');
}
