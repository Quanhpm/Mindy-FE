import { describe, expect, it } from 'vitest';
import { authCookies, isAllowedEndpoint, isAllowedOrigin } from './proxy-policy';

describe('API proxy boundary', () => {
  it('only forwards supported identity endpoints and methods', () => {
    expect(isAllowedEndpoint('POST', 'auth/login')).toBe(true);
    expect(
      isAllowedEndpoint('PATCH', 'admin/users/123e4567-e89b-42d3-a456-426614174000/status'),
    ).toBe(true);
    expect(isAllowedEndpoint('DELETE', 'admin/users/123e4567-e89b-42d3-a456-426614174000')).toBe(
      false,
    );
    expect(isAllowedEndpoint('GET', '../health/live')).toBe(false);
    expect(isAllowedEndpoint('GET', 'https://attacker.example')).toBe(false);
    expect(isAllowedEndpoint('POST', 'auth/register')).toBe(false);
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
});
