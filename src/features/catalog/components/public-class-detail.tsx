'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AddToCartButton } from '@/features/cart/client';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import s from '@/shared/components/management.module.css';
import { UnitWorkspace } from '@/shared/components/unit-workspace';
import { formatDate } from '@/shared/lib/date';
import { catalogErrorMessage } from '../api/catalog.browser';
import { getPublicClass, getPublicCourse } from '../api/public-catalog.browser';
import {
  formatCourseDate,
  type PublicClassDetail as PublicClassData,
  type PublicCourseDetail,
} from '../schemas/public-catalog.schema';
import styles from './public-catalog.module.css';

const sessionLabels = {
  SCHEDULED: 'Đã lên lịch',
  COMPLETED: 'Đã kết thúc',
  CANCELLED: 'Đã hủy',
} as const;
export function PublicClassDetail({ id }: { id: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const unitId = params.get('unitId');
  const [data, setData] = useState<{
    classItem: PublicClassData;
    course: PublicCourseDetail;
  } | null>(null);
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision is an explicit retry.
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(undefined);
    void getPublicClass(id, controller.signal)
      .then(async (classItem) => ({
        classItem,
        course: await getPublicCourse(classItem.courseId, controller.signal),
      }))
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(catalogErrorMessage(cause));
      });
    return () => controller.abort();
  }, [id, revision]);
  useEffect(() => {
    if (data && !unitId && data.classItem.units[0])
      router.replace(`/classes/${id}?unitId=${data.classItem.units[0].id}`, { scroll: false });
  }, [data, unitId, id, router]);
  if (error)
    return (
      <div className={styles.root}>
        <h1>Lớp học chưa khả dụng</h1>
        <ErrorPanel message={error} retry={() => setRevision((value) => value + 1)} />
        <Link className={s.secondaryButton} href="/courses">
          Khám phá khóa học
        </Link>
      </div>
    );
  if (!data) return <LoadingState label="Đang tải lớp và lịch học…" />;
  const { classItem, course } = data;
  const selected = classItem.units.find((unit) => unit.id === unitId);
  return (
    <div className={styles.root}>
      <Link className="back-link" href={`/courses/${course.id}`}>
        ← {course.title}
      </Link>
      <header className={styles.detailHeading}>
        <div>
          <p className={styles.eyebrow}>
            {classItem.code} /{' '}
            {classItem.deliveryMode === 'ONLINE' ? 'TRỰC TUYẾN' : 'TẠI TRUNG TÂM'}
          </p>
          <h1>{classItem.name}</h1>
          <div className={styles.metadata}>
            <p>Mentor: {classItem.mentor.displayName ?? 'Chưa có tên hiển thị'}</p>
            <p>
              {formatCourseDate(classItem.startDate)} – {formatCourseDate(classItem.endDate)}
            </p>
            <p>
              {classItem.availableSeats > 0
                ? `Còn ${classItem.availableSeats} chỗ / ${classItem.maxStudents}`
                : 'Lớp đã hết chỗ'}
            </p>
          </div>
        </div>
        <aside className={styles.summary}>
          <p>HỌC PHÍ TRỌN KHÓA</p>
          <strong>{course.priceAmount.toLocaleString('vi-VN')} ₫</strong>
          <div className={styles.cartActionPanel}>
            <AddToCartButton
              classId={id}
              returnTo={`/classes/${id}${unitId ? `?unitId=${unitId}` : ''}`}
              disabled={classItem.availableSeats === 0}
              unavailableReason="Lớp đã hết chỗ."
            />
          </div>
        </aside>
      </header>
      <UnitWorkspace
        title={classItem.name}
        backHref={`/courses/${course.id}`}
        backLabel="Thông tin khóa học"
        railLabel="Học phần và lịch học"
        selectionKey={unitId ?? ''}
        rail={
          classItem.units.length ? (
            <ol className={styles.syllabus}>
              {classItem.units.map((unit) => (
                <li key={unit.id}>
                  <Link
                    href={`/classes/${id}?unitId=${unit.id}`}
                    scroll={false}
                    aria-current={unit.id === unitId ? 'page' : undefined}
                  >
                    <span>{String(unit.position).padStart(2, '0')}</span>
                    {unit.title}
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p>Chưa có học phần trong lịch công khai.</p>
          )
        }
      >
        {classItem.units.length === 0 ? (
          <p>Chưa có lịch học công khai.</p>
        ) : !selected ? (
          <ErrorPanel message="Học phần không thuộc lớp hoặc không còn khả dụng. Chọn một học phần trong danh sách." />
        ) : (
          <article>
            <p className={styles.eyebrow}>HỌC PHẦN {selected.position}</p>
            <h2>{selected.title}</h2>
            {selected.sessions.length === 0 ? (
              <p>Học phần chưa có buổi học trong lịch công khai.</p>
            ) : (
              selected.sessions.map((session) => (
                <section className={styles.schedule} key={session.id}>
                  <h3>
                    Buổi {session.sessionNumber}: {session.title}
                  </h3>
                  <p>
                    {formatDate(session.startsAt, true)} – {formatDate(session.endsAt, true)}
                  </p>
                  <p>
                    {sessionLabels[session.status]}
                    {session.roomName ? ` · Phòng ${session.roomName}` : ''}
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
