import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticatedRequest } from '@/features/auth/client';
import { announceCartChanged } from '@/features/cart/client';
import { ApiError } from '@/shared/lib/http/api-error';
import { orderIds, orderPageFixture, ordersFixture } from '../test-fixtures';
import { checkout, getOrder, listOrders } from './orders.browser';

vi.mock('@/features/auth/client', () => ({ authenticatedRequest: vi.fn() }));
vi.mock('@/features/cart/client', () => ({ announceCartChanged: vi.fn() }));
beforeEach(() => {
  vi.mocked(authenticatedRequest).mockReset();
  vi.mocked(announceCartChanged).mockReset();
});

describe('own orders API contract', () => {
  it('sends only paymentType and preserves the entire multi-order response', async () => {
    vi.mocked(authenticatedRequest).mockResolvedValue({ orders: ordersFixture });
    expect(await checkout('CASH')).toEqual(ordersFixture);
    expect(authenticatedRequest).toHaveBeenCalledExactlyOnceWith('/me/cart/checkout', {
      method: 'POST',
      body: JSON.stringify({ paymentType: 'CASH' }),
      signal: undefined,
    });
    expect(announceCartChanged).toHaveBeenCalledOnce();
  });
  it('classifies malformed or empty checkout responses as unknown, without mutation replay', async () => {
    for (const response of [{ order: ordersFixture[0] }, { orders: [] }]) {
      vi.mocked(authenticatedRequest).mockResolvedValue(response);
      await expect(checkout('PAYOS')).rejects.toMatchObject({
        status: 502,
        code: 'INVALID_RESPONSE',
      });
    }
    expect(authenticatedRequest).toHaveBeenCalledTimes(2);
    expect(announceCartChanged).not.toHaveBeenCalled();
  });
  it('propagates server ownership denial and uses only own-order paths', async () => {
    vi.mocked(authenticatedRequest).mockRejectedValue(
      new ApiError(403, 'ORDER_ACCESS_DENIED', 'Denied'),
    );
    await expect(getOrder(orderIds[0])).rejects.toMatchObject({ code: 'ORDER_ACCESS_DENIED' });
    expect(authenticatedRequest).toHaveBeenCalledExactlyOnceWith(`/me/orders/${orderIds[0]}`, {
      signal: undefined,
    });
  });
  it('validates list responses and preserves filter/pagination and cancellation', async () => {
    vi.mocked(authenticatedRequest).mockResolvedValue(orderPageFixture(ordersFixture));
    const signal = new AbortController().signal;
    expect(await listOrders('page=2&pageSize=10&status=PENDING', signal)).toEqual(
      orderPageFixture(ordersFixture),
    );
    expect(authenticatedRequest).toHaveBeenCalledExactlyOnceWith(
      '/me/orders?page=2&pageSize=10&status=PENDING',
      { signal },
    );
  });
});

it('keeps payment in detail, accepts null, and keeps list/checkout DTOs separate', async () => {
  const order = ordersFixture[0];
  if (!order) throw new Error('Missing fixture');
  for (const payment of [
    null,
    {
      paymentId: order.id,
      orderId: order.id,
      status: 'CREATING',
      checkoutUrl: null,
      qrCode: null,
      amount: order.totalAmount,
      expiresAt: order.expiresAt,
    },
  ]) {
    vi.mocked(authenticatedRequest).mockResolvedValue({ ...order, payment });
    expect(await getOrder(order.id)).toEqual({ ...order, payment });
  }
  vi.mocked(authenticatedRequest).mockResolvedValue({ ...order, payment: {} });
  await expect(getOrder(order.id)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
});
