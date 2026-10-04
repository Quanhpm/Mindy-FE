import { z } from 'zod';
import { courseUnitSchema } from './catalog.schema';

const uuid = z.uuid();
const dateOnly = z.iso.date({ error: 'Ngày cần hợp lệ theo định dạng YYYY-MM-DD.' });
const instant = z.iso.datetime({ offset: true });
const pageFields = {
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
};
// Public responses deliberately strip management-only fields rather than exposing them to UI.
export const publicCourseSchema = z.object({
  id: uuid,
  code: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  priceAmount: z.number().int().min(0).max(1_000_000_000_000),
  category: z.object({ id: uuid, name: z.string(), slug: z.string() }),
});
export type PublicCourse = z.infer<typeof publicCourseSchema>;
export const publicCoursePageSchema = z.object({
  items: z.array(publicCourseSchema),
  ...pageFields,
});
export type PublicCoursePage = z.infer<typeof publicCoursePageSchema>;
export const publicClassSchema = z.object({
  id: uuid,
  courseId: uuid,
  code: z.string(),
  name: z.string(),
  startDate: dateOnly,
  endDate: dateOnly,
  deliveryMode: z.enum(['ONLINE', 'OFFLINE']),
  maxStudents: z.number().int().min(1),
  availableSeats: z.number().int().min(0),
  mentor: z.object({ id: uuid, displayName: z.string().nullable() }),
});
export type PublicClass = z.infer<typeof publicClassSchema>;
const publicSessionSchema = z.object({
  id: uuid,
  sessionNumber: z.number().int().min(1),
  title: z.string(),
  startsAt: instant,
  endsAt: instant,
  roomName: z.string().nullable(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']),
});
export const publicClassDetailSchema = publicClassSchema.extend({
  units: z.array(
    z.object({
      id: uuid,
      position: z.number().int().min(1),
      title: z.string(),
      sessions: z.array(publicSessionSchema),
    }),
  ),
});
export type PublicClassDetail = z.infer<typeof publicClassDetailSchema>;
export const publicClassPageSchema = z.object({ items: z.array(publicClassSchema), ...pageFields });
export type PublicClassPage = z.infer<typeof publicClassPageSchema>;
export const publicCourseDetailSchema = publicCourseSchema.extend({
  units: z.array(courseUnitSchema),
  openClasses: z.array(publicClassSchema),
});
export type PublicCourseDetail = z.infer<typeof publicCourseDetailSchema>;

export const publicBrowseFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(12),
  categoryId: z.uuid({ version: 'v4' }).optional().catch(undefined),
  deliveryMode: z.enum(['ONLINE', 'OFFLINE']).optional().catch(undefined),
  startsFrom: dateOnly.optional().catch(undefined),
  startsTo: dateOnly.optional().catch(undefined),
});
export type PublicBrowseFilters = z.infer<typeof publicBrowseFiltersSchema>;
export const browseFilterFormSchema = z
  .object({
    categoryId: z.union([z.uuid({ version: 'v4' }), z.literal('')]),
    deliveryMode: z.enum(['', 'ONLINE', 'OFFLINE']),
    startsFrom: z.union([dateOnly, z.literal('')]),
    startsTo: z.union([dateOnly, z.literal('')]),
  })
  .refine(
    (fields) => !fields.startsFrom || !fields.startsTo || fields.startsFrom <= fields.startsTo,
    { path: ['startsTo'], message: 'Ngày kết thúc bộ lọc phải từ ngày bắt đầu trở đi.' },
  );
export type BrowseFilterFormInput = z.infer<typeof browseFilterFormSchema>;
export function browseQuery(filters: PublicBrowseFilters, includeCategory: boolean): string {
  return new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
    ...(includeCategory && filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.deliveryMode ? { deliveryMode: filters.deliveryMode } : {}),
    ...(filters.startsFrom ? { startsFrom: filters.startsFrom } : {}),
    ...(filters.startsTo ? { startsTo: filters.startsTo } : {}),
  }).toString();
}
export function isBrowseRangeValid(filters: PublicBrowseFilters): boolean {
  return !filters.startsFrom || !filters.startsTo || filters.startsFrom <= filters.startsTo;
}
export function formatCourseDate(value: string): string {
  // Date-only is a calendar date, so format its components without timezone conversion.
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}
