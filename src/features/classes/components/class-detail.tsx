'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { listAllActiveMentors } from '@/features/users/client';
import type { User } from '@/shared/api/contracts/identity';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import styles from '@/shared/components/management.module.css';
import { UnitWorkspace } from '@/shared/components/unit-workspace';
import { formatDate } from '@/shared/lib/date';
import { ApiError } from '@/shared/lib/http/api-error';
import { commandClass, getClass, scheduleSession, updateClass } from '../api/classes.browser';
import {
  type ClassCommand,
  classCommands,
  classErrorMessage,
  classStatusLabels,
  commandLabels,
  deliveryModeLabels,
  formatCalendarDate,
  hasReadySchedule,
  isClassEditable,
  scheduleSessionPayload,
  updateClassPayload,
} from '../domain/class-rules';
import type {
  CreateClassInput,
  ManagementClassDetail,
  SessionFormInput,
} from '../schemas/class.schema';
import { ClassForm } from './class-form';
import local from './classes.module.css';
import { SessionForm } from './session-form';

const unitStatusLabels = { LOCKED: 'Chưa mở', OPEN: 'Đã mở', COMPLETED: 'Hoàn thành' };
const sessionStatusLabels = {
  SCHEDULED: 'Đã xếp lịch',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export function ClassDetail({ id }: { id: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [detail, setDetail] = useState<ManagementClassDetail>();
  const [mentors, setMentors] = useState<User[]>([]);
  const [mentorError, setMentorError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [confirm, setConfirm] = useState<ClassCommand>();
  // biome-ignore lint/correctness/useExhaustiveDependencies: retry triggers a deliberate data reload.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    setDetail(undefined);
    setMentorError(undefined);
    getClass(id, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) setDetail(response);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) setError(classErrorMessage(failure));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    listAllActiveMentors(controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) setMentors(response);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) setMentorError(classErrorMessage(failure));
      });
    return () => controller.abort();
  }, [id, retry]);
  async function reloadClass() {
    if (busy) return;
    setBusy(true);
    try {
      setDetail(await getClass(id));
      setError(undefined);
      setMessage('Đã tải lại trạng thái lớp; dữ liệu đã nhập được giữ nguyên.');
    } catch (failure) {
      setError(classErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  async function reloadMentors() {
    try {
      setMentors(await listAllActiveMentors());
      setMentorError(undefined);
    } catch (failure) {
      setMentorError(classErrorMessage(failure));
    }
  }
  async function mutate(action: () => Promise<ManagementClassDetail>, success: string) {
    if (busy) return null;
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    setConfirm(undefined);
    try {
      const response = await action();
      setDetail(response);
      setMessage(success);
      return response;
    } catch (failure) {
      const description = classErrorMessage(failure);
      setError(description);
      if (failure instanceof ApiError && failure.status === 409) {
        try {
          setDetail(await getClass(id));
          setError(`${description} Đã tải lại trạng thái lớp; dữ liệu đã nhập được giữ nguyên.`);
        } catch {
          setError(`${description} Chưa thể tải lại trạng thái lớp. Hãy thử lại.`);
        }
      }
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function save(values: CreateClassInput) {
    if (!detail) return null;
    return mutate(
      () => updateClass(id, updateClassPayload(detail.status, values)),
      'Đã lưu thông tin lớp.',
    );
  }
  async function addSession(values: SessionFormInput, unitId: string) {
    if (!detail) return null;
    return mutate(
      () => scheduleSession(id, scheduleSessionPayload(values, unitId, detail)),
      'Đã thêm buổi học.',
    );
  }
  if (loading) return <LoadingState label="Đang tải lớp học…" />;
  if (!detail)
    return (
      <ErrorPanel
        message={error ?? 'Lớp học không khả dụng.'}
        retry={() => setRetry((value) => value + 1)}
      />
    );
  const selectedId = params.get('unitId') ?? detail.units[0]?.id;
  const selectedUnit = detail.units.find((unit) => unit.id === selectedId);
  const ready = hasReadySchedule(detail);
  function unitHref(unitId: string) {
    const next = new URLSearchParams(params);
    next.set('unitId', unitId);
    return `${pathname}?${next}`;
  }
  return (
    <section className={styles.page}>
      <p className={styles.eyebrow}>MINDY / QUẢN TRỊ LỚP</p>
      <div className={styles.heading}>
        <h1>{detail.name}</h1>
        <Link href="/management/classes" className={styles.secondaryButton}>
          Danh sách lớp
        </Link>
      </div>
      <div className={local.meta}>
        <span>{detail.code}</span>
        <span>{classStatusLabels[detail.status]}</span>
        <span>{deliveryModeLabels[detail.deliveryMode]}</span>
        <span>
          {formatCalendarDate(detail.startDate)} – {formatCalendarDate(detail.endDate)}
        </span>
        <span>
          {detail.availableSeats} / {detail.maxStudents} chỗ trống
        </span>
      </div>
      {error && <ErrorPanel message={error} retry={() => void reloadClass()} />}
      {message && (
        <p className={styles.notice} role="status">
          {message}
        </p>
      )}
      <div className={local.summary}>
        {detail.status === 'DRAFT' && (
          <p className={local.readiness}>
            {ready
              ? 'Lịch học đã đủ để gửi yêu cầu mở tuyển sinh. Hệ thống sẽ kiểm tra lịch dạy của mentor khi mở lớp.'
              : 'Để mở tuyển sinh: cần học phần và ít nhất một buổi đã xếp lịch, tất cả buổi học nằm trong thời gian của lớp.'}
          </p>
        )}
        <div className={styles.actions}>
          {classCommands(detail.status).map((command) => (
            <button
              type="button"
              className={styles.secondaryButton}
              key={command}
              disabled={busy || (command === 'open' && !ready)}
              onClick={() => setConfirm(command)}
            >
              {commandLabels[command]}
            </button>
          ))}
        </div>
        {confirm && (
          <section className={local.readiness} aria-label="Xác nhận thay đổi trạng thái">
            <p>
              Xác nhận “{commandLabels[confirm]}” cho lớp {detail.code}?
            </p>
            {confirm === 'cancel' && (
              <p>Hủy lớp hiện chưa tự giải phóng các chỗ đang được giữ bởi đơn chờ thanh toán.</p>
            )}
            <div className={local.confirm}>
              <button
                type="button"
                className={styles.button}
                disabled={busy}
                onClick={() =>
                  void mutate(
                    () => commandClass(id, confirm),
                    `Đã thực hiện: ${commandLabels[confirm]}.`,
                  )
                }
              >
                Xác nhận
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setConfirm(undefined)}
              >
                Quay lại
              </button>
            </div>
          </section>
        )}
        <details className={local.settings}>
          <summary>
            Thông tin lớp · {isClassEditable(detail.status) ? 'Chỉnh sửa' : 'Chỉ đọc'}
          </summary>
          <div className={local.settingsContent}>
            <h2 className={local.sectionHeading}>Thông tin lớp</h2>
            {mentorError && (
              <ErrorPanel
                message={`Chưa tải được danh sách mentor. ${mentorError}`}
                retry={() => void reloadMentors()}
              />
            )}
            <ClassForm detail={detail} mentors={mentors} busy={busy} onSubmit={save} />
          </div>
        </details>
      </div>
      <UnitWorkspace
        title={detail.name}
        backHref={`/management/courses/${detail.courseId}`}
        backLabel="Xem khóa học"
        railLabel="Học phần và lịch học"
        selectionKey={selectedId}
        rail={
          <nav aria-label="Học phần của lớp">
            {detail.units.length === 0 ? (
              <p className={styles.notice}>Lớp chưa có học phần.</p>
            ) : (
              detail.units.map((unit) => (
                <Link
                  href={unitHref(unit.id)}
                  scroll={false}
                  key={unit.id}
                  className={local.unitLink}
                  aria-current={unit.id === selectedId ? 'page' : undefined}
                >
                  <span>
                    {unit.position}. {unit.title}
                  </span>
                  <small>
                    {unitStatusLabels[unit.status]} · {unit.sessions.length} buổi học
                  </small>
                </Link>
              ))
            )}
          </nav>
        }
      >
        {selectedUnit ? (
          <div className={local.sections}>
            <section>
              <h2 className={local.sectionHeading}>{selectedUnit.title}</h2>
              <p className={local.muted}>
                {unitStatusLabels[selectedUnit.status]}
                {selectedUnit.unlockAt
                  ? ` · Mở lúc ${formatDate(selectedUnit.unlockAt, true)}`
                  : ''}
              </p>
              {selectedUnit.sessions.length === 0 ? (
                <p className={styles.notice}>Học phần chưa có buổi học. Thêm lịch học bên dưới.</p>
              ) : (
                selectedUnit.sessions.map((session) => (
                  <article key={session.id} className={local.session}>
                    <h3>
                      Buổi {session.sessionNumber} · {session.title}
                    </h3>
                    <p>
                      {formatDate(session.startsAt, true)} – {formatDate(session.endsAt, true)}
                    </p>
                    <p>
                      {sessionStatusLabels[session.status]}
                      {session.roomName ? ` · Phòng ${session.roomName}` : ''}
                    </p>
                    {session.meetingUrl && (
                      <p>
                        <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer">
                          Mở liên kết buổi học
                        </a>
                      </p>
                    )}
                  </article>
                ))
              )}
            </section>
            {isClassEditable(detail.status) && (
              <section>
                <h2 className={local.sectionHeading}>Xếp lịch cho học phần</h2>
                <SessionForm
                  key={selectedUnit.id}
                  unitId={selectedUnit.id}
                  busy={busy}
                  onSubmit={addSession}
                />
              </section>
            )}
          </div>
        ) : (
          <div className={styles.notice}>
            {selectedId
              ? 'Học phần không thuộc lớp hoặc không còn khả dụng.'
              : 'Lớp chưa có học phần để xếp lịch.'}
          </div>
        )}
      </UnitWorkspace>
    </section>
  );
}
