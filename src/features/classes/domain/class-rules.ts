import { ApiError, errorMessage } from '@/shared/lib/http/api-error';
import type {
  ClassFieldsInput,
  ClassStatus,
  ManagementClassDetail,
  ScheduleSessionInput,
  SessionFormInput,
  UpdateClassInput,
} from '../schemas/class.schema';
import { scheduleSessionSchema } from '../schemas/class.schema';

export const classStatusLabels: Record<ClassStatus, string> = {
  DRAFT: 'Bản nháp',
  OPEN: 'Đang tuyển sinh',
  IN_PROGRESS: 'Đang học',
  COMPLETED: 'Đã kết thúc',
  CANCELLED: 'Đã hủy',
};
export const deliveryModeLabels = { ONLINE: 'Trực tuyến', OFFLINE: 'Tại trung tâm' };
export type ClassCommand = 'open' | 'start' | 'complete' | 'cancel';
export const commandLabels: Record<ClassCommand, string> = {
  open: 'Mở tuyển sinh',
  start: 'Bắt đầu lớp',
  complete: 'Kết thúc lớp',
  cancel: 'Hủy lớp',
};
const commands: Record<ClassStatus, readonly ClassCommand[]> = {
  DRAFT: ['open', 'cancel'],
  OPEN: ['start', 'cancel'],
  IN_PROGRESS: ['complete', 'cancel'],
  COMPLETED: [],
  CANCELLED: [],
};
export function classCommands(status: ClassStatus): readonly ClassCommand[] {
  return commands[status];
}
export function isClassEditable(status: ClassStatus): boolean {
  return status !== 'COMPLETED' && status !== 'CANCELLED';
}
export function updateClassPayload(
  status: ClassStatus,
  values: ClassFieldsInput,
): UpdateClassInput {
  if (!isClassEditable(status)) throw new Error('Lớp đã kết thúc hoặc bị hủy.');
  const editable = {
    name: values.name.trim(),
    mentorId: values.mentorId,
    meetingUrl: values.meetingUrl.trim() || null,
  };
  return status === 'DRAFT'
    ? {
        ...editable,
        startDate: values.startDate,
        endDate: values.endDate,
        maxStudents: values.maxStudents,
        deliveryMode: values.deliveryMode,
      }
    : editable;
}
export function formatCalendarDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}
export function centerDate(instant: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(instant));
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function sessionInPeriod(
  session: Pick<ScheduleSessionInput, 'startsAt' | 'endsAt'>,
  period: Pick<ManagementClassDetail, 'startDate' | 'endDate'>,
): boolean {
  return (
    centerDate(session.startsAt) >= period.startDate && centerDate(session.endsAt) <= period.endDate
  );
}
export function hasReadySchedule(detail: ManagementClassDetail): boolean {
  const sessions = detail.units
    .flatMap((unit) => unit.sessions)
    .filter((session) => session.status === 'SCHEDULED');
  return (
    detail.units.length > 0 &&
    sessions.length > 0 &&
    sessions.every((session) => sessionInPeriod(session, detail))
  );
}
export function scheduleSessionPayload(
  values: SessionFormInput,
  classUnitId: string,
  detail: ManagementClassDetail,
): ScheduleSessionInput {
  if (!detail.units.some((unit) => unit.id === classUnitId))
    throw new ApiError(422, 'CLASS_UNIT_NOT_FOUND', 'Học phần này không thuộc lớp.');
  const payload = scheduleSessionSchema.parse({
    classUnitId,
    title: values.title.trim(),
    startsAt: `${values.startsAt}:00+07:00`,
    endsAt: `${values.endsAt}:00+07:00`,
    ...(values.roomName.trim() ? { roomName: values.roomName.trim() } : {}),
    ...(values.meetingUrl.trim() ? { meetingUrl: values.meetingUrl.trim() } : {}),
  });
  if (!sessionInPeriod(payload, detail))
    throw new ApiError(
      422,
      'CLASS_SESSION_OUTSIDE_CLASS_PERIOD',
      'Buổi học phải nằm trong thời gian của lớp.',
    );
  const overlap = detail.units
    .flatMap((unit) => unit.sessions)
    .some(
      (session) =>
        session.status === 'SCHEDULED' &&
        Date.parse(session.startsAt) < Date.parse(payload.endsAt) &&
        Date.parse(session.endsAt) > Date.parse(payload.startsAt),
    );
  if (overlap)
    throw new ApiError(
      409,
      'CLASS_SESSION_OVERLAP',
      'Buổi học trùng giờ với một buổi khác của lớp.',
    );
  return payload;
}
const classErrors: Record<string, string> = {
  CLASS_NOT_FOUND: 'Không tìm thấy lớp.',
  CLASS_UNIT_NOT_FOUND: 'Học phần không thuộc lớp này.',
  CLASS_CODE_ALREADY_EXISTS: 'Mã lớp đã được sử dụng.',
  CLASS_COURSE_INACTIVE: 'Khóa học chưa hoạt động; hãy chọn khóa học khác.',
  CLASS_MENTOR_NOT_ELIGIBLE: 'Mentor phải có tài khoản đang hoạt động.',
  CLASS_DATE_RANGE_INVALID: 'Ngày kết thúc phải từ ngày bắt đầu trở đi.',
  CLASS_NOT_EDITABLE: 'Trạng thái hiện tại không cho phép thay đổi những trường này.',
  CLASS_INVALID_TRANSITION: 'Trạng thái lớp đã thay đổi. Hãy kiểm tra lại trước khi thao tác.',
  CLASS_NOT_READY_TO_OPEN:
    'Cần có học phần và ít nhất một buổi đã xếp lịch; tất cả buổi học phải nằm trong thời gian của lớp.',
  CLASS_SESSION_TIME_RANGE_INVALID: 'Giờ kết thúc phải sau giờ bắt đầu.',
  CLASS_SESSION_OUTSIDE_CLASS_PERIOD: 'Buổi học phải nằm trong thời gian của lớp.',
  CLASS_SESSION_OVERLAP: 'Buổi học trùng giờ với một buổi khác của lớp.',
  CLASS_MENTOR_SCHEDULE_CONFLICT: 'Mentor đã có lịch dạy lớp khác trong khoảng giờ này.',
};
export function classErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? (classErrors[error.code] ?? errorMessage(error))
    : errorMessage(error);
}
