'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import s from '@/shared/components/management.module.css';
import { Icon } from '@/shared/ui/icon';
import { catalogErrorMessage, listAllCategories } from '../api/catalog.browser';
import { listPublicCourses } from '../api/public-catalog.browser';
import type { CourseCategory } from '../schemas/catalog.schema';
import {
  type BrowseFilterFormInput,
  browseQuery,
  isBrowseRangeValid,
  type PublicCoursePage,
  publicBrowseFiltersSchema,
} from '../schemas/public-catalog.schema';
import { CatalogPagination } from './catalog-pagination';
import { CourseImage } from './course-image';
import { PublicBrowseFiltersForm } from './public-browse-filters';
import styles from './public-catalog.module.css';

export function PublicCourses() {
  const router = useRouter();
  const params = useSearchParams();
  const filters = publicBrowseFiltersSchema.parse(Object.fromEntries(params));
  const query = browseQuery(filters, true);
  const validRange = isBrowseRangeValid(filters);
  const [data, setData] = useState<PublicCoursePage | null>(null);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [error, setError] = useState<string>();
  const [categoryError, setCategoryError] = useState<string>();
  const [revision, setRevision] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision triggers explicit retry.
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(undefined);
    if (validRange)
      void listPublicCourses(query, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) setData(result);
        })
        .catch((cause: unknown) => {
          if (!controller.signal.aborted) setError(catalogErrorMessage(cause));
        });
    return () => controller.abort();
  }, [query, validRange, revision]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision retries categories.
  useEffect(() => {
    const controller = new AbortController();
    setCategoryError(undefined);
    void listAllCategories(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setCategories(result);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setCategoryError(catalogErrorMessage(cause));
      });
    return () => controller.abort();
  }, [revision]);
  function apply(fields: BrowseFilterFormInput) {
    router.replace(
      `/courses?${browseQuery({ ...filters, page: 1, categoryId: fields.categoryId || undefined, deliveryMode: fields.deliveryMode || undefined, startsFrom: fields.startsFrom || undefined, startsTo: fields.startsTo || undefined }, true)}`,
      { scroll: false },
    );
  }
  return (
    <div className={styles.root}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>CHỌN ĐIỀU BẠN MUỐN HỌC</p>
          <h1>
            Học điều mới.
            <br />
            <span>Mở thêm một lối đi.</span>
          </h1>
          <p>Khám phá chương trình học và chọn lớp phù hợp với lịch của bạn.</p>
          <a className="back-link" href="#course-list">
            Khám phá khóa học <Icon name="arrow" size={18} />
          </a>
        </div>
        <aside className={styles.summary}>
          <p>HỌC CÙNG MINDY</p>
          <h2>
            Một lộ trình rõ ràng.
            <br />
            Một người đồng hành.
          </h2>
          <p>Xem đề cương, mentor và lịch học trước khi chọn lớp.</p>
          <a href="#course-list" className={styles.summaryLink}>
            Tìm điểm bắt đầu <Icon name="arrow" size={18} />
          </a>
        </aside>
      </section>
      <section id="course-list" aria-labelledby="course-list-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>MỖI KHÓA HỌC, MỘT CHƯƠNG MỚI</p>
            <h2 id="course-list-title">Tìm điểm bắt đầu của bạn.</h2>
          </div>
          {data && <span>{data.total} khóa học phù hợp</span>}
        </div>
        <PublicBrowseFiltersForm
          filters={filters}
          categories={categories}
          includeCategory
          onApply={apply}
        />
        {categoryError && (
          <ErrorPanel message={categoryError} retry={() => setRevision((value) => value + 1)} />
        )}
        {!validRange ? (
          <ErrorPanel message="Ngày kết thúc bộ lọc phải từ ngày bắt đầu trở đi. Điều chỉnh bộ lọc để tiếp tục." />
        ) : error ? (
          <ErrorPanel message={error} retry={() => setRevision((value) => value + 1)} />
        ) : !data ? (
          <LoadingState label="Đang tải khóa học…" />
        ) : (
          <>
            {data.items.length === 0 ? (
              <p className={s.notice}>
                Chưa có khóa học phù hợp. Thử mở rộng danh mục, hình thức hoặc khoảng ngày.
              </p>
            ) : (
              <div className={styles.grid}>
                {data.items.map((course) => (
                  <article className={styles.card} key={course.id}>
                    <CourseImage src={course.imgUrl} title={course.title} code={course.code} />
                    <p className={styles.eyebrow}>{course.category.name}</p>
                    <h3>
                      <Link href={`/courses/${course.id}`}>{course.title}</Link>
                    </h3>
                    <p>{course.description || 'Xem đề cương để khám phá chương trình học.'}</p>
                    <p className={styles.price}>{course.priceAmount.toLocaleString('vi-VN')} ₫</p>
                    <Link className={s.secondaryButton} href={`/courses/${course.id}`}>
                      Xem khóa học <Icon name="arrow" size={16} />
                    </Link>
                  </article>
                ))}
              </div>
            )}
            <CatalogPagination
              {...data}
              count={data.items.length}
              onPage={(page) =>
                router.replace(`/courses?${browseQuery({ ...filters, page }, true)}`, {
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
