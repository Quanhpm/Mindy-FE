import { z } from 'zod';

export const paymentStatuses = ['CREATING', 'PENDING', 'SUCCEEDED', 'REQUIRES_REVIEW'] as const;
export const paymentSchema = z.object({
  paymentId: z.uuid(),
  orderId: z.uuid(),
  providerOrderCode: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).nullable(),
  status: z.enum(paymentStatuses),
  checkoutUrl: z
    .url()
    .refine((value) => {
      if (!URL.canParse(value)) return false;
      const url = new URL(value);
      return (
        url.protocol === 'https:' &&
        url.hostname === 'pay.payos.vn' &&
        !url.username &&
        !url.password &&
        !url.port
      );
    }, 'Link PayOS chưa hợp lệ.')
    .nullable(),
  qrCode: z.string().nullable(),
  expiresAt: z.iso.datetime({ offset: true }),
  amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});
export type Payment = z.infer<typeof paymentSchema>;
export const paymentStatusLabels: Record<Payment['status'], string> = {
  CREATING: 'Đang tạo link thanh toán',
  PENDING: 'Chờ thanh toán PayOS',
  SUCCEEDED: 'Thanh toán thành công',
  REQUIRES_REVIEW: 'Cần đối soát',
};
export const reconciliationPageSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      paymentId: z.uuid().nullable(),
      providerOrderCode: z.number().int(),
      referenceCode: z.string(),
      amount: z.number(),
      currency: z.string(),
      reason: z.string().nullable(),
      source: z.string(),
      actorId: z.uuid().nullable(),
      createdAt: z.iso.datetime({ offset: true }),
    }),
  ),
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().nonnegative(),
});
export type ReconciliationPage = z.infer<typeof reconciliationPageSchema>;
export const reconciliationResultSchema = z.object({ status: z.string().min(1) });
