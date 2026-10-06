'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import { Icon } from '@/shared/ui/icon';
import { catalogErrorMessage } from '../api/catalog.browser';
import { listPublicCourses } from '../api/public-catalog.browser';
import type { PublicCoursePage } from '../schemas/public-catalog.schema';
import { CourseImage } from './course-image';
import s from './public-catalog.module.css';

export function FeaturedCourses() {
  const [data, setData] = useState<PublicCoursePage | null>(null);
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision is an explicit retry.
  useEffect(() => {
    const controller = new AbortController();
    setError(undefined);
    void listPublicCourses('page=1&pageSize=4', controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(catalogErrorMessage(cause));
      });
    return () => controller.abort();
  }, [revision]);
  if (error) return <ErrorPanel message={error} retry={() => setRevision((value) => value + 1)} />;
  if (!data) return <LoadingState label="Đang tải khóa học…" />;
  if (!data.items.length)
    return (
      <div className={s.emptyCourses}>
        <Icon name="book" size={28} />
        <h3>Chương mới đang được chuẩn bị.</h3>
        <p>Các khóa học sẽ xuất hiện tại đây khi được mở.</p>
      </div>
    );
  return (
    <div className={s.featuredGrid}>
      {data.items.slice(0, 4).map((course) => (
        <article className={s.card} key={course.id}>
          <Link href={`/courses/${course.id}`} aria-label={`Xem khóa học ${course.title}`}>
            <CourseImage src={course.imgUrl} title={course.title} code={course.code} />
          </Link>
          <p className={s.eyebrow}>{course.category.name}</p>
          <h3>
            <Link href={`/courses/${course.id}`}>{course.title}</Link>
          </h3>
          <p className={s.description}>
            {course.description || 'Khám phá đề cương và lịch học của khóa học.'}
          </p>
          <div className={s.cardBottom}>
            <strong>{course.priceAmount.toLocaleString('vi-VN')} ₫</strong>
            <Link href={`/courses/${course.id}`} aria-label={`Chi tiết ${course.title}`}>
              <Icon name="arrow" size={18} />
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
