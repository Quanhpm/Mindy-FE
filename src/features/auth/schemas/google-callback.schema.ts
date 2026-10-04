import { z } from 'zod';

export const googleCallbackInputSchema = z
  .object({
    code: z.string().min(1).max(4096).optional(),
    state: z.string().min(1).max(512).optional(),
    error: z.string().min(1).max(200).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.error || (value.code && value.state)));

export const googleCallbackResultSchema = z.object({ redirectTo: z.string().max(2048) }).strict();
export type GoogleCallbackInput = z.infer<typeof googleCallbackInputSchema>;
