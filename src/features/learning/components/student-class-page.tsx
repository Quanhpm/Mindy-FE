'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { canPurchaseClasses, useSession } from '@/features/auth/client';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import s from '@/shared/components/management.module.css';
import { UnitWorkspace } from '@/shared/components/unit-workspace';
import { formatDate } from '@/shared/lib/date';
import { ApiError, errorMessage } from '@/shared/lib/http/api-error';
import { getStudentClass } from '../api/learning.browser';
import type { StudentClass } from '../schemas/learning.schema';
import styles from './student-class-page.module.css';

export function StudentClassPage({ id }: { id: string }) {
  const { user, state } = useSession();
  if (!user || state !== 'authenticated') return <LoadingState />;
  if (!canPurchaseClasses(user.role))
    return (
      <section className="empty-state">
        <h1>Khu vực dành cho học viên</h1>
        <Link href="/account">Về tài khoản</Link>
      </section>
    );
  return <ClassContent key={`${user.id}:${id}`} id={id} />;
}
function MeetingLink({ url, label }: { url: string | null; label: string }) {
  return url ? (
    <a className="button button-primary" href={url} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  ) : null;
}
function ClassContent({ id }: { id: string }) {
  const params = useSearchParams();
  const selectedId = params.get('unitId');
  const [data, setData] = useState<StudentClass>();
  const [error, setError] = useState<string>();
  const [denied, setDenied] = useState(false);
  const [revision, setRevision] = useState(0);
  const valid = z.uuid().safeParse(id).success;
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision retries a failed read.
  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    setData(undefined);
    setError(undefined);
    setDenied(false);
    void getStudentClass(id, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        const forbidden = cause instanceof ApiError && [403, 404].includes(cause.status);
        setDenied(forbidden);
        setError(
          cause instanceof ApiError && cause.code === 'CLASS_ACCESS_DENIED'
            ? 'Bạn chưa có quyền truy cập lớp này. Cần enrollment đang hoạt động và lớp chưa bị hủy.'
            : errorMessage(cause),
        );
      });
    return () => controller.abort();
  }, [id, valid, revision]);
  if (!valid) return <ErrorPanel message="Mã lớp không hợp lệ." />;
  if (error)
    return (
      <div className={s.page}>
        <h1>Không thể mở lớp học</h1>
        <ErrorPanel
          message={error}
          retry={denied ? undefined : () => setRevision((value) => value + 1)}
        />
        <Link href="/orders">Về đơn đăng ký</Link>
      </div>
    );
  if (!data) return <LoadingState label="Đang kiểm tra quyền và tải lớp học…" />;
  const selected = selectedId ? data.units.find((unit) => unit.id === selectedId) : data.units[0];
  return (
    <div className={s.page}>
      <header className={s.heading}>
        <div>
          <p className={s.eyebrow}>MINDY / LỚP HỌC</p>
          <h1>{data.name}</h1>
          <p>
            {data.deliveryMode === 'ONLINE' ? 'Trực tuyến' : 'Tại trung tâm'} · Mentor:{' '}
            {data.mentor.displayName ?? 'Chưa có tên hiển thị'}
          </p>
        </div>
        <Link href="/orders">Đơn đăng ký</Link>
      </header>
      <MeetingLink url={data.meetingUrl} label="Mở phòng học của lớp" />
      <UnitWorkspace
        title={data.name}
        backHref="/orders"
        backLabel="Đơn đăng ký"
        railLabel="Học phần của lớp"
        selectionKey={selected?.id ?? selectedId ?? 'empty'}
        rail={
          <nav aria-label="Chọn học phần">
            <ul className={styles.unitList}>
              {data.units.map((unit) => (
                <li key={unit.id}>
                  <Link
                    className={styles.unitLink}
                    aria-current={selected?.id === unit.id ? 'page' : undefined}
                    href={`/learning/classes/${id}?unitId=${unit.id}`}
                    scroll={false}
                  >
                    {unit.position}. {unit.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        }
      >
        {!selected ? (
          <p>{selectedId ? 'Học phần không thuộc lớp này.' : 'Lớp chưa có học phần.'}</p>
        ) : (
          <>
            <h2>{selected.title}</h2>
            {selected.sessions.length === 0 ? (
              <p>Học phần chưa có lịch học.</p>
            ) : (
              selected.sessions.map((session) => (
                <article className={s.panel} key={session.id}>
                  <h3>
                    {session.sessionNumber}. {session.title}
                  </h3>
                  <p>
                    {formatDate(session.startsAt, true)} – {formatDate(session.endsAt, true)}
                  </p>
                  <p>
                    Trạng thái:{' '}
                    {
                      { SCHEDULED: 'Đã lên lịch', COMPLETED: 'Đã kết thúc', CANCELLED: 'Đã hủy' }[
                        session.status
                      ]
                    }
                  </p>
                  {session.roomName && <p>Phòng: {session.roomName}</p>}
                  {session.status !== 'CANCELLED' && (
                    <MeetingLink
                      url={session.meetingUrl}
                      label={`Mở phòng học buổi ${session.sessionNumber}`}
                    />
                  )}
                </article>
              ))
            )}
          </>
        )}
      </UnitWorkspace>
    </div>
  );
}
