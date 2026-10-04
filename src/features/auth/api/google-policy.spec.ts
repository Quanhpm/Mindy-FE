import { describe, expect, it } from 'vitest';
import { googleResponseCookies, googleStateCookie, trustedGoogleRedirect } from './google-policy';

describe('OAuth cookie and redirect policy', () => {
  it('rejects unscoped, non-HttpOnly and foreign-domain cookies', () => {
    expect(
      googleResponseCookies(
        [
          'registration_intent=1; Path=/api/v1/auth; HttpOnly; SameSite=Lax',
          'registration_intent=2; Path=/; HttpOnly; SameSite=Lax',
          'registration_intent=3; Path=/api/v1/auth; SameSite=Lax',
          'access_token=4; Path=/; HttpOnly; SameSite=Lax; Domain=evil.example',
          'other=5; Path=/; HttpOnly; SameSite=Lax',
        ],
        'callback',
      ),
    ).toEqual(['registration_intent=1; Path=/api/v1/auth; HttpOnly; SameSite=Lax']);
  });
  it('does not forward ambiguous duplicate OAuth state cookies', () => {
    expect(googleStateCookie('google_oauth_state=1; access_token=secret')).toBe(
      'google_oauth_state=1',
    );
    expect(googleStateCookie('google_oauth_state=1; google_oauth_state=2')).toBe('');
  });
  it('rejects duplicate scope attributes and requires Secure on HTTPS deployments', () => {
    const cookie = 'access_token=1; Path=/; HttpOnly; SameSite=Lax';
    expect(googleResponseCookies([`${cookie}; Path=/unsafe`], 'callback')).toEqual([]);
    expect(googleResponseCookies([`${cookie}; SameSite=None`], 'callback')).toEqual([]);
    expect(googleResponseCookies([cookie], 'callback', true)).toEqual([]);
    expect(googleResponseCookies([`${cookie}; Secure`], 'callback', true)).toEqual([
      `${cookie}; Secure`,
    ]);
  });
  it('rejects credential-bearing and encoded control redirects', () => {
    expect(
      trustedGoogleRedirect(
        'https://user@accounts.google.com/o/oauth2/v2/auth',
        'start',
        'https://mindy.example',
      ),
    ).toBeNull();
    expect(
      trustedGoogleRedirect(
        'https://mindy.example/account/%5c%5cevil',
        'callback',
        'https://mindy.example',
      ),
    ).toBeNull();
  });
});
