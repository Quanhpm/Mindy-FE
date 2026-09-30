import { describe, expect, it } from 'vitest';
import { createUserSchema, userFiltersSchema } from './user.schema';

describe('user input contract', () => {
  const input = {
    displayName: 'Student',
    email: 'student@example.com',
    phone: '',
    password: 'long-password-123',
    role: 'STUDENT',
  };
  it('accepts optional phone but rejects short passwords and blank names', () => {
    expect(createUserSchema.safeParse(input).success).toBe(true);
    expect(createUserSchema.safeParse({ ...input, password: 'seven77' }).success).toBe(true);
    expect(createUserSchema.safeParse({ ...input, password: 'short' }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...input, displayName: '   ' }).success).toBe(false);
  });
  it('bounds pagination and ignores unknown filters from the URL', () => {
    expect(userFiltersSchema.parse({ page: '-1', pageSize: '10000', role: 'ROOT' })).toEqual({
      page: 1,
      pageSize: 20,
      role: undefined,
    });
  });
});
