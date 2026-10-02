import { z } from 'zod';

export const registerSchema = z.object({
  email: z.email('Email chưa hợp lệ.').max(320),
  password: z.string().min(6, 'Mật khẩu cần ít nhất 6 ký tự.').max(128),
  displayName: z.string().trim().min(1, 'Vui lòng nhập họ tên.').max(150),
  phone: z
    .union([z.literal(''), z.string().min(7, 'Số điện thoại cần ít nhất 7 ký tự.').max(32)])
    .optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;
