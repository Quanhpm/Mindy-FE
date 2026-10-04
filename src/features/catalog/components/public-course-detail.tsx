'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import s from '@/shared/components/management.module.css';
import { catalogErrorMessage } from '../api/catalog.browser';
import { listPublicCourseClasses } from '../api/public-catalog.browser';
import {
  type BrowseFilterFormInput,
  browseQuery,
  isBrowseRangeValid,
  type PublicClassPage,
  publicBrowseFiltersSchema,
} from '../schemas/public-catalog.schema';
import { CatalogPagination } from './catalog-pagination';
import { PublicBrowseFiltersForm } from './public-browse-filters';
import styles from './public-catalog.module.css';
import { PublicClassCard } from './public-class-card';
import { usePublicCourse } from './use-public-course';

export function PublicCourseDetail({ id }: { id: string }) {
  const { course, error, retry } = usePublicCourse(id);
  const params = useSearchParams();
  const router = useRouter();
  const filters = publicBrowseFiltersSchema.parse(Object.fromEntries(params));
  const query = browseQuery(filters, false);
  const validRange = isBrowseRangeValid(filters);
  const [classes, setClasses] = useState<PublicClassPage | null>(null);
  const [classesError, setClassesError] = useState<string>();
  const [revision, setRevision] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision retries only the class list.
  useEffect(() => {
    const controller = new AbortController();
    setClasses(null);
    setClassesError(undefined);
    if (validRange)
      void listPublicCourseClasses(id, query, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) setClasses(data);
        })
        .catch((cause: unknown) => {
          if (!controller.signal.aborted) setClassesError(catalogErrorMessage(cause));
        });
    return () => controller.abort();
  }, [id, query, validRange, revision]);
  function apply(fields: BrowseFilterFormInput) {
    router.replace(
      `/courses/${id}?${browseQuery({ ...filters, page: 1, deliveryMode: fields.deliveryMode || undefined, startsFrom: fields.startsFrom || undefined, startsTo: fields.startsTo || undefined }, false)}`,
      { scroll: false },
    );
  }
  if (error)
    return (
      <div className={styles.root}>
        <h1>Khóa học chưa khả dụng</h1>
        <ErrorPanel message={error} retry={retry} />
        <Link className={s.secondaryButton} href="/courses">
          Danh sách khóa học
        </Link>
      </div>
    );
  if (!course) return <LoadingState label="Đang tải khóa học…" />;
  return (
    <div className={styles.root}>
      <Link className="back-link" href="/courses">
        ← Danh sách khóa học
      </Link>
      <header className={styles.detailHeading}>
        <div>
          <p className={styles.eyebrow}>
            {course.category.name} / {course.code}
          </p>
          <h1>{course.title}</h1>
          <div className={styles.description}>
            {course.description || 'Khóa học chưa có mô tả.'}
          </div>
        </div>
        <aside className={styles.summary}>
          <p>HỌC PHÍ TRỌN KHÓA</p>
          <strong>{course.priceAmount.toLocaleString('vi-VN')} ₫</strong>
          <p>{course.units.length} học phần trong đề cương</p>
          <a href="#open-classes" className={styles.summaryLink}>
            Chọn lớp phù hợp
          </a>
        </aside>
      </header>
      <section className={styles.section} aria-labelledby="syllabus-title">
        <p className={styles.eyebrow}>COURSE CONTENTS</p>
        <h2 id="syllabus-title">Đề cương khóa học</h2>
        {course.units.length === 0 ? (
          <p className={s.notice}>Khóa học chưa có học phần công khai.</p>
        ) : (
          <ol className={styles.syllabus}>
            {course.units.map((unit) => (
              <li key={unit.id}>
                <Link href={`/courses/${id}/units/${unit.id}`}>
                  <span>{String(unit.unitNumber).padStart(2, '0')}</span>
                  {unit.title}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
      <section id="open-classes" className={styles.section} aria-labelledby="open-class-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>CHỌN LỊCH HỌC CỦA BẠN</p>
            <h2 id="open-class-title">Lớp đang mở</h2>
          </div>
          {classes && <span>{classes.total} lớp phù hợp</span>}
        </div>
        <PublicBrowseFiltersForm filters={filters} onApply={apply} />
        {!validRange ? (
          <ErrorPanel message="Ngày kết thúc bộ lọc phải từ ngày bắt đầu trở đi. Điều chỉnh bộ lọc để tiếp tục." />
        ) : classesError ? (
          <ErrorPanel message={classesError} retry={() => setRevision((value) => value + 1)} />
        ) : !classes ? (
          <LoadingState label="Đang tải các lớp…" />
        ) : (
          <>
            {classes.items.length === 0 ? (
              <p className={s.notice}>
                Chưa có lớp đang mở phù hợp. Hãy thử một hình thức hoặc khoảng ngày khác.
              </p>
            ) : (
              <div className={styles.classGrid}>
                {classes.items.map((item) => (
                  <PublicClassCard
                    key={item.id}
                    item={item}
                    priceAmount={course.priceAmount}
                    returnTo={`/courses/${id}?${query}`}
                  />
                ))}
              </div>
            )}
            <CatalogPagination
              {...classes}
              count={classes.items.length}
              onPage={(page) =>
                router.replace(`/courses/${id}?${browseQuery({ ...filters, page }, false)}`, {
                  scroll: false,
                })
              }
            />
          </>
        )}
      </section>
    </div>
  );
}
