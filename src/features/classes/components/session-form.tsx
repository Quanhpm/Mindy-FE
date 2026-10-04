'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import styles from '@/shared/components/management.module.css';
import {
  type ManagementClassDetail,
  type SessionFormInput,
  sessionFormSchema,
} from '../schemas/class.schema';
import { ClassField } from './class-field';
import local from './classes.module.css';

export function SessionForm({
  unitId,
  busy,
  onSubmit,
}: {
  unitId: string;
  busy: boolean;
  onSubmit: (values: SessionFormInput, unitId: string) => Promise<ManagementClassDetail | null>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SessionFormInput>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: { title: '', startsAt: '', endsAt: '', roomName: '', meetingUrl: '' },
  });
  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        if (await onSubmit(values, unitId)) reset();
      })}
      noValidate
      className={local.form}
    >
      <fieldset disabled={busy} className={local.fieldset}>
        <ClassField id="session-title" label="Tiêu đề buổi học" error={errors.title?.message}>
          <input
            id="session-title"
            {...register('title')}
            maxLength={250}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'session-title-error' : undefined}
          />
        </ClassField>
        <p className={local.muted}>Ngày giờ theo múi giờ Việt Nam (UTC+07:00).</p>
        <div className={local.formGrid}>
          <ClassField id="session-start" label="Bắt đầu buổi học" error={errors.startsAt?.message}>
            <input
              type="datetime-local"
              id="session-start"
              {...register('startsAt')}
              aria-invalid={Boolean(errors.startsAt)}
              aria-describedby={errors.startsAt ? 'session-start-error' : undefined}
            />
          </ClassField>
          <ClassField id="session-end" label="Kết thúc buổi học" error={errors.endsAt?.message}>
            <input
              type="datetime-local"
              id="session-end"
              {...register('endsAt')}
              aria-invalid={Boolean(errors.endsAt)}
              aria-describedby={errors.endsAt ? 'session-end-error' : undefined}
            />
          </ClassField>
          <ClassField
            id="session-room"
            label="Phòng học (tùy chọn)"
            error={errors.roomName?.message}
          >
            <input
              id="session-room"
              {...register('roomName')}
              maxLength={150}
              aria-invalid={Boolean(errors.roomName)}
              aria-describedby={errors.roomName ? 'session-room-error' : undefined}
            />
          </ClassField>
          <ClassField
            id="session-url"
            label="Liên kết buổi học (tùy chọn)"
            error={errors.meetingUrl?.message}
          >
            <input
              type="url"
              id="session-url"
              {...register('meetingUrl')}
              maxLength={2048}
              aria-invalid={Boolean(errors.meetingUrl)}
              aria-describedby={errors.meetingUrl ? 'session-url-error' : undefined}
            />
          </ClassField>
        </div>
        <button className={styles.button} type="submit">
          {busy ? 'Đang xếp lịch…' : 'Thêm buổi học'}
        </button>
      </fieldset>
    </form>
  );
}
