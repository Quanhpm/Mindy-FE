import { z } from 'zod';

// Hand-maintained against backend feat(api)/booking-sprint at 577af2f.
export const roles = ['ADMIN', 'MENTOR', 'STUDENT'] as const;
export const statuses = ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED'] as const;
export type UserRole = (typeof roles)[number];
export type UserStatus = (typeof statuses)[number];

export const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  phone: z.string().nullable(),
  displayName: z.string(),
  role: z.enum(roles),
  status: z.enum(statuses),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
});

export type User = z.infer<typeof userSchema>;
export const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Quản trị viên',
  MENTOR: 'Mentor',
  STUDENT: 'Học viên',
};
export const statusLabels: Record<UserStatus, string> = {
  PENDING_VERIFICATION: 'Chờ xác thực email',
  ACTIVE: 'Đang hoạt động',
  SUSPENDED: 'Tạm khóa',
};
