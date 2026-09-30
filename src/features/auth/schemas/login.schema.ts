import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Email chưa hợp lệ.').max(320),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;
