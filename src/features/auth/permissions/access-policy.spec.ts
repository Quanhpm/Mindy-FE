import { describe, expect, it } from 'vitest';
import { canManageUsers, canPurchaseClasses, safeReturnTo } from './access-policy';

describe('navigation policy', () => {
  it('allows only ADMIN to access management', () => {
    expect(canManageUsers('ADMIN')).toBe(true);
    expect(canManageUsers('MENTOR')).toBe(false);
    expect(canManageUsers('STUDENT')).toBe(false);
  });
  it('allows purchases only for STUDENT and preserves supported browse/order return paths', () => {
    expect(canPurchaseClasses('STUDENT')).toBe(true);
    expect(canPurchaseClasses('ADMIN')).toBe(false);
    expect(canPurchaseClasses('MENTOR')).toBe(false);
    const id = '123e4567-e89b-42d3-a456-426614174000';
    for (const path of [
      '/courses?deliveryMode=ONLINE&page=2',
      `/courses/${id}/units/${id}`,
      `/classes/${id}`,
      '/cart',
      '/checkout',
      '/orders?status=PENDING',
      `/orders/${id}`,
    ])
      expect(safeReturnTo(path, '/account')).toBe(path);
    for (const path of [
      '/api/v1/me/cart',
      '/cart/extra',
      '/orders/not-a-uuid',
      `/courses/${id}/units/${id}/complete`,
      '/management/users/arbitrary',
      '/cart/../../api/v1/auth/google',
      '/cart%0d%0aLocation:https://evil.example',
    ])
      expect(safeReturnTo(path, '/account')).toBe('/account');
  });
  it('does not allow login return URLs to leave the app', () => {
    expect(safeReturnTo('//evil.example', '/account')).toBe('/account');
    expect(safeReturnTo('https://evil.example', '/account')).toBe('/account');
    expect(safeReturnTo('/account\\evil', '/account')).toBe('/account');
    expect(safeReturnTo('/account/%5c%5cevil', '/account')).toBe('/account');
    expect(safeReturnTo('/account/../../api/v1/auth/google', '/account')).toBe('/account');
    expect(safeReturnTo('/management/classes/new', '/account')).toBe('/management/classes/new');
    expect(safeReturnTo('/management/users?page=2', '/account')).toBe('/management/users?page=2');
  });
});
