import { beforeEach, describe, expect, it, vi } from 'vitest';

const authenticatedRequest = vi.hoisted(() => vi.fn());
vi.mock('@/features/auth/client', () => ({ authenticatedRequest }));

import { ApiError } from '@/shared/lib/http/api-error';
import { addCartItem, getCart, removeCartItem } from './cart.browser';

const id = '00000000-0000-4000-8000-000000000001';
beforeEach(() => {
  authenticatedRequest.mockReset();
});
describe('cart browser boundary', () => {
  it('reads the own cart and forwards cancellation', async () => {
    const signal = new AbortController().signal;
    authenticatedRequest.mockResolvedValue({ items: [], totalAmount: 0 });
    expect(await getCart(signal)).toEqual({ items: [], totalAmount: 0 });
    expect(authenticatedRequest).toHaveBeenCalledWith('/me/cart', { signal });
  });
  it('posts only the class ID and deletes its exact path with no payload', async () => {
    authenticatedRequest.mockResolvedValue({ items: [], totalAmount: 0 });
    await addCartItem(id);
    expect(authenticatedRequest).toHaveBeenCalledWith('/me/cart/items', {
      method: 'POST',
      body: JSON.stringify({ classId: id }),
      signal: undefined,
    });
    authenticatedRequest.mockResolvedValue(undefined);
    await removeCartItem(id);
    expect(authenticatedRequest).toHaveBeenLastCalledWith(`/me/cart/items/${id}`, {
      method: 'DELETE',
      signal: undefined,
    });
  });
  it('rejects malformed upstream data and never replays a failed mutation', async () => {
    authenticatedRequest.mockResolvedValue({ items: [], totalAmount: '0' });
    await expect(getCart()).rejects.toMatchObject({ code: 'INVALID_RESPONSE', status: 502 });
    authenticatedRequest
      .mockReset()
      .mockRejectedValue(new ApiError(503, 'API_UNAVAILABLE', 'network'));
    await expect(addCartItem(id)).rejects.toMatchObject({ status: 503 });
    expect(authenticatedRequest).toHaveBeenCalledTimes(1);
  });
});
