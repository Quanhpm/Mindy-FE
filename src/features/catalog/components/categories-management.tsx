'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorPanel, FormError, LoadingState } from '@/shared/components/feedback';
import s from '@/shared/components/management.module.css';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { useUiMutation } from '@/shared/hooks/use-ui-mutation';
import { Icon } from '@/shared/ui/icon';
import {
  catalogErrorMessage,
  createCategory,
  listAllCategories,
  listCategories,
} from '../api/catalog.browser';
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
  const dialog = useRef<HTMLDialogElement>(null);
  const createTrigger = useRef<HTMLButtonElement>(null);
  const query = `page=${page}&pageSize=${pageSize}`;
  const [data, setData] = useState<CategoryPage | null>(null);
  const [error, setError] = useState<string>();
  const mutation = useUiMutation(catalogErrorMessage);
  const [notice, setNotice] = useState<string>();
  const [revision, setRevision] = useState(0);
  const {
    register,
    handleSubmit,
    reset,
    setFocus,
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
    setNotice(undefined);
    await mutation.run(
      (signal) => createCategory(input, signal),
      (category) => {
        dialog.current?.close();
        reset();
        setRevision((value) => value + 1);
        setNotice(`Đã tạo danh mục “${category.name}”.`);
      },
    );
  }
  async function checkResult() {
    await mutation.check(async (signal) => {
      const result = await listAllCategories(signal);
      if (!signal.aborted) setRevision((value) => value + 1);
      return `Đã đọc ${result.length} danh mục. Các danh mục: ${result.map((item) => item.name).join(', ') || 'Chưa có'}.`;
    });
  }

  return (
    <div className={s.page}>
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>MINDY / DANH MỤC</p>
          <h1>Danh mục khóa học</h1>
          <p>Danh mục đang hoạt động để tổ chức chương trình học.</p>
        </div>
        <button
          ref={createTrigger}
          className={s.button}
          type="button"
          aria-haspopup="dialog"
          onClick={() => {
            dialog.current?.showModal();
            setFocus('name');
          }}
        >
          <Icon name="plus" size={18} />
          Tạo danh mục
        </button>
      </div>
      <div className={s.toolbar}>
        <div className={s.field}>
          <label htmlFor="category-page-size">Số mục mỗi trang</label>
          <select
            id="category-page-size"
            value={pageSize}
            onChange={(event) =>
              router.replace(
                `/management/course-categories?page=1&pageSize=${event.target.value}`,
                {
                  scroll: false,
                },
              )
            }
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <Link href="/management/courses">Quản lý khóa học</Link>
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
              Chưa có danh mục đang hoạt động. Nhấn “Tạo danh mục” để thêm danh mục đầu tiên.
            </p>
          ) : (
            <div className={s.tableWrap}>
              <table
                className={`${s.table} ${styles.categoryTable}`}
                aria-label="Danh mục khóa học"
              >
                <thead>
                  <tr>
                    <th scope="col">Tên danh mục</th>
                    <th scope="col">Tên định danh</th>
                    <th scope="col">Mô tả</th>
                    <th scope="col">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((category) => (
                    <tr key={category.id}>
                      <td>
                        <strong>{category.name}</strong>
                      </td>
                      <td>{category.slug}</td>
                      <td className={styles.categoryDescription}>
                        {category.description || 'Chưa có mô tả'}
                      </td>
                      <td>{category.isActive ? 'Đang hoạt động' : 'Chưa kích hoạt'}</td>
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
      <dialog
        ref={dialog}
        className={`confirm-dialog ${styles.categoryDialog}`}
        aria-labelledby="category-create-title"
        aria-describedby="category-create-description"
        onCancel={(event) => {
          if (mutation.busy || isSubmitting) event.preventDefault();
        }}
        onClose={() => createTrigger.current?.focus()}
      >
        <div className={styles.dialogHeading}>
          <h2 id="category-create-title">Tạo danh mục</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Đóng tạo danh mục"
            disabled={mutation.busy || isSubmitting}
            onClick={() => dialog.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <p id="category-create-description">Danh mục mới sẽ được kích hoạt ngay.</p>
        <form className={styles.form} onSubmit={handleSubmit(submit)} noValidate>
          <div className={s.field}>
            <label htmlFor="category-name">Tên danh mục *</label>
            <input
              id="category-name"
              disabled={mutation.busy}
              aria-invalid={Boolean(errors.name)}
              aria-describedby="category-name-error"
              {...register('name')}
            />
            <div id="category-name-error">
              <FormError message={errors.name?.message} />
            </div>
          </div>
          <div className={s.field}>
            <label htmlFor="category-slug">Tên định danh</label>
            <input
              id="category-slug"
              placeholder="lap-trinh-web"
              disabled={mutation.busy}
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
              disabled={mutation.busy}
              aria-invalid={Boolean(errors.description)}
              aria-describedby="category-description-error"
              {...register('description')}
            />
            <div id="category-description-error">
              <FormError message={errors.description?.message} />
            </div>
          </div>
          <MutationFeedback mutation={mutation} onCheck={() => void checkResult()} />
          <div className="form-actions">
            <button
              className={s.secondaryButton}
              type="button"
              disabled={mutation.busy || isSubmitting}
              onClick={() => dialog.current?.close()}
            >
              Hủy
            </button>
            <button className={s.button} type="submit" disabled={isSubmitting || mutation.blocked}>
              {isSubmitting ? 'Đang tạo…' : 'Tạo danh mục'}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
