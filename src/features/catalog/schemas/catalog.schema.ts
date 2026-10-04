import { z } from 'zod';

const uuidV4 = z
  .string()
  .uuid()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    'ID chưa hợp lệ.',
  );
const pageFields = {
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
};
const description = z.string().trim().max(10_000, 'Tối đa 10.000 ký tự.');
const price = z
  .number()
  .int('Giá cần là số nguyên.')
  .min(0, 'Giá không được âm.')
  .max(1_000_000_000_000, 'Giá vượt giới hạn cho phép.');
const title = z.string().trim().min(1, 'Vui lòng nhập tên.').max(250, 'Tối đa 250 ký tự.');

export const categorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
});
export type CourseCategory = z.infer<typeof categorySchema>;
export const categoryPageSchema = z.object({ items: z.array(categorySchema), ...pageFields });
export type CategoryPage = z.infer<typeof categoryPageSchema>;
export const categoryInputSchema = z.strictObject({
  name: z.string().trim().min(1, 'Vui lòng nhập tên danh mục.').max(150),
  slug: z.union([
    z.literal(''),
    z
      .string()
      .max(180)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Chỉ dùng chữ thường, số và dấu gạch nối.'),
  ]),
  description: z.string().trim().max(2000),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export const courseUnitSchema = z.object({
  id: z.string().uuid(),
  unitNumber: z.number().int().min(1),
  title: z.string(),
  description: z.string().nullable(),
  requiredScorePercent: z.number().min(0).max(100),
});
export type CourseUnit = z.infer<typeof courseUnitSchema>;
export const courseManagementSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  priceAmount: price,
  category: z.object({ id: z.string().uuid(), name: z.string(), slug: z.string() }),
  isActive: z.boolean(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type CourseManagement = z.infer<typeof courseManagementSchema>;
export const courseDetailSchema = courseManagementSchema.extend({
  units: z.array(courseUnitSchema),
});
export type CourseDetail = z.infer<typeof courseDetailSchema>;
export const coursePageSchema = z.object({ items: z.array(courseManagementSchema), ...pageFields });
export type CoursePage = z.infer<typeof coursePageSchema>;
const courseFields = { categoryId: uuidV4, title, description, priceAmount: price };
export const courseCreateSchema = z.strictObject({
  ...courseFields,
  code: z
    .string()
    .trim()
    .min(2, 'Mã cần ít nhất 2 ký tự.')
    .max(50)
    .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, 'Chỉ dùng chữ, số, dấu gạch nối hoặc gạch dưới.'),
});
export type CourseCreateInput = z.infer<typeof courseCreateSchema>;
export const courseEditSchema = z.strictObject(courseFields);
export type CourseEditInput = z.infer<typeof courseEditSchema>;
export const courseUpdatePayloadSchema = z.strictObject({
  categoryId: uuidV4.optional(),
  title: title.optional(),
  description: description.nullable().optional(),
  priceAmount: price.optional(),
});
export const unitInputSchema = z.strictObject({
  title,
  description,
  requiredScorePercent: z
    .number()
    .min(0, 'Từ 0 đến 100.')
    .max(100, 'Từ 0 đến 100.')
    .refine(
      (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7,
      'Tối đa 2 chữ số thập phân.',
    ),
});
export type UnitInput = z.infer<typeof unitInputSchema>;
export const reorderInputSchema = z.strictObject({
  unitIds: z
    .array(uuidV4)
    .min(1)
    .max(200)
    .refine((ids) => new Set(ids).size === ids.length, 'Mỗi học phần chỉ được xuất hiện một lần.'),
});
export const catalogFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
  categoryId: uuidV4.optional().catch(undefined),
  isActive: z.enum(['true', 'false']).optional().catch(undefined),
});
