import { z } from 'zod';

export const classStatusSchema = z.enum(['DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
export const deliveryModeSchema = z.enum(['ONLINE', 'OFFLINE']);
export type ClassStatus = z.infer<typeof classStatusSchema>;
export type DeliveryMode = z.infer<typeof deliveryModeSchema>;
const dateOnly = z.iso.date({ error: 'Ngày phải hợp lệ theo định dạng YYYY-MM-DD.' });
const instant = z.iso.datetime({ offset: true });
const uuid = z.uuid();
const meetingUrl = z
  .url()
  .max(2048)
  .refine((value) => /^https?:\/\//.test(value), {
    error: 'Liên kết phải dùng http hoặc https.',
  });
const optionalMeetingInput = z.union([meetingUrl, z.literal('')]);

// The public contract deliberately contains no lifecycle, meeting URL or audit fields.
export const publicClassSchema = z.object({
  id: uuid,
  courseId: uuid,
  code: z.string(),
  name: z.string(),
  startDate: dateOnly,
  endDate: dateOnly,
  deliveryMode: deliveryModeSchema,
  maxStudents: z.number().int().positive(),
  availableSeats: z.number().int().nonnegative(),
  mentor: z.object({ id: uuid, displayName: z.string().nullable() }),
});
const publicSessionSchema = z.object({
  id: uuid,
  sessionNumber: z.number().int().positive(),
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
      position: z.number().int().positive(),
      title: z.string(),
      sessions: z.array(publicSessionSchema),
    }),
  ),
});
export const managementClassSchema = publicClassSchema.extend({
  status: classStatusSchema,
  meetingUrl: meetingUrl.nullable(),
  createdAt: instant,
  updatedAt: instant,
});
export const managementClassDetailSchema = managementClassSchema.extend({
  units: z.array(
    z.object({
      id: uuid,
      courseUnitId: uuid,
      position: z.number().int().positive(),
      title: z.string(),
      status: z.enum(['LOCKED', 'OPEN', 'COMPLETED']),
      unlockAt: instant.nullable(),
      sessions: z.array(
        publicSessionSchema.extend({
          classUnitId: uuid,
          meetingUrl: meetingUrl.nullable(),
        }),
      ),
    }),
  ),
});
export const managementClassPageSchema = z.object({
  items: z.array(managementClassSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive().max(100),
  total: z.number().int().nonnegative(),
});
export type ManagementClass = z.infer<typeof managementClassSchema>;
export type ManagementClassDetail = z.infer<typeof managementClassDetailSchema>;
export type ManagementClassPage = z.infer<typeof managementClassPageSchema>;
export type ManagementClassUnit = ManagementClassDetail['units'][number];

export const classFieldsSchema = z
  .object({
    name: z.string().trim().min(1, 'Nhập tên lớp.').max(250),
    mentorId: z.uuid({ version: 'v4', error: 'Chọn mentor đang hoạt động.' }),
    startDate: dateOnly,
    endDate: dateOnly,
    maxStudents: z.number().int('Số chỗ phải là số nguyên.').min(1).max(1000),
    deliveryMode: deliveryModeSchema,
    meetingUrl: optionalMeetingInput,
  })
  .refine((values) => values.startDate <= values.endDate, {
    path: ['endDate'],
    error: 'Ngày kết thúc phải từ ngày bắt đầu trở đi.',
  });
export const createClassSchema = classFieldsSchema.safeExtend({
  courseId: z.uuid({ version: 'v4', error: 'Chọn khóa học đang hoạt động.' }),
  code: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, {
      error: 'Mã lớp chỉ gồm chữ, số, dấu gạch ngang và gạch dưới.',
    }),
});
export type ClassFieldsInput = z.infer<typeof classFieldsSchema>;
export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = Partial<Omit<ClassFieldsInput, 'meetingUrl'>> & {
  meetingUrl?: string | null;
};

export const scheduleSessionSchema = z
  .object({
    classUnitId: z.uuid({ version: 'v4', error: 'Chọn học phần của lớp.' }),
    title: z.string().trim().min(1, 'Nhập tiêu đề buổi học.').max(250),
    startsAt: instant,
    endsAt: instant,
    roomName: z.string().max(150).optional(),
    meetingUrl: meetingUrl.optional(),
  })
  .refine((values) => Date.parse(values.startsAt) < Date.parse(values.endsAt), {
    path: ['endsAt'],
    error: 'Giờ kết thúc phải sau giờ bắt đầu.',
  });
export type ScheduleSessionInput = z.infer<typeof scheduleSessionSchema>;

export const sessionFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Nhập tiêu đề buổi học.').max(250),
    startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Chọn ngày và giờ bắt đầu.'),
    endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Chọn ngày và giờ kết thúc.'),
    roomName: z.string().max(150),
    meetingUrl: optionalMeetingInput,
  })
  .refine((values) => values.startsAt < values.endsAt, {
    path: ['endsAt'],
    error: 'Giờ kết thúc phải sau giờ bắt đầu.',
  });
export type SessionFormInput = z.infer<typeof sessionFormSchema>;
