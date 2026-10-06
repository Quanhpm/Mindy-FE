import { beforeEach, expect, it, vi } from 'vitest';
import { authenticatedRequest } from '@/features/auth/client';
import { ApiError } from '@/shared/lib/http/api-error';
import { paymentSchema } from '../schemas/payment.schema';
import { createPayosPayment, listReconciliation, reconcilePayment } from './payments.browser';

vi.mock('@/features/auth/client', () => ({ authenticatedRequest: vi.fn() }));
const id = '123e4567-e89b-42d3-a456-426614174000';
const payment = {
  paymentId: id,
  orderId: id,
  providerOrderCode: 123456,
  status: 'PENDING',
  amount: 5000,
  expiresAt: '2026-11-01T00:00:00Z',
  checkoutUrl: 'https://pay.payos.vn/web/test',
  qrCode: null,
};
beforeEach(() => {
  vi.mocked(authenticatedRequest).mockReset();
});
it('creates/reuses only an own-order link with an empty body and cancellation', async () => {
  vi.mocked(authenticatedRequest).mockResolvedValue(payment);
  const signal = new AbortController().signal;
  expect(await createPayosPayment(id, signal)).toEqual(payment);
  expect(authenticatedRequest).toHaveBeenCalledExactlyOnceWith(`/me/orders/${id}/payments/payos`, {
    method: 'POST',
    body: '{}',
    signal,
  });
});
it('accepts nullable links/QR during creation and all real statuses', () => {
  for (const status of ['CREATING', 'PENDING', 'SUCCEEDED', 'REQUIRES_REVIEW'])
    expect(paymentSchema.safeParse({ ...payment, status, checkoutUrl: null }).success).toBe(true);
  for (const checkoutUrl of [
    'https://evil.test',
    'javascript:alert(1)',
    'https://pay.payos.vn.evil.test/a',
    'https://user:pass@pay.payos.vn/a',
  ])
    expect(paymentSchema.safeParse({ ...payment, checkoutUrl }).success).toBe(false);
});
it('rejects another order payment or malformed success without replay', async () => {
  vi.mocked(authenticatedRequest).mockResolvedValue({
    ...payment,
    orderId: '123e4567-e89b-42d3-a456-426614174001',
  });
  await expect(createPayosPayment(id)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  expect(authenticatedRequest).toHaveBeenCalledOnce();
});
it('propagates provider unavailability and ownership denial without replay', async () => {
  for (const error of [
    { status: 503, code: 'PAYMENT_UNAVAILABLE' },
    { status: 403, code: 'ORDER_ACCESS_DENIED' },
  ]) {
    vi.mocked(authenticatedRequest).mockRejectedValue(
      new ApiError(error.status, error.code, 'Denied'),
    );
    const outcome = await createPayosPayment(id).then(
      () => null,
      (cause: ApiError) => ({ status: cause.status, code: cause.code }),
    );
    expect(outcome).toEqual(error);
  }
  expect(authenticatedRequest).toHaveBeenCalledTimes(2);
});
it('reads review event pages and returns provider reconciliation status verbatim', async () => {
  const page = {
    items: [
      {
        id,
        paymentId: null,
        providerOrderCode: 100,
        referenceCode: 'ref',
        amount: 5000,
        currency: 'VND',
        reason: 'LATE',
        source: 'WEBHOOK',
        actorId: null,
        createdAt: payment.expiresAt,
      },
    ],
    page: 2,
    pageSize: 20,
    total: 21,
  };
  vi.mocked(authenticatedRequest)
    .mockResolvedValueOnce(page)
    .mockResolvedValueOnce({ status: 'REQUIRES_REVIEW' });
  expect(await listReconciliation(2)).toEqual(page);
  expect(await reconcilePayment(id)).toBe('REQUIRES_REVIEW');
  expect(authenticatedRequest).toHaveBeenNthCalledWith(2, `/admin/payments/${id}/reconcile`, {
    method: 'POST',
    body: '{}',
    signal: undefined,
  });
});
