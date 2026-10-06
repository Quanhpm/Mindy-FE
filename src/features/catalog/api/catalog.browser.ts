import type { z } from 'zod';
import { authenticatedRequest } from '@/features/auth/client';
import { ApiError, errorMessage } from '@/shared/lib/http/api-error';
import { request } from '@/shared/lib/http/browser';
import {
  type CategoryInput,
  type CategoryPage,
  type CourseCategory,
  type CourseCreateInput,
  type CourseDetail,
  type CourseEditInput,
  type CourseManagement,
  type CoursePage,
  type CourseUnit,
  categoryInputSchema,
  categoryPageSchema,
  categorySchema,
  courseCreateSchema,
  courseDetailSchema,
  coursePageSchema,
  courseUnitSchema,
  courseUpdatePayloadSchema,
  type UnitInput,
  unitInputSchema,
} from '../schemas/catalog.schema';
import { unitOrderPayload } from '../schemas/unit-order';

function parseResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new ApiError(502, 'INVALID_RESPONSE', 'Dữ liệu danh mục chưa đúng định dạng.');
  return parsed.data;
}
function coursePath(id: string): string {
  return `/admin/courses/${encodeURIComponent(id)}`;
}
export async function listCategories(query: string, signal?: AbortSignal): Promise<CategoryPage> {
  return parseResponse(
    categoryPageSchema,
    await request(`/course-categories?${query}`, { signal }),
  );
}
export async function listAllCategories(signal?: AbortSignal): Promise<CourseCategory[]> {
  const items: CourseCategory[] = [];
  let page = 1;
  while (true) {
    const result = await listCategories(`page=${page}&pageSize=100`, signal);
    items.push(...result.items);
    if (page * result.pageSize >= result.total) return items;
    if (result.items.length === 0)
      throw new ApiError(502, 'INVALID_RESPONSE', 'Phân trang danh mục chưa hợp lệ.');
    page += 1;
  }
}
export async function createCategory(input: CategoryInput): Promise<CourseCategory> {
  const fields = categoryInputSchema.parse(input);
  return parseResponse(
    categorySchema,
    await authenticatedRequest('/admin/course-categories', {
      method: 'POST',
      body: JSON.stringify({
        name: fields.name,
        ...(fields.slug ? { slug: fields.slug } : {}),
        ...(fields.description ? { description: fields.description } : {}),
      }),
    }),
  );
}
export async function listAdminCourses(query: string, signal?: AbortSignal): Promise<CoursePage> {
  return parseResponse(
    coursePageSchema,
    await authenticatedRequest(`/admin/courses?${query}`, { signal }),
  );
}
/** Class creation needs every active management course, rather than the public browse DTO. */
export async function listActiveAdminCourses(signal?: AbortSignal): Promise<CourseManagement[]> {
  const courses: CourseManagement[] = [];
  let page = 1;
  while (true) {
    const result = await listAdminCourses(`page=${page}&pageSize=100&isActive=true`, signal);
    courses.push(...result.items);
    if (page * result.pageSize >= result.total) return courses;
    if (result.items.length === 0)
      throw new ApiError(502, 'INVALID_RESPONSE', 'Phân trang khóa học chưa hợp lệ.');
    page += 1;
  }
}
export async function getAdminCourse(id: string, signal?: AbortSignal): Promise<CourseDetail> {
  return parseResponse(courseDetailSchema, await authenticatedRequest(coursePath(id), { signal }));
}
export async function createCourse(input: CourseCreateInput): Promise<CourseDetail> {
  const { description, imgUrl, ...fields } = courseCreateSchema.parse(input);
  return parseResponse(
    courseDetailSchema,
    await authenticatedRequest('/admin/courses', {
      method: 'POST',
      body: JSON.stringify({
        ...fields,
        ...(imgUrl ? { imgUrl } : {}),
        ...(description ? { description } : {}),
      }),
    }),
  );
}
export async function updateCourse(id: string, input: CourseEditInput): Promise<CourseDetail> {
  const payload = courseUpdatePayloadSchema.parse({
    ...input,
    description: input.description || null,
    ...(input.imgUrl === '' ? { imgUrl: null } : {}),
  });
  return parseResponse(
    courseDetailSchema,
    await authenticatedRequest(coursePath(id), { method: 'PATCH', body: JSON.stringify(payload) }),
  );
}
export async function addCourseUnit(id: string, input: UnitInput): Promise<CourseUnit> {
  const { description, ...fields } = unitInputSchema.parse(input);
  return parseResponse(
    courseUnitSchema,
    await authenticatedRequest(`${coursePath(id)}/units`, {
      method: 'POST',
      body: JSON.stringify({
        ...fields,
        ...(description ? { description } : {}),
      }),
    }),
  );
}
export async function reorderCourseUnits(
  id: string,
  current: readonly string[],
  next: readonly string[],
): Promise<CourseDetail> {
  return parseResponse(
    courseDetailSchema,
    await authenticatedRequest(`${coursePath(id)}/units/order`, {
      method: 'PUT',
      body: JSON.stringify(unitOrderPayload(current, next)),
    }),
  );
}
export async function activateCourse(id: string): Promise<CourseDetail> {
  return parseResponse(
    courseDetailSchema,
    await authenticatedRequest(`${coursePath(id)}/activate`, { method: 'POST' }),
  );
}
const messages: Record<string, string> = {
  COURSE_CATEGORY_NOT_FOUND: 'Không tìm thấy danh mục.',
  COURSE_CATEGORY_SLUG_ALREADY_EXISTS: 'Slug này đã được sử dụng. Vui lòng chọn slug khác.',
  COURSE_CATEGORY_SLUG_REQUIRED: 'Tên này cần một slug viết bằng chữ thường hoặc số.',
  COURSE_CATEGORY_INACTIVE: 'Danh mục đã ngừng hoạt động. Vui lòng tải lại danh sách.',
  COURSE_NOT_FOUND: 'Không tìm thấy khóa học.',
  CLASS_NOT_FOUND: 'Lớp học không còn khả dụng hoặc chưa mở đăng ký.',
  COURSE_CODE_ALREADY_EXISTS: 'Mã khóa học đã được sử dụng.',
  COURSE_HAS_NO_UNITS: 'Cần thêm ít nhất một học phần trước khi kích hoạt.',
  COURSE_UNIT_ORDER_MISMATCH: 'Danh sách học phần đã thay đổi. Kiểm tra thứ tự mới và thử lại.',
};
export function catalogErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? (messages[error.code] ?? errorMessage(error))
    : errorMessage(error);
}
