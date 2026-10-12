'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { FormError } from '@/shared/components/feedback';
import s from '@/shared/components/management.module.css';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { useUiMutation } from '@/shared/hooks/use-ui-mutation';
import {
  catalogErrorMessage,
  createCourse,
  getAdminCourse,
  listAdminCourses,
  updateCourse,
} from '../api/catalog.browser';
import {
  type CourseCategory,
  type CourseCreateInput,
  type CourseDetail,
  courseCreateSchema,
} from '../schemas/catalog.schema';
import styles from './catalog.module.css';

export function CourseFieldsForm({
  disabled = false,
  onBusyChange,
  categories,
  course,
  onSaved,
  onChecked,
  onConflict,
}: {
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  categories: CourseCategory[];
  course?: CourseDetail;
  onSaved: (course: CourseDetail) => void;
  onChecked?: (course: CourseDetail) => void;
  onConflict?: (error: unknown, signal?: AbortSignal) => Promise<void>;
}) {
  const mutation = useUiMutation(catalogErrorMessage);
  useEffect(() => {
    onBusyChange?.(mutation.blocked);
    return () => onBusyChange?.(false);
  }, [onBusyChange, mutation.blocked]);
  const {
    register,
    getValues,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<CourseCreateInput>({
    resolver: zodResolver(courseCreateSchema),
    defaultValues: {
      categoryId: course?.category.id ?? '',
      code: course?.code ?? '',
      title: course?.title ?? '',
      description: course?.description ?? '',
      imgUrl: course?.imgUrl ?? '',
      priceAmount: course?.priceAmount ?? 0,
    },
  });
  async function submit(input: CourseCreateInput) {
    if (disabled) return;
    const { code: _code, imgUrl, ...rest } = input;
    const fields = { ...rest, ...(dirtyFields.imgUrl ? { imgUrl } : {}) };
    await mutation.run(
      (signal) => (course ? updateCourse(course.id, fields, signal) : createCourse(input, signal)),
      (saved) => {
        reset({ ...input, imgUrl: saved.imgUrl ?? '' });
        onSaved(saved);
      },
      async (cause, signal) => {
        await onConflict?.(cause, signal);
      },
    );
  }
  async function checkResult() {
    await mutation.check(async (signal) => {
      if (course) {
        const current = await getAdminCourse(course.id, signal);
        if (!signal.aborted) onChecked?.(current);
        return `Dữ liệu hiện tại: ${current.title} · ${current.priceAmount.toLocaleString('vi-VN')} ₫ · ${current.description || 'Chưa có mô tả'} · Ảnh: ${current.imgUrl || 'Chưa có'}.`;
      }
      const result = await listAdminCourses('page=1&pageSize=100', signal);
      const found = result.items.find((item) => item.code === getValues('code').trim());
      return found
        ? `Đã tìm thấy khóa ${found.code} · ${found.title}. Kiểm tra danh sách trước khi tạo lại.`
        : `Đã đọc ${result.items.length} khóa mới nhất. Kiểm tra danh sách trước khi tạo lại.`;
    });
  }

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit(submit)}>
      <div className={styles.grid}>
        <div className={s.field}>
          <label htmlFor="course-code">Mã khóa học *</label>
          <input
            id="course-code"
            readOnly={Boolean(course)}
            disabled={mutation.busy}
            aria-invalid={Boolean(errors.code)}
            aria-describedby="course-code-error"
            {...register('code')}
          />
          <div id="course-code-error">
            <FormError message={errors.code?.message} />
          </div>
          {course && <span>Mã được giữ cố định sau khi tạo.</span>}
        </div>
        <div className={s.field}>
          <label htmlFor="course-category">Danh mục *</label>
          <select
            id="course-category"
            disabled={mutation.busy}
            aria-invalid={Boolean(errors.categoryId)}
            aria-describedby="course-category-error"
            {...register('categoryId')}
          >
            <option value="">Chọn danh mục</option>
            {course && !categories.some((category) => category.id === course.category.id) && (
              <option value={course.category.id}>{course.category.name}</option>
            )}
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <div id="course-category-error">
            <FormError message={errors.categoryId?.message} />
          </div>
        </div>
      </div>
      <div className={s.field}>
        <label htmlFor="course-title">Tên khóa học *</label>
        <input
          id="course-title"
          disabled={mutation.busy}
          aria-invalid={Boolean(errors.title)}
          aria-describedby="course-title-error"
          {...register('title')}
        />
        <div id="course-title-error">
          <FormError message={errors.title?.message} />
        </div>
      </div>
      <div className={s.field}>
        <label htmlFor="course-price">Học phí (VND) *</label>
        <input
          id="course-price"
          type="number"
          min={0}
          max={1_000_000_000_000}
          step={1}
          disabled={mutation.busy}
          aria-invalid={Boolean(errors.priceAmount)}
          aria-describedby="course-price-error"
          {...register('priceAmount', { valueAsNumber: true })}
        />
        <div id="course-price-error">
          <FormError message={errors.priceAmount?.message} />
        </div>
        <span>
          {course
            ? 'Giá mới áp dụng cho những lần thanh toán tiếp theo.'
            : 'Nhập số tiền nguyên, từ 0 VND.'}
        </span>
      </div>
      <div className={s.field}>
        <label htmlFor="course-description">Mô tả</label>
        <textarea
          id="course-description"
          rows={7}
          disabled={mutation.busy}
          aria-invalid={Boolean(errors.description)}
          aria-describedby="course-description-error"
          {...register('description')}
        />
        <div id="course-description-error">
          <FormError message={errors.description?.message} />
        </div>
      </div>
      <div className={s.field}>
        <label htmlFor="course-image">URL ảnh khóa học</label>
        <input
          id="course-image"
          type="url"
          maxLength={2048}
          disabled={mutation.busy}
          aria-invalid={Boolean(errors.imgUrl)}
          aria-describedby="course-image-error"
          {...register('imgUrl')}
        />
        <span>HTTP/HTTPS, tối đa 2048 ký tự. Xóa nội dung để bỏ ảnh hiện tại.</span>
        <div id="course-image-error">
          <FormError message={errors.imgUrl?.message} />
        </div>
      </div>
      <MutationFeedback
        mutation={mutation}
        onCheck={() => void checkResult()}
        reviewHref={course ? `/management/courses/${course.id}` : '/management/courses'}
      />
      {!course && categories.length === 0 && (
        <p role="status">Cần có danh mục đang hoạt động trước khi tạo khóa học.</p>
      )}
      <div className={s.actions}>
        <button
          type="submit"
          className={s.button}
          disabled={
            disabled || isSubmitting || mutation.blocked || (!course && categories.length === 0)
          }
        >
          {isSubmitting ? 'Đang lưu…' : course ? 'Lưu thông tin khóa học' : 'Tạo khóa học'}
        </button>
        <Link className={s.secondaryButton} href="/management/courses">
          Danh sách khóa học
        </Link>
      </div>
    </form>
  );
}
