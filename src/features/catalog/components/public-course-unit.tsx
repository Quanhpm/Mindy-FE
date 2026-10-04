'use client';

import Link from 'next/link';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import s from '@/shared/components/management.module.css';
import { UnitWorkspace } from '@/shared/components/unit-workspace';
import styles from './public-catalog.module.css';
import { usePublicCourse } from './use-public-course';

export function PublicCourseUnit({ courseId, unitId }: { courseId: string; unitId: string }) {
  const { course, error, retry } = usePublicCourse(courseId);
  if (error)
    return (
      <div className={styles.root}>
        <h1>Đề cương chưa khả dụng</h1>
        <ErrorPanel message={error} retry={retry} />
        <Link className={s.secondaryButton} href="/courses">
          Danh sách khóa học
        </Link>
      </div>
    );
  if (!course) return <LoadingState label="Đang tải đề cương…" />;
  const selected = course.units.find((unit) => unit.id === unitId);
  return (
    <div className={styles.root}>
      <div className={styles.workspaceIntro}>
        <p className={styles.eyebrow}>ĐỀ CƯƠNG CÔNG KHAI / {course.code}</p>
        <h1>{course.title}</h1>
      </div>
      <UnitWorkspace
        title={course.title}
        backHref={`/courses/${courseId}`}
        backLabel="Thông tin khóa học"
        selectionKey={unitId}
        rail={
          course.units.length ? (
            <ol className={styles.syllabus}>
              {course.units.map((unit) => (
                <li key={unit.id}>
                  <Link
                    href={`/courses/${courseId}/units/${unit.id}`}
                    scroll={false}
                    aria-current={unit.id === unitId ? 'page' : undefined}
                  >
                    <span>{String(unit.unitNumber).padStart(2, '0')}</span>
                    {unit.title}
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p>Chưa có học phần công khai.</p>
          )
        }
      >
        {selected ? (
          <article>
            <p className={styles.eyebrow}>HỌC PHẦN {selected.unitNumber}</p>
            <h2>{selected.title}</h2>
            <p>Điểm yêu cầu: {selected.requiredScorePercent}%</p>
            <div className={styles.description}>
              {selected.description || 'Học phần chưa có mô tả.'}
            </div>
          </article>
        ) : (
          <ErrorPanel message="Học phần không thuộc khóa học hoặc không còn khả dụng. Chọn một học phần trong danh sách." />
        )}
      </UnitWorkspace>
    </div>
  );
}
