import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { DELETE, GET, POST, PUT } from './route';

const origin = 'http://localhost:3101';
const id = '123e4567-e89b-42d3-a456-426614174000';
function context(path: string) {
  return { params: Promise.resolve({ path: path.split('/') }) };
}
function configure() {
  vi.stubEnv('API_BASE_URL', 'http://127.0.0.1:3199/api/v1');
  vi.stubEnv('APP_ORIGIN', origin);
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('same-origin JSON adapter', () => {
  it('forwards exact cart DELETE without broadening delete permissions or cookies', async () => {
    configure();
    const upstream = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', upstream);
    const path = `me/cart/items/${id}`;
    const response = await DELETE(
      new Request(`${origin}/api/v1/${path}`, {
        method: 'DELETE',
        headers: { origin, cookie: 'access_token=a; refresh_token=r; tracking=t' },
      }),
      context(path),
    );
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    const options = upstream.mock.calls[0]?.[1] as RequestInit;
    expect(options.method).toBe('DELETE');
    expect(options.body).toBeUndefined();
    expect((options.headers as Headers).get('cookie')).toBe('access_token=a');
    const denied = await DELETE(
      new Request(`${origin}/api/v1/me/orders/${id}`, { method: 'DELETE', headers: { origin } }),
      context(`me/orders/${id}`),
    );
    expect(denied.status).toBe(404);
    const foreign = await DELETE(
      new Request(`${origin}/api/v1/${path}`, {
        method: 'DELETE',
        headers: { origin: 'https://evil.example' },
      }),
      context(path),
    );
    expect(foreign.status).toBe(403);
    expect(upstream).toHaveBeenCalledTimes(1);
  });
  it('forwards PUT reorder JSON with access cookie, preserving separate session cookies and no-store', async () => {
    configure();
    const upstream = vi.fn().mockResolvedValue(
      new Response('{"id":"ok"}', {
        status: 200,
        headers: [
          ['content-type', 'application/json'],
          ['set-cookie', 'access_token=new; HttpOnly; Path=/'],
          ['set-cookie', 'refresh_token=rotated; HttpOnly; Path=/api/v1/auth/refresh'],
        ],
      }),
    );
    vi.stubGlobal('fetch', upstream);
    const path = `admin/courses/${id}/units/order`;
    const response = await PUT(
      new Request(`${origin}/api/v1/${path}`, {
        method: 'PUT',
        headers: {
          origin,
          cookie: 'access_token=a; refresh_token=r; registration_intent=i; analytics=t',
        },
        body: JSON.stringify({ unitIds: [id] }),
      }),
      context(path),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.getSetCookie()).toHaveLength(2);
    const [url, options] = upstream.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`http://127.0.0.1:3199/api/v1/${path}`);
    expect(options.method).toBe('PUT');
    expect(options.body).toBe(JSON.stringify({ unitIds: [id] }));
    expect((options.headers as Headers).get('cookie')).toBe('access_token=a');
    expect(options.cache).toBe('no-store');
    expect(options.redirect).toBe('manual');
  });
  it('rejects missing/foreign Origin before sending mutations upstream', async () => {
    configure();
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);
    for (const requestOrigin of [undefined, 'https://attacker.example']) {
      const response = await POST(
        new Request(`${origin}/api/v1/admin/classes`, {
          method: 'POST',
          headers: requestOrigin ? { origin: requestOrigin } : {},
          body: '{}',
        }),
        context('admin/classes'),
      );
      expect(response.status).toBe(403);
    }
    expect(upstream).not.toHaveBeenCalled();
  });
  it('enforces the byte limit without trusting content-length', async () => {
    configure();
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);
    const response = await POST(
      new Request(`${origin}/api/v1/admin/courses`, {
        method: 'POST',
        headers: { origin },
        body: 'á'.repeat(17000),
      }),
      context('admin/courses'),
    );
    expect(response.status).toBe(413);
    expect(upstream).not.toHaveBeenCalled();
  });
  it('keeps navigation redirects out of the generic JSON proxy', async () => {
    configure();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: {
            location: 'https://attacker.example',
            'set-cookie': 'access_token=untrusted',
          },
        }),
      ),
    );
    const response = await GET(new Request(`${origin}/api/v1/auth/me`), context('auth/me'));
    expect(response.status).toBe(502);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.getSetCookie()).toHaveLength(0);
  });
  it('forwards onboarding intent only to its JSON boundary', async () => {
    configure();
    const upstream = vi.fn().mockResolvedValue(Response.json({ email: 'student@example.com' }));
    vi.stubGlobal('fetch', upstream);
    await GET(
      new Request(`${origin}/api/v1/auth/registration-context`, {
        headers: { cookie: 'registration_intent=i; google_oauth_state=s; refresh_token=r' },
      }),
      context('auth/registration-context'),
    );
    const options = upstream.mock.calls[0]?.[1] as RequestInit;
    expect((options.headers as Headers).get('cookie')).toBe('registration_intent=i');
  });
  it('reports unavailable configuration without exposing upstream data', async () => {
    vi.stubEnv('APP_ORIGIN', 'invalid');
    vi.stubEnv('API_BASE_URL', 'invalid');
    const response = await GET(new Request(`${origin}/api/v1/auth/me`), context('auth/me'));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'API_UNAVAILABLE' });
  });
});

it('forwards exact payment creation with ownership failures and rejects foreign origin/callback proxying', async () => {
  configure();
  const path = `me/orders/${id}/payments/payos`;
  const upstream = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ code: 'ORDER_ACCESS_DENIED', message: 'Denied' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', upstream);
  const response = await POST(
    new Request(`${origin}/api/v1/${path}`, {
      method: 'POST',
      headers: {
        origin,
        'content-type': 'application/json',
        cookie: 'access_token=a; refresh_token=r',
      },
      body: '{}',
    }),
    context(path),
  );
  expect(response.status).toBe(403);
  expect(await response.json()).toMatchObject({ code: 'ORDER_ACCESS_DENIED' });
  const options = upstream.mock.calls[0]?.[1] as RequestInit;
  expect((options.headers as Headers).get('cookie')).toBe('access_token=a');
  expect(upstream.mock.calls[0]?.[1]?.body).toBe('{}');
  const foreign = await POST(
    new Request(`${origin}/api/v1/${path}`, {
      method: 'POST',
      headers: { origin: 'https://foreign.test' },
      body: '{}',
    }),
    context(path),
  );
  expect(foreign.status).toBe(403);
  const callback = await POST(
    new Request(`${origin}/api/v1/payment-callbacks/payos`, {
      method: 'POST',
      headers: { origin },
      body: '{}',
    }),
    context('payment-callbacks/payos'),
  );
  expect(callback.status).toBe(404);
  expect(upstream).toHaveBeenCalledOnce();
});
