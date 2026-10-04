'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { type CourseManagement, listActiveAdminCourses } from '@/features/catalog/client';
import { listAllActiveMentors } from '@/features/users/client';
import type { User } from '@/shared/api/contracts/identity';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import styles from '@/shared/components/management.module.css';
import { ApiError } from '@/shared/lib/http/api-error';
import { createClass } from '../api/classes.browser';
import { classErrorMessage } from '../domain/class-rules';
import type { CreateClassInput } from '../schemas/class.schema';
import { ClassForm } from './class-form';

export function CreateClassForm() {
  const router = useRouter();
  const [options, setOptions] = useState<{ courses: CourseManagement[]; mentors: User[] }>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [choicesError, setChoicesError] = useState<string>();
  const choicesController = useRef<AbortController | null>(null);
  async function refreshChoices() {
    choicesController.current?.abort();
    const controller = new AbortController();
    choicesController.current = controller;
    setLoading(true);
    setChoicesError(undefined);
    try {
      const [courses, mentors] = await Promise.all([
        listActiveAdminCourses(controller.signal),
        listAllActiveMentors(controller.signal),
      ]);
      if (!controller.signal.aborted) setOptions({ courses, mentors });
    } catch (failure) {
      if (!controller.signal.aborted) setChoicesError(classErrorMessage(failure));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: Load once; explicit refresh owns and replaces its abortable request.
  useEffect(() => {
    void refreshChoices();
    return () => choicesController.current?.abort();
  }, []);
  async function submit(values: CreateClassInput) {
    if (busy || loading || choicesError || !options) return null;
    if (
      !options.courses.some((course) => course.id === values.courseId) ||
      !options.mentors.some((mentor) => mentor.id === values.mentorId)
    ) {
      setError('Chọn khóa học và mentor đang hoạt động trước khi tạo lớp.');
      return null;
    }
    setBusy(true);
    setError(undefined);
    try {
      const detail = await createClass(values);
      router.push(`/management/classes/${detail.id}`);
      return detail;
    } catch (failure) {
      setError(classErrorMessage(failure));
      if (
        failure instanceof ApiError &&
        (failure.status === 409 ||
          (failure.status === 422 && failure.code === 'CLASS_MENTOR_NOT_ELIGIBLE'))
      )
        await refreshChoices();
      return null;
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.page}>
      <p className={styles.eyebrow}>MINDY / QUẢN TRỊ LỚP</p>
      <div className={styles.heading}>
        <h1>Tạo lớp học.</h1>
        <Link href="/management/classes" className={styles.secondaryButton}>
          Danh sách lớp
        </Link>
      </div>
      <p className={styles.notice}>
        Lớp mới ở trạng thái bản nháp. Học phần được sao chép từ khóa học; xếp lịch trước khi mở
        tuyển sinh.
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={loading || busy}
          onClick={() => void refreshChoices()}
        >
          Tải lại lựa chọn
        </button>
        <p className="muted">Tải lại danh sách giữ nguyên thông tin lớp đã nhập.</p>
      </div>
      {loading && <LoadingState label="Đang tải khóa học và mentor…" />}
      {choicesError && <ErrorPanel message={`Không thể tải danh sách lựa chọn. ${choicesError}`} />}
      {error && <ErrorPanel message={error} />}
      {!loading &&
        !choicesError &&
        options &&
        (options.courses.length === 0 || options.mentors.length === 0) && (
          <div className={styles.panel}>
            <p>
              {options.courses.length === 0
                ? 'Chưa có khóa học đang hoạt động.'
                : 'Chưa có mentor đang hoạt động.'}
            </p>
            <Link
              href={options.courses.length === 0 ? '/management/courses' : '/management/users'}
              className={styles.secondaryButton}
            >
              Mở trang quản trị
            </Link>
          </div>
        )}
      <ClassForm
        courses={options?.courses ?? []}
        mentors={options?.mentors ?? []}
        choicesReady={Boolean(options && !loading && !choicesError)}
        busy={busy}
        onSubmit={submit}
      />
    </section>
  );
}
