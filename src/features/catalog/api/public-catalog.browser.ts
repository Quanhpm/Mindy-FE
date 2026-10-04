import type { z } from 'zod';
import { ApiError } from '@/shared/lib/http/api-error';
import { request } from '@/shared/lib/http/browser';
import {
  type PublicClassDetail,
  type PublicClassPage,
  type PublicCourseDetail,
  type PublicCoursePage,
  publicClassDetailSchema,
  publicClassPageSchema,
  publicCourseDetailSchema,
  publicCoursePageSchema,
} from '../schemas/public-catalog.schema';

function parseResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new ApiError(502, 'INVALID_RESPONSE', 'Dữ liệu khóa học chưa đúng định dạng.');
  return parsed.data;
}
export async function listPublicCourses(
  query: string,
  signal?: AbortSignal,
): Promise<PublicCoursePage> {
  return parseResponse(publicCoursePageSchema, await request(`/courses?${query}`, { signal }));
}
export async function getPublicCourse(
  id: string,
  signal?: AbortSignal,
): Promise<PublicCourseDetail> {
  return parseResponse(
    publicCourseDetailSchema,
    await request(`/courses/${encodeURIComponent(id)}`, { signal }),
  );
}
export async function listPublicCourseClasses(
  id: string,
  query: string,
  signal?: AbortSignal,
): Promise<PublicClassPage> {
  return parseResponse(
    publicClassPageSchema,
    await request(`/courses/${encodeURIComponent(id)}/classes?${query}`, { signal }),
  );
}
export async function getPublicClass(id: string, signal?: AbortSignal): Promise<PublicClassDetail> {
  return parseResponse(
    publicClassDetailSchema,
    await request(`/classes/${encodeURIComponent(id)}`, { signal }),
  );
}
