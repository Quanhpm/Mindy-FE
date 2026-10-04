'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import s from '@/shared/components/management.module.css';
import { catalogErrorMessage, listAdminCourses, listAllCategories } from '../api/catalog.browser';
import {
  type CourseCategory,
  type CoursePage,
  catalogFiltersSchema,
} from '../schemas/catalog.schema';
import { CatalogPagination } from './catalog-pagination';

export function CoursesManagement() {
  const params = useSearchParams();
  const router = useRouter();
  const filters = catalogFiltersSchema.parse({
    page: params.get('page') ?? 1,
    pageSize: params.get('pageSize') ?? 20,
    categoryId: params.get('categoryId') ?? undefined,
    isActive: params.get('isActive') ?? undefined,
  });
  const query = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.isActive ? { isActive: filters.isActive } : {}),
  }).toString();
  const [data, setData] = useState<CoursePage | null>(null);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [error, setError] = useState<string>();
  const [categoryError, setCategoryError] = useState<string>();
  const [revision, setRevision] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision is an explicit retry.
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(undefined);
    void listAdminCourses(query, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(catalogErrorMessage(cause));
      });
    return () => controller.abort();
  }, [query, revision]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision retries both resources.
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
  function change(key: string, value: string) {
    const next = new URLSearchParams(query);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.set('page', '1');
    router.replace(`/management/courses?${next}`, { scroll: false });
  }
  return (
    <div className={s.page}>
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>MINDY / COURSE JOURNAL</p>
          <h1>Khóa học</h1>
          <p>Xây dựng chương trình học và quản lý trạng thái xuất bản.</p>
        </div>
        <Link className={s.button} href="/management/courses/new">
          Tạo khóa học
        </Link>
      </div>
      <div className={s.toolbar}>
        <div className={s.field}>
          <label htmlFor="course-category-filter">Danh mục</label>
          <select
            id="course-category-filter"
            value={filters.categoryId ?? ''}
            onChange={(event) => change('categoryId', event.target.value)}
          >
            <option value="">Tất cả danh mục</option>
            {filters.categoryId &&
              !categories.some((category) => category.id === filters.categoryId) && (
                <option value={filters.categoryId}>Danh mục đang chọn</option>
              )}
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className={s.field}>
          <label htmlFor="course-active-filter">Trạng thái</label>
          <select
            id="course-active-filter"
            value={filters.isActive ?? ''}
            onChange={(event) => change('isActive', event.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Chưa kích hoạt</option>
          </select>
        </div>
        <div className={s.field}>
          <label htmlFor="course-page-size">Số mục mỗi trang</label>
          <select
            id="course-page-size"
            value={filters.pageSize}
            onChange={(event) => change('pageSize', event.target.value)}
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <Link href="/management/course-categories">Quản lý danh mục</Link>
      </div>
      {categoryError && (
        <ErrorPanel message={categoryError} retry={() => setRevision((value) => value + 1)} />
      )}
      {error ? (
        <ErrorPanel message={error} retry={() => setRevision((value) => value + 1)} />
      ) : !data ? (
        <LoadingState />
      ) : (
        <>
          {data.items.length === 0 ? (
            <p className={s.notice}>
              Chưa có khóa học phù hợp. Hãy thay đổi bộ lọc hoặc tạo khóa học mới.
            </p>
          ) : (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th scope="col">Khóa học</th>
                    <th scope="col">Danh mục</th>
                    <th scope="col">Học phí</th>
                    <th scope="col">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((course) => (
                    <tr key={course.id}>
                      <td>
                        <Link href={`/management/courses/${course.id}`}>{course.title}</Link>
                        <br />
                        <small>{course.code}</small>
                      </td>
                      <td>{course.category.name}</td>
                      <td>{course.priceAmount.toLocaleString('vi-VN')} ₫</td>
                      <td>{course.isActive ? 'Đang hoạt động' : 'Chưa kích hoạt'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <CatalogPagination
            {...data}
            count={data.items.length}
            onPage={(next) => change('page', String(next))}
          />
        </>
      )}
    </div>
  );
}
