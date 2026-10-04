'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import s from '@/shared/components/management.module.css';
import { catalogErrorMessage, listAllCategories } from '../api/catalog.browser';
import type { CourseCategory } from '../schemas/catalog.schema';
import { CourseFieldsForm } from './course-fields-form';

export function CourseCreateForm() {
  const router = useRouter();
  const [categories, setCategories] = useState<CourseCategory[] | null>(null);
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision triggers explicit retry.
  useEffect(() => {
    const controller = new AbortController();
    setError(undefined);
    setCategories(null);
    void listAllCategories(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setCategories(result);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(catalogErrorMessage(cause));
      });
    return () => controller.abort();
  }, [revision]);
  return (
    <div className={s.page}>
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>MINDY / NEW COURSE</p>
          <h1>Tạo khóa học</h1>
          <p>Khóa học mới chưa kích hoạt. Thêm học phần, sau đó kích hoạt để dùng cho lớp học.</p>
        </div>
      </div>
      {error ? (
        <ErrorPanel message={error} retry={() => setRevision((value) => value + 1)} />
      ) : !categories ? (
        <LoadingState />
      ) : (
        <>
          {categories.length === 0 && (
            <p className={s.notice}>
              Cần một danh mục đang hoạt động.{' '}
              <Link href="/management/course-categories">Tạo danh mục</Link>.
            </p>
          )}
          <CourseFieldsForm
            categories={categories}
            onSaved={(course) => router.replace(`/management/courses/${course.id}?created=1`)}
          />
        </>
      )}
    </div>
  );
}
