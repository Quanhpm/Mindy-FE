import { describe, expect, it } from 'vitest';
import { authCookies, isAllowedEndpoint, isAllowedOrigin } from './proxy-policy';

describe('API proxy boundary', () => {
  it('only forwards supported endpoints and methods', () => {
    expect(isAllowedEndpoint('GET', 'health/live')).toBe(true);
    expect(isAllowedEndpoint('POST', 'health/live')).toBe(false);
    expect(isAllowedEndpoint('GET', 'health/ready')).toBe(false);
    expect(isAllowedEndpoint('POST', 'auth/login')).toBe(true);
    expect(
      isAllowedEndpoint('PATCH', 'admin/users/123e4567-e89b-42d3-a456-426614174000/status'),
    ).toBe(true);
    expect(isAllowedEndpoint('DELETE', 'admin/users/123e4567-e89b-42d3-a456-426614174000')).toBe(
      false,
    );
    expect(isAllowedEndpoint('GET', '../health/live')).toBe(false);
    expect(isAllowedEndpoint('GET', 'https://attacker.example')).toBe(false);
    for (const path of ['auth/register', 'auth/email/verify', 'auth/email/resend']) {
      expect(isAllowedEndpoint('POST', path)).toBe(true);
      expect(isAllowedEndpoint('GET', path)).toBe(false);
    }
    expect(isAllowedEndpoint('POST', 'auth/email/verify/extra')).toBe(false);
  });
  it('rejects mutation requests from another origin or without an Origin', () => {
    const origin = 'http://localhost:3001';
    expect(isAllowedOrigin('POST', origin, origin)).toBe(true);
    expect(isAllowedOrigin('POST', 'https://attacker.example', origin)).toBe(false);
    expect(isAllowedOrigin('PATCH', null, origin)).toBe(false);
  });
  it('only sends refresh cookies to the refresh endpoint', () => {
    const input = 'access_token=access; refresh_token=refresh; tracking=secret';
    expect(authCookies(input, 'auth/me')).toBe('access_token=access');
    expect(authCookies(input, 'auth/refresh')).toBe('access_token=access; refresh_token=refresh');
    expect(authCookies(null, 'auth/refresh')).toBe('');
  });
  it('allows exactly the catalog/class operations that exist on the backend', () => {
    const id = '123e4567-e89b-42d3-a456-426614174000';
    const allowed = [
      ['GET', 'course-categories'],
      ['POST', 'admin/course-categories'],
      ['GET', 'admin/courses'],
      ['POST', 'admin/courses'],
      ['GET', `admin/courses/${id}`],
      ['PATCH', `admin/courses/${id}`],
      ['POST', `admin/courses/${id}/units`],
      ['PUT', `admin/courses/${id}/units/order`],
      ['POST', `admin/courses/${id}/activate`],
      ['GET', 'admin/classes'],
      ['POST', 'admin/classes'],
      ['GET', `admin/classes/${id}`],
      ['PATCH', `admin/classes/${id}`],
      ...['sessions', 'open', 'start', 'complete', 'cancel'].map((command) => [
        'POST',
        `admin/classes/${id}/${command}`,
      ]),
    ];
    for (const [method, path] of allowed) {
      expect(isAllowedEndpoint(method as string, path as string)).toBe(true);
      expect(isAllowedEndpoint('DELETE', path as string)).toBe(false);
      expect(isAllowedEndpoint(method as string, `${path}/extra`)).toBe(false);
    }
    expect(isAllowedEndpoint('POST', `admin/courses/${id}/deactivate`)).toBe(false);
    expect(isAllowedEndpoint('PATCH', `admin/classes/${id}/sessions/${id}`)).toBe(false);
    expect(isAllowedEndpoint('GET', `admin/courses/${'a'.repeat(36)}`)).toBe(false);
    expect(isAllowedEndpoint('POST', 'me/orders')).toBe(false);
  });
  it('opens only public browse and student cart/order methods with exact identifiers', () => {
    const id = '123e4567-e89b-42d3-a456-426614174000';
    for (const path of [
      'courses',
      `courses/${id}`,
      `courses/${id}/classes`,
      `classes/${id}`,
      'me/cart',
      'me/orders',
      `me/orders/${id}`,
    ]) {
      expect(isAllowedEndpoint('GET', path)).toBe(true);
      expect(isAllowedEndpoint('PATCH', path)).toBe(false);
      expect(isAllowedEndpoint('GET', `${path}/extra`)).toBe(false);
    }
    for (const path of ['me/cart/items', 'me/cart/checkout']) {
      expect(isAllowedEndpoint('POST', path)).toBe(true);
      expect(isAllowedEndpoint('DELETE', path)).toBe(false);
    }
    expect(isAllowedEndpoint('DELETE', `me/cart/items/${id}`)).toBe(true);
    for (const path of [
      'me/cart',
      `me/orders/${id}`,
      `me/cart/items/${id}/extra`,
      'me/cart/items/not-a-uuid',
      `courses/${id}/units/${id}`,
      `me/orders/${id}/payments/payos`,
    ])
      expect(isAllowedEndpoint('DELETE', path)).toBe(false);
    expect(isAllowedEndpoint('POST', `me/orders/${id}/cancel`)).toBe(false);
    expect(isAllowedOrigin('DELETE', null, 'http://localhost:3101')).toBe(false);
    expect(authCookies('access_token=a; refresh_token=r; registration_intent=i', 'me/cart')).toBe(
      'access_token=a',
    );
  });
  it('restricts registration intent to the two onboarding JSON endpoints', () => {
    const input =
      'access_token=a; refresh_token=r; registration_intent=i; google_oauth_state=s; tracking=t';
    for (const path of ['auth/registration-context', 'auth/google/complete-registration']) {
      expect(authCookies(input, path)).toBe('access_token=a; registration_intent=i');
    }
    expect(authCookies(input, 'admin/courses')).toBe('access_token=a');
    expect(isAllowedEndpoint('GET', 'auth/registration-context')).toBe(true);
    expect(isAllowedEndpoint('POST', 'auth/google/complete-registration')).toBe(true);
    expect(isAllowedEndpoint('GET', 'auth/google')).toBe(false);
    expect(isAllowedEndpoint('GET', 'auth/google/callback')).toBe(false);
    expect(isAllowedOrigin('PUT', null, 'http://localhost:3101')).toBe(false);
  });
});
