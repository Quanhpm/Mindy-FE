import { z } from 'zod';
import { classStatusSchema, publicClassSchema } from './class.schema';

const pagination = {
  page: z.number().int().positive(),
  pageSize: z.number().int().positive().max(100),
  total: z.number().int().nonnegative(),
};
export const mentorClassPageSchema = z.object({
  ...pagination,
  items: z.array(publicClassSchema.extend({ status: classStatusSchema })),
});
export const rosterOrderStatusSchema = z.enum(['PENDING', 'PAID', 'EXPIRED', 'CANCELLED']);
export const rosterPaymentTypeSchema = z.enum(['CASH', 'PAYOS']);
export const mentorRosterPageSchema = z.object({
  ...pagination,
  items: z.array(
    z.object({
      enrollmentId: z.uuid(),
      enrollmentStatus: z.enum(['PENDING_PAYMENT', 'ACTIVE', 'COMPLETED', 'CANCELLED']),
      studentId: z.uuid(),
      studentName: z.string(),
      orderId: z.uuid(),
      orderCode: z.string(),
      orderStatus: rosterOrderStatusSchema,
      paymentType: rosterPaymentTypeSchema,
      classAmount: z.number().int().nonnegative(),
      orderTotalAmount: z.number().int().nonnegative(),
      orderClassCount: z.number().int().positive(),
      expiresAt: z.iso.datetime({ offset: true }),
      paidAt: z.iso.datetime({ offset: true }).nullable(),
      canConfirmCash: z.boolean(),
    }),
  ),
});
export const mentorClassFiltersSchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  status: classStatusSchema.optional().catch(undefined),
});
export const mentorRosterFiltersSchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  paymentType: rosterPaymentTypeSchema.optional().catch(undefined),
  orderStatus: rosterOrderStatusSchema.optional().catch(undefined),
});
export type MentorClassPage = z.infer<typeof mentorClassPageSchema>;
export type MentorRosterPage = z.infer<typeof mentorRosterPageSchema>;
