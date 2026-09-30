import { describe, expect, it } from 'vitest';
import { canManageUsers, safeReturnTo } from './access-policy';

describe('navigation policy', () => {
  it('matches ADMIN and MANAGER roles exposed by the users controller', () => {
    expect(canManageUsers('ADMIN')).toBe(true);
    expect(canManageUsers('MANAGER')).toBe(true);
    expect(canManageUsers('MENTOR')).toBe(false);
    expect(canManageUsers('STUDENT')).toBe(false);
  });
  it('does not allow login return URLs to leave the app', () => {
    expect(safeReturnTo('//evil.example', '/account')).toBe('/account');
    expect(safeReturnTo('https://evil.example', '/account')).toBe('/account');
    expect(safeReturnTo('/account\\evil', '/account')).toBe('/account');
    expect(safeReturnTo('/management/users?page=2', '/account')).toBe('/management/users?page=2');
  });
});
