'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { type CourseManagement, listActiveAdminCourses } from '@/features/catalog/client';
import { listAllActiveMentors } from '@/features/users/client';
import type { User } from '@/shared/api/contracts/identity';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import styles from '@/shared/components/management.module.css';
import { listClasses } from '../api/classes.browser';
import {
  classErrorMessage,
  classStatusLabels,
  deliveryModeLabels,
  formatCalendarDate,
} from '../domain/class-rules';
import {
  classStatusSchema,
  deliveryModeSchema,
  type ManagementClassPage,
} from '../schemas/class.schema';

export function ClassesList() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const pageInput = Number(params.get('page') ?? 1);
  const page = Number.isSafeInteger(pageInput) && pageInput > 0 ? pageInput : 1;
  const status = classStatusSchema.safeParse(params.get('status'));
  const mode = deliveryModeSchema.safeParse(params.get('deliveryMode'));
  const query = new URLSearchParams({ page: String(page), pageSize: '20' });
  if (status.success) query.set('status', status.data);
  if (mode.success) query.set('deliveryMode', mode.data);
  for (const name of ['courseId', 'mentorId']) {
    const id = z.uuid({ version: 'v4' }).safeParse(params.get(name));
    if (id.success) query.set(name, id.data);
  }
  const queryString = query.toString();
  const courseId = query.get('courseId') ?? '';
  const mentorId = query.get('mentorId') ?? '';
  const [data, setData] = useState<ManagementClassPage>();
  const [choices, setChoices] = useState<{ courses: CourseManagement[]; mentors: User[] }>({
    courses: [],
    mentors: [],
  });
  const [choicesLoading, setChoicesLoading] = useState(true);
  const [choicesError, setChoicesError] = useState<string>();
  const [choicesRetry, setChoicesRetry] = useState(0);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: choicesRetry retries the pickers without changing the list or filters.
  useEffect(() => {
    const controller = new AbortController();
    setChoicesLoading(true);
    setChoicesError(undefined);
    Promise.all([
      listActiveAdminCourses(controller.signal),
      listAllActiveMentors(controller.signal),
    ])
      .then(([courses, mentors]) => {
        if (!controller.signal.aborted) setChoices({ courses, mentors });
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) setChoicesError(classErrorMessage(failure));
      })
      .finally(() => {
        if (!controller.signal.aborted) setChoicesLoading(false);
      });
    return () => controller.abort();
  }, [choicesRetry]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: retry triggers a deliberate data reload.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    setData(undefined);
    listClasses(queryString, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) setData(response);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) setError(classErrorMessage(failure));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [queryString, retry]);
  function filter(name: string, value: string) {
    const next = new URLSearchParams(queryString);
    next.delete('pageSize');
    next.set('page', '1');
    if (value) next.set(name, value);
    else next.delete(name);
    router.push(`${pathname}?${next}`);
  }
  function pageHref(nextPage: number) {
    const next = new URLSearchParams(queryString);
    next.delete('pageSize');
    next.set('page', String(nextPage));
    return `${pathname}?${next}`;
  }
  return (
    <section className={styles.page}>
      <p className={styles.eyebrow}>MINDY / QUẢN TRỊ LỚP</p>
      <div className={styles.heading}>
        <h1>Lớp học.</h1>
        <Link href="/management/classes/new" className={styles.button}>
          Tạo lớp
        </Link>
      </div>
      <div className={styles.toolbar}>
        <div className={styles.field}>
          <label htmlFor="class-course-filter">Khóa học</label>
          <select
            id="class-course-filter"
            value={courseId}
            disabled={choicesLoading}
            onChange={(event) => filter('courseId', event.target.value)}
          >
            <option value="">Tất cả khóa học</option>
            {courseId && !choices.courses.some((course) => course.id === courseId) && (
              <option value={courseId}>Đã chọn · {courseId}</option>
            )}
            {choices.courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} · {course.title}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="class-mentor-filter">Mentor</label>
          <select
            id="class-mentor-filter"
            value={mentorId}
            disabled={choicesLoading}
            onChange={(event) => filter('mentorId', event.target.value)}
          >
            <option value="">Tất cả mentor</option>
            {mentorId && !choices.mentors.some((mentor) => mentor.id === mentorId) && (
              <option value={mentorId}>Đã chọn · {mentorId}</option>
            )}
            {choices.mentors.map((mentor) => (
              <option key={mentor.id} value={mentor.id}>
                {mentor.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="class-status-filter">Trạng thái</label>
          <select
            id="class-status-filter"
            value={status.success ? status.data : ''}
            onChange={(event) => filter('status', event.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(classStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="class-mode-filter">Hình thức học</label>
          <select
            id="class-mode-filter"
            value={mode.success ? mode.data : ''}
            onChange={(event) => filter('deliveryMode', event.target.value)}
          >
            <option value="">Tất cả hình thức</option>
            {Object.entries(deliveryModeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {choicesLoading && <LoadingState label="Đang tải bộ lọc khóa học và mentor…" />}
      {choicesError && (
        <ErrorPanel
          message={`Chưa tải được lựa chọn bộ lọc. ${choicesError}`}
          retry={() => setChoicesRetry((value) => value + 1)}
        />
      )}
      {!choicesLoading && !choicesError && (
        <p className="muted">
          Danh sách lựa chọn gồm khóa học và mentor đang hoạt động. Bộ lọc đã có trên URL vẫn được
          giữ.
        </p>
      )}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorPanel message={error} retry={() => setRetry((value) => value + 1)} />
      ) : (
        data && (
          <>
            {data.items.length === 0 ? (
              <p className={styles.notice}>Chưa có lớp phù hợp với bộ lọc.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <caption className="sr-only">Danh sách lớp học</caption>
                  <thead>
                    <tr>
                      <th>Lớp học</th>
                      <th>Mentor</th>
                      <th>Thời gian</th>
                      <th>Hình thức</th>
                      <th>Trạng thái</th>
                      <th>Chỗ trống</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Link href={`/management/classes/${item.id}`}>{item.name}</Link>
                          <br />
                          <small>{item.code}</small>
                        </td>
                        <td>{item.mentor.displayName ?? 'Chưa có tên'}</td>
                        <td>
                          {formatCalendarDate(item.startDate)} – {formatCalendarDate(item.endDate)}
                        </td>
                        <td>{deliveryModeLabels[item.deliveryMode]}</td>
                        <td>{classStatusLabels[item.status]}</td>
                        <td>
                          {item.availableSeats} / {item.maxStudents}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <nav className={styles.pagination} aria-label="Phân trang lớp học">
              <span>
                {data.total} lớp · Trang {data.page} /{' '}
                {Math.max(1, Math.ceil(data.total / data.pageSize))}
              </span>
              {data.page > 1 && (
                <Link className={styles.secondaryButton} href={pageHref(data.page - 1)}>
                  Trang trước
                </Link>
              )}
              {data.page * data.pageSize < data.total && (
                <Link className={styles.secondaryButton} href={pageHref(data.page + 1)}>
                  Trang sau
                </Link>
              )}
            </nav>
          </>
        )
      )}
    </section>
  );
}
