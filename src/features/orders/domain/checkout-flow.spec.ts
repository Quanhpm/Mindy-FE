import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/lib/http/api-error';
import { cartFixture, orderPageFixture, ordersFixture } from '../test-fixtures';
import { CheckoutFlow, type CheckoutState } from './checkout-flow';

function setup() {
  const api = {
    getCart: vi.fn().mockResolvedValue(cartFixture),
    recentOrders: vi.fn().mockResolvedValue(orderPageFixture([])),
    checkout: vi.fn().mockResolvedValue(ordersFixture),
  };
  const states: CheckoutState[] = [];
  const flow = new CheckoutFlow(api, (state) => states.push(state));
  return { api, flow, states, last: () => states.at(-1) };
}

describe('checkout result and recovery flow', () => {
  it('blocks simultaneous submissions and exposes every CASH order from the server', async () => {
    const { api, flow, last } = setup();
    let finish: (value: unknown) => void = () => undefined;
    api.checkout.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await flow.load();
    const first = flow.submit('CASH');
    await flow.submit('CASH');
    expect(api.checkout).toHaveBeenCalledOnce();
    expect(last()?.phase).toBe('submitting');
    api.getCart.mockResolvedValue({ items: [], totalAmount: 0 });
    finish(ordersFixture);
    await first;
    expect(last()?.phase).toBe('success');
    expect(last()?.orders).toEqual(ordersFixture);
    expect(last()?.cart).toEqual({ items: [], totalAmount: 0 });
  });
  it('reads both orders and cart after an unknown result and recovers all related receipts without another POST', async () => {
    const { api, flow, last } = setup();
    await flow.load();
    api.checkout.mockRejectedValue(new ApiError(503, 'API_UNAVAILABLE', 'Timeout'));
    api.getCart.mockResolvedValue({ items: [], totalAmount: 0 });
    api.recentOrders.mockResolvedValue(orderPageFixture(ordersFixture));
    await flow.submit('CASH');
    expect(last()?.phase).toBe('recovered');
    expect(last()?.orders).toEqual(ordersFixture);
    expect(api.getCart).toHaveBeenCalledTimes(2);
    expect(api.recentOrders).toHaveBeenCalledTimes(2);
    expect(api.checkout).toHaveBeenCalledOnce();
    await flow.submit('CASH');
    expect(api.checkout).toHaveBeenCalledOnce();
  });
  it('unlocks only deliberate retry after successful reads confirm unchanged cart and no new related orders', async () => {
    const { api, flow, last } = setup();
    await flow.load();
    api.checkout.mockRejectedValueOnce(new ApiError(502, 'INVALID_RESPONSE', 'Unknown response'));
    await flow.submit('PAYOS');
    expect(last()?.phase).toBe('retryable');
    expect(api.checkout).toHaveBeenCalledOnce();
    await flow.submit('PAYOS');
    expect(api.checkout).toHaveBeenCalledTimes(2);
    expect(last()?.phase).toBe('success');
  });
  it('keeps creation locked when either reconciliation read fails, including after a generic reload attempt', async () => {
    const { api, flow, last } = setup();
    await flow.load();
    api.checkout.mockRejectedValue(new ApiError(502, 'API_UNAVAILABLE', 'Timeout'));
    api.recentOrders.mockRejectedValue(new Error('Read failed'));
    await flow.submit('CASH');
    expect(last()?.phase).toBe('unknown');
    await flow.load();
    await flow.submit('CASH');
    expect(api.checkout).toHaveBeenCalledOnce();
    expect(api.getCart).toHaveBeenCalledTimes(2);
    expect(last()?.phase).toBe('unknown');
  });
  it('does not infer success from an empty cart or hide a partial set of newly observed orders', async () => {
    const { api, flow, last } = setup();
    await flow.load();
    api.checkout.mockRejectedValue(new ApiError(503, 'API_UNAVAILABLE', 'Timeout'));
    api.getCart.mockResolvedValue({ items: [], totalAmount: 0 });
    api.recentOrders.mockResolvedValue(orderPageFixture([]));
    await flow.submit('CASH');
    expect(last()?.phase).toBe('unknown');
    expect(last()?.orders).toEqual([]);
    api.recentOrders.mockResolvedValue(orderPageFixture(ordersFixture.slice(0, 1)));
    await flow.reconcile();
    expect(last()?.phase).toBe('unknown');
    api.recentOrders.mockResolvedValue(orderPageFixture(ordersFixture));
    await flow.reconcile();
    expect(last()?.phase).toBe('recovered');
    expect(last()?.orders).toHaveLength(2);
  });
  it('aborts old-user requests and never publishes their late checkout response', async () => {
    const { api, flow, states } = setup();
    let finish: (value: unknown) => void = () => undefined;
    api.checkout.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await flow.load();
    const request = flow.submit('CASH');
    const signal = api.checkout.mock.calls[0]?.[1] as AbortSignal;
    const before = states.length;
    flow.dispose();
    expect(signal.aborted).toBe(true);
    finish(ordersFixture);
    await request;
    expect(states).toHaveLength(before);
  });
  it('refetches a real CLASS_FULL conflict without interpreting isPurchasable as seat availability or automatically resubmitting', async () => {
    const { api, flow, last } = setup();
    await flow.load();
    api.checkout.mockRejectedValue(new ApiError(409, 'CLASS_FULL', 'Full'));
    await flow.submit('CASH');
    expect(last()?.phase).toBe('ready');
    expect(last()?.message).toContain('hết chỗ');
    expect(last()?.cart?.items.every((item) => item.isPurchasable)).toBe(true);
    expect(api.getCart).toHaveBeenCalledTimes(2);
    expect(api.checkout).toHaveBeenCalledOnce();
  });
  it('refreshes a closed-class conflict and keeps unavailable classes from resubmitting', async () => {
    const { api, flow, last } = setup();
    await flow.load();
    api.checkout.mockRejectedValue(new ApiError(409, 'CLASS_NOT_OPEN', 'Closed'));
    api.getCart.mockResolvedValue({
      ...cartFixture,
      items: cartFixture.items.map((item) => ({ ...item, isPurchasable: false })),
    });
    await flow.submit('CASH');
    expect(last()?.phase).toBe('ready');
    expect(last()?.message).toContain('không mở đăng ký');
    await flow.submit('CASH');
    expect(api.checkout).toHaveBeenCalledOnce();
  });
});
