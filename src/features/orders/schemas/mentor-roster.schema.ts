import { z } from 'zod';
import { orderStatuses, paymentTypes } from './order.schema';

export const mentorClassStatuses = [
  'DRAFT',
  'OPEN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;
export type MentorClassStatus = (typeof mentorClassStatuses)[number];

const pageFields = {
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().nonnegative(),
};
const amount = z.number().int().nonnegative();
const timestamp = z.iso.datetime({ offset: true });

export const mentorClassSchema = z.object({
  id: z.uuid(),
  courseId: z.uuid(),
  code: z.string().min(1),
  name: z.string().min(1),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  deliveryMode: z.enum(['ONLINE', 'OFFLINE']),
  maxStudents: z.number().int().positive(),
  availableSeats: z.number().int().nonnegative(),
  mentor: z.object({ id: z.uuid(), displayName: z.string().nullable() }),
  status: z.enum(mentorClassStatuses),
});
export type MentorClass = z.infer<typeof mentorClassSchema>;

export const mentorClassPageSchema = z.object({
  items: z.array(mentorClassSchema),
  ...pageFields,
});
export type MentorClassPage = z.infer<typeof mentorClassPageSchema>;

export const enrollmentStatuses = ['PENDING_PAYMENT', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const;
export type EnrollmentStatus = (typeof enrollmentStatuses)[number];

export const mentorRosterStudentSchema = z
  .object({
    enrollmentId: z.uuid(),
    enrollmentStatus: z.enum(enrollmentStatuses),
    studentId: z.uuid(),
    studentName: z.string().min(1),
    orderId: z.uuid(),
    orderCode: z.string().min(1),
    orderStatus: z.enum(orderStatuses),
    paymentType: z.enum(paymentTypes),
    classAmount: amount,
    orderTotalAmount: amount,
    orderClassCount: z.number().int().positive(),
    expiresAt: timestamp,
    paidAt: timestamp.nullable(),
    canConfirmCash: z.boolean(),
  })
  .superRefine((student, ctx) => {
    if (
      student.canConfirmCash &&
      (student.paymentType !== 'CASH' ||
        student.orderStatus !== 'PENDING' ||
        student.orderTotalAmount < 1)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Cash confirmation hint does not match the order state',
        path: ['canConfirmCash'],
      });
  });
export type MentorRosterStudent = z.infer<typeof mentorRosterStudentSchema>;

export const mentorRosterPageSchema = z.object({
  items: z.array(mentorRosterStudentSchema),
  ...pageFields,
});
export type MentorRosterPage = z.infer<typeof mentorRosterPageSchema>;

export const mentorCashFiltersSchema = z.object({
  classId: z.uuid().optional().catch(undefined),
  classPage: z.coerce.number().int().min(1).max(1_000_000).catch(1),
  studentPage: z.coerce.number().int().min(1).max(1_000_000).catch(1),
  orderStatus: z.enum(orderStatuses).optional().catch(undefined),
});

export const mentorClassStatusLabels: Record<MentorClassStatus, string> = {
  DRAFT: 'Bản nháp',
  OPEN: 'Đang mở',
  IN_PROGRESS: 'Đang học',
  COMPLETED: 'Đã hoàn thành',
  CANCELLED: 'Đã hủy',
};

export const enrollmentStatusLabels: Record<EnrollmentStatus, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  ACTIVE: 'Đang học',
  COMPLETED: 'Đã hoàn thành',
  CANCELLED: 'Đã hủy',
};
