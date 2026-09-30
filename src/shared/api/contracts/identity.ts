import { z } from 'zod';

// Hand-maintained against backend dev/b500dbf. Replace with reviewed OpenAPI types later.
export const roles = ['ADMIN', 'MANAGER', 'MENTOR', 'STUDENT'] as const;
export const statuses = ['ACTIVE', 'SUSPENDED'] as const;
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
  MANAGER: 'Quản lý',
  MENTOR: 'Mentor',
  STUDENT: 'Học viên',
};
export const statusLabels: Record<UserStatus, string> = {
  ACTIVE: 'Đang hoạt động',
  SUSPENDED: 'Tạm khóa',
};
