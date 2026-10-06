import { z } from 'zod';
import { authenticatedRequest } from '@/features/auth/client';
import { announceCartChanged } from '@/features/cart/client';
import { ApiError } from '@/shared/lib/http/api-error';
import {
  checkoutInputSchema,
  checkoutResultSchema,
  type Order,
  type OrderDetail,
  type OrderPage,
  orderDetailSchema,
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

export async function getOrder(id: string, signal?: AbortSignal): Promise<OrderDetail> {
  z.uuid().parse(id);
  const result = orderDetailSchema.safeParse(
    await authenticatedRequest(`/me/orders/${encodeURIComponent(id)}`, { signal }),
  );
  if (!result.success || result.data.id !== id)
    throw new ApiError(502, 'INVALID_RESPONSE', 'Unexpected order response');
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

export const providerOrderCodeSchema = z
  .string()
  .regex(/^[1-9][0-9]{0,15}$/)
  .refine((value) => Number.isSafeInteger(Number(value)), 'Mã thanh toán không hợp lệ.');
export async function resolvePaymentResult(
  code: string,
  signal?: AbortSignal,
): Promise<OrderDetail> {
  const orderCode = providerOrderCodeSchema.parse(code);
  const result = orderDetailSchema.safeParse(
    await authenticatedRequest(`/me/orders/payment-result?${new URLSearchParams({ orderCode })}`, {
      signal,
    }),
  );
  if (
    !result.success ||
    result.data.paymentType !== 'PAYOS' ||
    result.data.payment?.providerOrderCode !== Number(orderCode)
  )
    throw new ApiError(502, 'INVALID_RESPONSE', 'Không thể xác định đơn của thanh toán này.');
  return result.data;
}
export async function listMentorCashOrders(page: number, signal?: AbortSignal): Promise<OrderPage> {
  z.number().int().min(1).max(1_000_000).parse(page);
  const result = orderPageSchema.safeParse(
    await authenticatedRequest(`/mentor/cash-orders?page=${page}&pageSize=20`, { signal }),
  );
  if (!result.success || result.data.items.some((order) => order.paymentType !== 'CASH'))
    throw new ApiError(502, 'INVALID_RESPONSE', 'Dữ liệu đơn tiền mặt chưa hợp lệ.');
  return result.data;
}
export async function confirmCashOrder(
  id: string,
  receivedAmount: number,
  signal?: AbortSignal,
): Promise<Order> {
  z.uuid().parse(id);
  z.number().int().positive().max(Number.MAX_SAFE_INTEGER).parse(receivedAmount);
  const result = orderSchema.safeParse(
    await authenticatedRequest(`/mentor/cash-orders/${id}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ receivedAmount }),
      signal,
    }),
  );
  if (
    !result.success ||
    result.data.id !== id ||
    result.data.paymentType !== 'CASH' ||
    result.data.status !== 'PAID' ||
    result.data.totalAmount !== receivedAmount
  )
    throw new ApiError(
      502,
      'INVALID_RESPONSE',
      'Chưa xác định kết quả thu tiền. Hãy đọc lại danh sách đơn.',
    );
  return result.data;
}
