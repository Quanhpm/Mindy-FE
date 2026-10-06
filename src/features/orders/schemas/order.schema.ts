import { z } from 'zod';
import { paymentSchema } from '@/features/payments/client';

export const paymentTypes = ['CASH', 'PAYOS'] as const;
export const orderStatuses = ['PENDING', 'PAID', 'EXPIRED', 'CANCELLED'] as const;
export type PaymentType = (typeof paymentTypes)[number];
export type OrderStatus = (typeof orderStatuses)[number];
const amount = z.number().int().nonnegative();
const timestamp = z.iso.datetime({ offset: true });

export const orderSchema = z.object({
  id: z.uuid(),
  orderCode: z.string().min(1),
  paymentType: z.enum(paymentTypes),
  status: z.enum(orderStatuses),
  totalAmount: amount,
  expiresAt: timestamp,
  paidAt: timestamp.nullable(),
  mentorId: z.uuid().nullable(),
  createdAt: timestamp,
  details: z
    .array(
      z.object({
        id: z.uuid(),
        classId: z.uuid(),
        courseTitle: z.string(),
        className: z.string(),
        priceAmount: amount,
        quantity: z.literal(1),
        totalAmount: amount,
      }),
    )
    .min(1),
});
export type Order = z.infer<typeof orderSchema>;
export const orderDetailSchema = orderSchema
  .extend({ payment: paymentSchema.nullable() })
  .superRefine((order, ctx) => {
    if (order.payment && order.payment.orderId !== order.id)
      ctx.addIssue({
        code: 'custom',
        message: 'Payment does not belong to order',
        path: ['payment'],
      });
  });
export type OrderDetail = z.infer<typeof orderDetailSchema>;
export const checkoutInputSchema = z.object({ paymentType: z.enum(paymentTypes) }).strict();
export const checkoutResultSchema = z.object({ orders: z.array(orderSchema).min(1).max(20) });
export const orderPageSchema = z.object({
  items: z.array(orderSchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().nonnegative(),
});
export type OrderPage = z.infer<typeof orderPageSchema>;
export const orderFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
  status: z.enum(orderStatuses).optional().catch(undefined),
});
export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  EXPIRED: 'Đã hết hạn',
  CANCELLED: 'Đã hủy',
};
export const paymentLabels: Record<PaymentType, string> = { CASH: 'Tiền mặt', PAYOS: 'PayOS' };
