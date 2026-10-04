'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import type { CourseManagement } from '@/features/catalog/client';
import type { User } from '@/shared/api/contracts/identity';
import styles from '@/shared/components/management.module.css';
import { isClassEditable } from '../domain/class-rules';
import {
  type CreateClassInput,
  createClassSchema,
  type ManagementClassDetail,
} from '../schemas/class.schema';
import { ClassField } from './class-field';
import local from './classes.module.css';

export function ClassForm({
  detail,
  courses = [],
  mentors,
  choicesReady = true,
  busy,
  onSubmit,
}: {
  detail?: ManagementClassDetail;
  courses?: CourseManagement[];
  mentors: User[];
  choicesReady?: boolean;
  busy: boolean;
  onSubmit: (values: CreateClassInput) => Promise<ManagementClassDetail | null>;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateClassInput>({
    resolver: zodResolver(createClassSchema),
    defaultValues: detail
      ? {
          courseId: detail.courseId,
          code: detail.code,
          name: detail.name,
          mentorId: detail.mentor.id,
          startDate: detail.startDate,
          endDate: detail.endDate,
          maxStudents: detail.maxStudents,
          deliveryMode: detail.deliveryMode,
          meetingUrl: detail.meetingUrl ?? '',
        }
      : {
          courseId: '',
          code: '',
          name: '',
          mentorId: '',
          startDate: '',
          endDate: '',
          maxStudents: 20,
          deliveryMode: 'ONLINE',
          meetingUrl: '',
        },
  });
  const selectedCourseId = useWatch({ control, name: 'courseId' });
  const selectedMentorId = useWatch({ control, name: 'mentorId' });
  const missingCourse =
    !detail &&
    Boolean(selectedCourseId) &&
    !courses.some((course) => course.id === selectedCourseId);
  const missingMentor =
    !detail &&
    Boolean(selectedMentorId) &&
    !mentors.some((mentor) => mentor.id === selectedMentorId);
  const courseError =
    errors.courseId?.message ??
    (choicesReady && missingCourse
      ? 'Khóa học đã chọn không còn hoạt động. Chọn khóa học khác.'
      : undefined);
  const mentorError =
    errors.mentorId?.message ??
    (choicesReady && missingMentor
      ? 'Mentor đã chọn không còn hoạt động. Chọn mentor khác.'
      : undefined);
  const validCreationChoices =
    choicesReady &&
    courses.some((course) => course.id === selectedCourseId) &&
    mentors.some((mentor) => mentor.id === selectedMentorId);
  const frozen = Boolean(detail && detail.status !== 'DRAFT');
  const editable = !detail || isClassEditable(detail.status);
  const submit = handleSubmit(async (values) => {
    const result = await onSubmit(values);
    if (result)
      reset({
        ...values,
        name: result.name,
        mentorId: result.mentor.id,
        meetingUrl: result.meetingUrl ?? '',
        startDate: result.startDate,
        endDate: result.endDate,
        maxStudents: result.maxStudents,
        deliveryMode: result.deliveryMode,
      });
  });
  return (
    <form className={local.form} onSubmit={submit} noValidate>
      <fieldset disabled={busy || !editable} className={local.fieldset}>
        {!detail && (
          <div className={local.formGrid}>
            <ClassField id="courseId" label="Khóa học đang hoạt động" error={courseError}>
              <select
                id="courseId"
                {...register('courseId')}
                value={selectedCourseId ?? ''}
                aria-invalid={Boolean(courseError)}
                aria-describedby={courseError ? 'courseId-error' : undefined}
              >
                <option value="">Chọn khóa học</option>
                {missingCourse && (
                  <option value={selectedCourseId}>
                    Đã chọn · {selectedCourseId}
                    {choicesReady ? ' · không còn hoạt động' : ''}
                  </option>
                )}
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} · {course.title}
                  </option>
                ))}
              </select>
            </ClassField>
            <ClassField id="code" label="Mã lớp" error={errors.code?.message}>
              <input
                id="code"
                {...register('code')}
                maxLength={50}
                autoComplete="off"
                aria-invalid={Boolean(errors.code)}
                aria-describedby={errors.code ? 'code-error' : undefined}
              />
            </ClassField>
          </div>
        )}
        {detail && (
          <>
            <input type="hidden" {...register('courseId')} />
            <input type="hidden" {...register('code')} />
          </>
        )}
        <div className={local.formGrid}>
          <ClassField id="name" label="Tên lớp" error={errors.name?.message}>
            <input
              id="name"
              {...register('name')}
              maxLength={250}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
          </ClassField>
          <ClassField id="mentorId" label="Mentor đang hoạt động" error={mentorError}>
            <select
              id="mentorId"
              {...register('mentorId')}
              value={selectedMentorId ?? ''}
              aria-invalid={Boolean(mentorError)}
              aria-describedby={mentorError ? 'mentorId-error' : undefined}
            >
              <option value="">Chọn mentor</option>
              {missingMentor && (
                <option value={selectedMentorId}>
                  Đã chọn · {selectedMentorId}
                  {choicesReady ? ' · không còn hoạt động' : ''}
                </option>
              )}
              {detail && !mentors.some((mentor) => mentor.id === detail.mentor.id) && (
                <option value={detail.mentor.id}>
                  {detail.mentor.displayName ?? 'Mentor hiện tại'} · hiện tại
                </option>
              )}
              {mentors.map((mentor) => (
                <option key={mentor.id} value={mentor.id}>
                  {mentor.displayName} · {mentor.email}
                </option>
              ))}
            </select>
          </ClassField>
          <ClassField id="startDate" label="Ngày bắt đầu" error={errors.startDate?.message}>
            <input
              type="date"
              id="startDate"
              {...register('startDate')}
              readOnly={frozen}
              aria-invalid={Boolean(errors.startDate)}
              aria-describedby={errors.startDate ? 'startDate-error' : undefined}
            />
          </ClassField>
          <ClassField id="endDate" label="Ngày kết thúc" error={errors.endDate?.message}>
            <input
              type="date"
              id="endDate"
              {...register('endDate')}
              readOnly={frozen}
              aria-invalid={Boolean(errors.endDate)}
              aria-describedby={errors.endDate ? 'endDate-error' : undefined}
            />
          </ClassField>
          <ClassField
            id="maxStudents"
            label="Số chỗ tối đa (1–1.000)"
            error={errors.maxStudents?.message}
          >
            <input
              type="number"
              id="maxStudents"
              {...register('maxStudents', { valueAsNumber: true })}
              min={1}
              max={1000}
              readOnly={frozen}
              aria-invalid={Boolean(errors.maxStudents)}
              aria-describedby={errors.maxStudents ? 'maxStudents-error' : undefined}
            />
          </ClassField>
          <ClassField id="deliveryMode" label="Hình thức học" error={errors.deliveryMode?.message}>
            <select
              id="deliveryMode"
              {...register('deliveryMode')}
              disabled={frozen}
              aria-invalid={Boolean(errors.deliveryMode)}
            >
              <option value="ONLINE">Trực tuyến</option>
              <option value="OFFLINE">Tại trung tâm</option>
            </select>
          </ClassField>
        </div>
        <ClassField
          id="meetingUrl"
          label="Liên kết lớp trực tuyến (tùy chọn)"
          error={errors.meetingUrl?.message}
        >
          <input
            type="url"
            id="meetingUrl"
            {...register('meetingUrl')}
            maxLength={2048}
            placeholder="https://…"
            aria-invalid={Boolean(errors.meetingUrl)}
            aria-describedby={errors.meetingUrl ? 'meetingUrl-error' : undefined}
          />
        </ClassField>
        {frozen && (
          <p className={local.muted}>
            Ngày học, số chỗ và hình thức được cố định sau khi lớp rời bản nháp.
          </p>
        )}
        {editable && (
          <button
            className={styles.button}
            type="submit"
            disabled={!detail && !validCreationChoices}
          >
            {busy ? 'Đang lưu…' : detail ? 'Lưu thông tin lớp' : 'Tạo lớp bản nháp'}
          </button>
        )}
      </fieldset>
      {!editable && (
        <p className={styles.notice}>Lớp đã kết thúc hoặc đã hủy; thông tin chỉ đọc.</p>
      )}
    </form>
  );
}
