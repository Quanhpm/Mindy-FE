import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/lib/http/api-error';
import {
  checkoutInputSchema,
  checkoutResultSchema,
  orderFiltersSchema,
} from '../schemas/order.schema';
import { ordersFixture } from '../test-fixtures';
import { formatRemaining, isUnknownCheckoutResult, remainingHold } from './order-display';

describe('order status and payload boundaries', () => {
  it('supports both real payment modes and rejects price/student/mentor fields in checkout', () => {
    expect(checkoutInputSchema.parse({ paymentType: 'PAYOS' })).toEqual({ paymentType: 'PAYOS' });
    expect(checkoutInputSchema.safeParse({ paymentType: 'CASH', totalAmount: 1 }).success).toBe(
      false,
    );
    expect(checkoutInputSchema.safeParse({ paymentType: 'CARD' }).success).toBe(false);
    expect(checkoutResultSchema.safeParse({ orders: ordersFixture }).success).toBe(true);
  });
  it('normalizes URL filters to backend pagination and status values', () => {
    expect(orderFiltersSchema.parse({ page: '-1', pageSize: '101', status: 'SUCCESS' })).toEqual({
      page: 1,
      pageSize: 20,
      status: undefined,
    });
    expect(orderFiltersSchema.parse({ page: '2', pageSize: '15', status: 'EXPIRED' })).toEqual({
      page: 2,
      pageSize: 15,
      status: 'EXPIRED',
    });
  });
  it('reports countdown zero without changing the server status', () => {
    const order = { status: 'PENDING' as const, expiresAt: '2026-10-02T00:00:00Z' };
    expect(remainingHold(order, Date.parse('2026-10-02T00:00:01Z'))).toBe(0);
    expect(order.status).toBe('PENDING');
    expect(remainingHold({ ...order, status: 'EXPIRED' }, Date.now())).toBeNull();
    expect(formatRemaining(90_061)).toBe('1 ngày 01:01:01');
  });
  it('keeps network/5xx/invalid response separate from known 403/409/422 rejections', () => {
    expect(isUnknownCheckoutResult(new ApiError(502, 'API_UNAVAILABLE', 'Unknown'))).toBe(true);
    expect(isUnknownCheckoutResult(new ApiError(502, 'INVALID_RESPONSE', 'Unknown'))).toBe(true);
    for (const status of [403, 409, 422])
      expect(isUnknownCheckoutResult(new ApiError(status, 'HTTP_ERROR', 'Rejected'))).toBe(false);
  });
});
