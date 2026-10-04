import { z } from 'zod';
import { roles, statuses, userSchema } from '@/shared/api/contracts/identity';

export const createUserSchema = z.object({
  displayName: z.string().trim().min(1, 'Vui lòng nhập họ tên.').max(150, 'Tối đa 150 ký tự.'),
  email: z.string().trim().email('Email chưa hợp lệ.').max(320),
  phone: z.union([
    z.literal(''),
    z.string().trim().min(7, 'Số điện thoại cần ít nhất 7 ký tự.').max(32),
  ]),
  password: z.string().min(12, 'Mật khẩu cần ít nhất 12 ký tự.').max(128, 'Tối đa 128 ký tự.'),
  role: z.enum(roles),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;
export const userPageSchema = z.object({
  items: z.array(userSchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
});
export type UserPage = z.infer<typeof userPageSchema>;
export const userFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
  role: z.enum(roles).optional().catch(undefined),
  status: z.enum(statuses).optional().catch(undefined),
});
