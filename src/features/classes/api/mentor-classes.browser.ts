import { z } from 'zod';
import { authenticatedRequest } from '@/features/auth/client';
import { ApiError } from '@/shared/lib/http/api-error';
import {
  mentorClassFiltersSchema,
  mentorClassPageSchema,
  mentorRosterFiltersSchema,
  mentorRosterPageSchema,
} from '../schemas/mentor-class.schema';

function validated<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new ApiError(502, 'INVALID_RESPONSE', 'Dữ liệu lớp giảng dạy chưa hợp lệ.');
  return result.data;
}
function queryString(filters: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams({ pageSize: '20' });
  for (const [key, value] of Object.entries(filters))
    if (value !== undefined) query.set(key, String(value));
  return query.toString();
}
export async function listMentorClasses(query: string, mentorId: string, signal?: AbortSignal) {
  const filters = mentorClassFiltersSchema.parse(Object.fromEntries(new URLSearchParams(query)));
  const result = validated(
    mentorClassPageSchema,
    await authenticatedRequest(`/mentor/classes?${queryString(filters)}`, { signal }),
  );
  if (result.items.some((item) => item.mentor.id !== mentorId))
    throw new ApiError(502, 'INVALID_RESPONSE', 'Danh sách lớp không thuộc giảng viên hiện tại.');
  return result;
}
export async function listMentorStudents(classId: string, query: string, signal?: AbortSignal) {
  z.uuid().parse(classId);
  const filters = mentorRosterFiltersSchema.parse(Object.fromEntries(new URLSearchParams(query)));
  return validated(
    mentorRosterPageSchema,
    await authenticatedRequest(`/mentor/classes/${classId}/students?${queryString(filters)}`, {
      signal,
    }),
  );
}

export async function listManagerClasses(query: string, signal?: AbortSignal) {
  const filters = mentorClassFiltersSchema.parse(Object.fromEntries(new URLSearchParams(query)));
  return validated(
    mentorClassPageSchema,
    await authenticatedRequest(`/mentor/classes?${queryString(filters)}`, { signal }),
  );
}
