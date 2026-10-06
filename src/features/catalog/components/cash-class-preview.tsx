'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useSession } from '@/features/auth/client';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import { UnitWorkspace } from '@/shared/components/unit-workspace';
import { formatDate } from '@/shared/lib/date';
import { ApiError, errorMessage } from '@/shared/lib/http/api-error';
import { getCashClassPreview } from '../api/public-catalog.browser';
import { formatCourseDate, type PublicClassDetail } from '../schemas/public-catalog.schema';
import s from './public-catalog.module.css';

export function CashClassPreview({ id }: { id: string }) {
  const { user, state } = useSession();
  if (state !== 'authenticated' || !user) return <LoadingState />;
  if (user.role !== 'STUDENT')
    return (
      <section className="empty-state">
        <h1>Khu vực dành cho học viên</h1>
        <p>Xem trước dành cho học viên đang giữ chỗ thanh toán tiền mặt.</p>
        <Link href="/account">Về tài khoản</Link>
      </section>
    );
  return <Preview key={`${user.id}:${id}`} id={id} />;
}
function Preview({ id }: { id: string }) {
  const params = useSearchParams();
  const [data, setData] = useState<PublicClassDetail>();
  const [error, setError] = useState<string>();
  const [denied, setDenied] = useState(false);
  const [revision, setRevision] = useState(0);
  const valid = z.uuid().safeParse(id).success;
  // biome-ignore lint/correctness/useExhaustiveDependencies: explicit read retry.
  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    setData(undefined);
    setError(undefined);
    void getCashClassPreview(id, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          const forbidden = cause instanceof ApiError && [403, 404].includes(cause.status);
          setDenied(forbidden);
          setError(
            forbidden
              ? 'Không còn quyền xem trước. Kiểm tra đơn giữ chỗ; nếu đã thanh toán, hãy mở lớp từ chi tiết đơn.'
              : errorMessage(cause),
          );
        }
      });
    return () => controller.abort();
  }, [id, valid, revision]);
  if (!valid) return <ErrorPanel message="Mã lớp không hợp lệ." />;
  if (error)
    return (
      <section className={s.root}>
        <h1>Không thể xem trước lớp</h1>
        <ErrorPanel message={error} retry={denied ? undefined : () => setRevision((v) => v + 1)} />
        <Link href="/orders">Về đơn đăng ký</Link>
      </section>
    );
  if (!data) return <LoadingState label="Đang kiểm tra giữ chỗ và đọc lịch học…" />;
  const selectedId = params.get('unitId');
  const selected = selectedId ? data.units.find((unit) => unit.id === selectedId) : data.units[0];
  return (
    <div className={s.root}>
      <header className={s.detailHeading}>
        <div>
          <p className={s.eyebrow}>XEM TRƯỚC LỚP</p>
          <h1>{data.name}</h1>
          <p>
            Mentor: {data.mentor.displayName ?? 'Chưa có tên hiển thị'} ·{' '}
            {formatCourseDate(data.startDate)} – {formatCourseDate(data.endDate)}
          </p>
        </div>
        <Link href="/orders" className="button button-secondary">
          Đơn đăng ký
        </Link>
      </header>
      <p className="inline-notice">
        Bạn có thể xem học phần, lịch học và phòng khi đơn tiền mặt còn giữ chỗ. Phòng học trực
        tuyến mở sau khi mentor xác nhận thanh toán.
      </p>
      <UnitWorkspace
        title={data.name}
        backHref="/orders"
        backLabel="Đơn đăng ký"
        railLabel="Học phần và lịch học"
        selectionKey={selected?.id ?? selectedId ?? 'empty'}
        rail={
          <ol className={s.syllabus}>
            {data.units.map((unit) => (
              <li key={unit.id}>
                <Link
                  href={`/learning/classes/${id}/preview?unitId=${unit.id}`}
                  aria-current={selected?.id === unit.id ? 'page' : undefined}
                  scroll={false}
                >
                  <span>{String(unit.position).padStart(2, '0')}</span>
                  {unit.title}
                </Link>
              </li>
            ))}
          </ol>
        }
      >
        {!selected ? (
          <p>{selectedId ? 'Học phần không thuộc lớp này.' : 'Lớp chưa có học phần.'}</p>
        ) : (
          <article>
            <h2>{selected.title}</h2>
            {!selected.sessions.length ? (
              <p>Học phần chưa có lịch học.</p>
            ) : (
              selected.sessions.map((session) => (
                <section className="preview-session" key={session.id}>
                  <h3>
                    {session.sessionNumber}. {session.title}
                  </h3>
                  <p>
                    {formatDate(session.startsAt, true)} – {formatDate(session.endsAt, true)}
                  </p>
                  <p>
                    {session.roomName ? `Phòng: ${session.roomName}` : 'Chưa có phòng học.'} ·{' '}
                    {session.status === 'CANCELLED'
                      ? 'Đã hủy'
                      : session.status === 'COMPLETED'
                        ? 'Đã kết thúc'
                        : 'Đã lên lịch'}
                  </p>
                </section>
              ))
            )}
          </article>
        )}
      </UnitWorkspace>
    </div>
  );
}
