'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorPanel, FormError, LoadingState } from '@/shared/components/feedback';
import s from '@/shared/components/management.module.css';
import { catalogErrorMessage, createCategory, listCategories } from '../api/catalog.browser';
import {
  type CategoryInput,
  type CategoryPage,
  catalogFiltersSchema,
  categoryInputSchema,
} from '../schemas/catalog.schema';
import styles from './catalog.module.css';
import { CatalogPagination } from './catalog-pagination';

export function CategoriesManagement() {
  const params = useSearchParams();
  const router = useRouter();
  const { page, pageSize } = catalogFiltersSchema.parse({
    page: params.get('page') ?? 1,
    pageSize: params.get('pageSize') ?? 20,
  });
  const query = `page=${page}&pageSize=${pageSize}`;
  const [data, setData] = useState<CategoryPage | null>(null);
  const [error, setError] = useState<string>();
  const [mutationError, setMutationError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [revision, setRevision] = useState(0);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categoryInputSchema),
    defaultValues: { name: '', slug: '', description: '' },
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision is an explicit refetch trigger.
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(undefined);
    void listCategories(query, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(catalogErrorMessage(cause));
      });
    return () => controller.abort();
  }, [query, revision]);
  async function submit(input: CategoryInput) {
    setMutationError(undefined);
    setNotice(undefined);
    try {
      const category = await createCategory(input);
      reset();
      setRevision((value) => value + 1);
      setNotice(`Đã tạo danh mục “${category.name}”.`);
    } catch (cause) {
      setMutationError(catalogErrorMessage(cause));
    }
  }
  return (
    <div className={s.page}>
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>MINDY / CATALOG</p>
          <h1>Danh mục khóa học</h1>
          <p>Danh mục đang hoạt động để tổ chức chương trình học.</p>
        </div>
        <Link className={s.secondaryButton} href="/management/courses">
          Quản lý khóa học
        </Link>
      </div>
      {notice && (
        <p role="status" className={s.notice}>
          {notice}
        </p>
      )}
      {error ? (
        <ErrorPanel message={error} retry={() => setRevision((value) => value + 1)} />
      ) : !data ? (
        <LoadingState />
      ) : (
        <>
          {data.items.length === 0 ? (
            <p className={s.notice}>
              Chưa có danh mục đang hoạt động. Tạo danh mục đầu tiên bên dưới.
            </p>
          ) : (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th scope="col">Tên danh mục</th>
                    <th scope="col">Slug</th>
                    <th scope="col">Mô tả</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((category) => (
                    <tr key={category.id}>
                      <td>{category.name}</td>
                      <td>{category.slug}</td>
                      <td>{category.description || 'Chưa có mô tả'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <CatalogPagination
            {...data}
            count={data.items.length}
            onPage={(next) =>
              router.replace(`/management/course-categories?page=${next}&pageSize=${pageSize}`, {
                scroll: false,
              })
            }
          />
        </>
      )}
      <section className={styles.section} aria-labelledby="category-create-title">
        <h2 id="category-create-title">Tạo danh mục</h2>
        <p>Danh mục mới sẽ được kích hoạt ngay.</p>
        <form className={styles.form} onSubmit={handleSubmit(submit)} noValidate>
          <div className={s.field}>
            <label htmlFor="category-name">Tên danh mục *</label>
            <input
              id="category-name"
              aria-invalid={Boolean(errors.name)}
              aria-describedby="category-name-error"
              {...register('name')}
            />
            <div id="category-name-error">
              <FormError message={errors.name?.message} />
            </div>
          </div>
          <div className={s.field}>
            <label htmlFor="category-slug">Slug</label>
            <input
              id="category-slug"
              placeholder="lap-trinh-web"
              aria-invalid={Boolean(errors.slug)}
              aria-describedby="category-slug-error"
              {...register('slug')}
            />
            <span>Để trống để hệ thống tạo từ tên.</span>
            <div id="category-slug-error">
              <FormError message={errors.slug?.message} />
            </div>
          </div>
          <div className={s.field}>
            <label htmlFor="category-description">Mô tả</label>
            <textarea
              id="category-description"
              rows={4}
              aria-invalid={Boolean(errors.description)}
              aria-describedby="category-description-error"
              {...register('description')}
            />
            <div id="category-description-error">
              <FormError message={errors.description?.message} />
            </div>
          </div>
          {mutationError && <ErrorPanel message={mutationError} />}
          <div className={s.actions}>
            <button className={s.button} type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang tạo…' : 'Tạo danh mục'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
