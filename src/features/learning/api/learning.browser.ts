import { z } from 'zod';
import { authenticatedRequest } from '@/features/auth/client';
import { ApiError } from '@/shared/lib/http/api-error';
import { studentClassSchema } from '../schemas/learning.schema';
export async function getStudentClass(id: string, signal?: AbortSignal) {
  z.uuid().parse(id);
  const result = studentClassSchema.safeParse(
    await authenticatedRequest(`/me/classes/${id}`, { signal }),
  );
  if (!result.success || result.data.id !== id)
    throw new ApiError(502, 'INVALID_RESPONSE', 'Dữ liệu lớp học chưa hợp lệ.');
  return result.data;
}
