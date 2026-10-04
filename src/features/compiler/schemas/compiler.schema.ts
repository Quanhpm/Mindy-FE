import { z } from 'zod';

export const MAX_CODE_BYTES = 65_536;
export const MAX_STDIN_BYTES = 32_768;
const bytes = (value: string) => new TextEncoder().encode(value).length;
export const runInputSchema = z.object({
  code: z.string().refine((value) => bytes(value) <= MAX_CODE_BYTES, 'Code vượt quá 64 KiB.'),
  stdin: z
    .string()
    .refine((value) => bytes(value) <= MAX_STDIN_BYTES, 'stdin vượt quá 32 KiB.')
    .default(''),
});
export const runResultSchema = z.object({
  ok: z.boolean(),
  status: z.enum([
    'success',
    'user_error',
    'timeout',
    'output_limit',
    'infrastructure_error',
    'busy',
    'rejected',
  ]),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  exitCode: z.number().nullable().optional(),
  durationMs: z.number().nonnegative().optional(),
  truncated: z.boolean().optional(),
  error: z.string().optional(),
  errors: z.array(z.string()).optional(),
});
export type RunInput = z.input<typeof runInputSchema>;
export type RunResult = z.infer<typeof runResultSchema>;
