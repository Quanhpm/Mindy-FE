import { describe, expect, it } from 'vitest';
import { googleAvatarUrl, googleRegistrationSchema } from './google-registration.schema';
import { registerSchema } from './register.schema';

describe('public and Google registration contract', () => {
  it('keeps public password limits at 6–128 independently from admin creation', () => {
    const values = {
      email: 'student@example.com',
      displayName: 'Student',
      phone: '',
      password: '123456',
    };
    expect(registerSchema.safeParse(values).success).toBe(true);
    expect(registerSchema.safeParse({ ...values, password: '12345' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...values, password: 'a'.repeat(128) }).success).toBe(true);
    expect(registerSchema.safeParse({ ...values, password: 'a'.repeat(129) }).success).toBe(false);
  });
  it('trims profile fields and rejects empty display names', () => {
    expect(googleRegistrationSchema.parse({ displayName: '  Học viên  ', phone: '' })).toEqual({
      displayName: 'Học viên',
      phone: '',
    });
    expect(googleRegistrationSchema.safeParse({ displayName: '  ', phone: '' }).success).toBe(
      false,
    );
    expect(googleRegistrationSchema.safeParse({ displayName: 'Name', phone: '123' }).success).toBe(
      false,
    );
  });
  it('only renders Google-hosted HTTPS avatars', () => {
    expect(googleAvatarUrl('https://lh3.googleusercontent.com/profile')).toBe(
      'https://lh3.googleusercontent.com/profile',
    );
    expect(googleAvatarUrl('http://lh3.googleusercontent.com/profile')).toBeUndefined();
    expect(
      googleAvatarUrl('https://lh3.googleusercontent.com.evil.example/profile'),
    ).toBeUndefined();
    expect(googleAvatarUrl('javascript:alert(1)')).toBeUndefined();
  });
});
