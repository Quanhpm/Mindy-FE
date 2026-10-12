import { describe, expect, it } from 'vitest';
import {
  canManageUsers,
  canPurchaseClasses,
  destinationAfterLogin,
  homeForRole,
  safeReturnTo,
} from './access-policy';

describe('navigation policy', () => {
  it('opens the correct workspace for each role', () => {
    expect(homeForRole('ADMIN')).toBe('/management/users');
    expect(homeForRole('MANAGER')).toBe('/manager/classes');
    expect(homeForRole('MENTOR')).toBe('/mentor/classes');
    expect(homeForRole('STUDENT')).toBe('/account');
  });
  it('keeps staff return paths inside their own workspace and preserves student links', () => {
    expect(destinationAfterLogin('ADMIN', '/courses')).toBe('/management/users');
    expect(destinationAfterLogin('MANAGER', '/account')).toBe('/manager/classes');
    expect(destinationAfterLogin('MENTOR', '/manager/classes')).toBe('/mentor/classes');
    expect(destinationAfterLogin('MENTOR', '/mentor/cash-orders?page=2')).toBe(
      '/mentor/cash-orders?page=2',
    );
    expect(destinationAfterLogin('STUDENT', '/orders?page=2')).toBe('/orders?page=2');
  });
  it('allows only ADMIN to access management', () => {
    expect(canManageUsers('ADMIN')).toBe(true);
    expect(canManageUsers('MENTOR')).toBe(false);
    expect(canManageUsers('MANAGER')).toBe(false);
    expect(canManageUsers('STUDENT')).toBe(false);
  });
  it('allows purchases only for STUDENT and preserves supported browse/order return paths', () => {
    expect(canPurchaseClasses('STUDENT')).toBe(true);
    expect(canPurchaseClasses('ADMIN')).toBe(false);
    expect(canPurchaseClasses('MENTOR')).toBe(false);
    expect(canPurchaseClasses('MANAGER')).toBe(false);
    const id = '123e4567-e89b-42d3-a456-426614174000';
    for (const path of [
      '/courses?deliveryMode=ONLINE&page=2',
      `/courses/${id}/units/${id}`,
      `/classes/${id}`,
      '/cart',
      '/checkout',
      '/orders?status=PENDING',
      `/orders/${id}`,
      '/payment/result?orderCode=123456&cancel=true',
      '/mentor/cash-orders?page=2',
      '/manager/classes?status=OPEN&page=2',
      `/manager/classes/${id}/students?paymentType=CASH`,
      '/manager/materials',
      `/mentor/cash-orders?classId=${id}&studentPage=2&orderStatus=PENDING`,
      `/learning/classes/${id}?unitId=${id}`,
      `/learning/classes/${id}/preview`,
      `/learning/classes/${id}/preview?unitId=${id}#timetable`,
      '/management/payments/reconciliation?page=2',
    ])
      expect(safeReturnTo(path, '/account')).toBe(path);
    for (const path of [
      '/api/v1/me/cart',
      '/cart/extra',
      '/orders/not-a-uuid',
      '/mentor/cash-orders/any/confirm',
      '/payment/result/extra',
      `/learning/classes/${id}/preview/extra`,
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
    for (const path of [
      'https://evil.example/payment/result?orderCode=123456',
      '//evil.example/mentor/cash-orders',
      '/%2f%2fevil.example',
      '/payment/result?orderCode=123456%0d%0aLocation:https://evil.example',
      '/learning/classes/not-a-uuid',
      '/management/payments/reconciliation/extra',
    ])
      expect(safeReturnTo(path, '/account')).toBe('/account');
  });
});
