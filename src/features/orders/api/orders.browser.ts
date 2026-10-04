import { z } from 'zod';
import { authenticatedRequest } from '@/features/auth/client';
import { announceCartChanged } from '@/features/cart/client';
import { ApiError } from '@/shared/lib/http/api-error';
import {
  checkoutInputSchema,
  checkoutResultSchema,
  type Order,
  type OrderPage,
  orderPageSchema,
  orderSchema,
  type PaymentType,
} from '../schemas/order.schema';

export async function listOrders(query: string, signal?: AbortSignal): Promise<OrderPage> {
  const result = orderPageSchema.safeParse(
    await authenticatedRequest(`/me/orders?${query}`, { signal }),
  );
  if (!result.success) throw new ApiError(502, 'INVALID_RESPONSE', 'Unexpected orders response');
  return result.data;
}

export async function getOrder(id: string, signal?: AbortSignal): Promise<Order> {
  z.uuid().parse(id);
  const result = orderSchema.safeParse(
    await authenticatedRequest(`/me/orders/${encodeURIComponent(id)}`, { signal }),
  );
  if (!result.success) throw new ApiError(502, 'INVALID_RESPONSE', 'Unexpected order response');
  return result.data;
}

export async function checkout(paymentType: PaymentType, signal?: AbortSignal): Promise<Order[]> {
  const payload = checkoutInputSchema.parse({ paymentType });
  const result = checkoutResultSchema.safeParse(
    await authenticatedRequest('/me/cart/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    }),
  );
  if (!result.success) throw new ApiError(502, 'INVALID_RESPONSE', 'Unknown checkout result');
  announceCartChanged();
  return result.data.orders;
}
