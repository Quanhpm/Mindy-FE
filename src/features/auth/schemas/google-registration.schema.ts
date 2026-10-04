import { z } from 'zod';

export const googleRegistrationSchema = z.object({
  displayName: z.string().trim().min(1, 'Vui lòng nhập họ tên.').max(150, 'Tối đa 150 ký tự.'),
  phone: z.union([
    z.literal(''),
    z.string().trim().min(7, 'Số điện thoại cần ít nhất 7 ký tự.').max(32),
  ]),
});
export type GoogleRegistrationInput = z.infer<typeof googleRegistrationSchema>;

export const registrationContextSchema = z.object({
  email: z.email(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  expiresAt: z.iso.datetime({ offset: true }),
});
export type RegistrationContext = z.infer<typeof registrationContextSchema>;

export function googleAvatarUrl(value: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      url.hostname.endsWith('.googleusercontent.com') &&
      !url.username &&
      !url.password
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}
