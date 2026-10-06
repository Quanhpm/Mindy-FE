import { z } from 'zod';
import { authenticatedRequest } from '@/features/auth/client';
import { ApiError, errorMessage } from '@/shared/lib/http/api-error';
import {
  type Payment,
  paymentSchema,
  reconciliationPageSchema,
  reconciliationResultSchema,
} from '../schemas/payment.schema';

export async function createPayosPayment(orderId: string, signal?: AbortSignal): Promise<Payment> {
  z.uuid().parse(orderId);
  const result = paymentSchema.safeParse(
    await authenticatedRequest(`/me/orders/${orderId}/payments/payos`, {
      method: 'POST',
      body: '{}',
      signal,
    }),
  );
  if (!result.success || result.data.orderId !== orderId)
    throw new ApiError(502, 'INVALID_RESPONSE', 'Không thể xác định kết quả tạo link.');
  return result.data;
}
export async function listReconciliation(page: number, signal?: AbortSignal) {
  z.number().int().min(1).max(1_000_000).parse(page);
  const result = reconciliationPageSchema.safeParse(
    await authenticatedRequest(`/admin/payments/reconciliation?page=${page}&pageSize=20`, {
      signal,
    }),
  );
  if (!result.success) throw new ApiError(502, 'INVALID_RESPONSE', 'Dữ liệu đối soát chưa hợp lệ.');
  return result.data;
}
export async function reconcilePayment(paymentId: string, signal?: AbortSignal) {
  z.uuid().parse(paymentId);
  const result = reconciliationResultSchema.safeParse(
    await authenticatedRequest(`/admin/payments/${paymentId}/reconcile`, {
      method: 'POST',
      body: '{}',
      signal,
    }),
  );
  if (!result.success)
    throw new ApiError(502, 'INVALID_RESPONSE', 'Chưa xác định kết quả đối soát.');
  return result.data.status;
}
export function paymentErrorMessage(error: unknown): string {
  const messages: Record<string, string> = {
    PAYMENT_UNAVAILABLE: 'PayOS tạm thời chưa khả dụng. Hãy kiểm tra trạng thái trước khi thử lại.',
    PAYMENT_ORDER_INVALID: 'Đơn không còn đủ điều kiện thanh toán PayOS.',
    PAYMENT_AMOUNT_INVALID: 'Số tiền của đơn không phù hợp để thanh toán PayOS.',
  };
  return error instanceof ApiError
    ? (messages[error.code] ?? errorMessage(error))
    : errorMessage(error);
}
