'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorPanel, FormError } from '@/shared/components/feedback';
import s from '@/shared/components/management.module.css';
import { catalogErrorMessage, createCourse, updateCourse } from '../api/catalog.browser';
import {
  type CourseCategory,
  type CourseCreateInput,
  type CourseDetail,
  courseCreateSchema,
} from '../schemas/catalog.schema';
import styles from './catalog.module.css';

export function CourseFieldsForm({
  categories,
  course,
  onSaved,
  onConflict,
}: {
  categories: CourseCategory[];
  course?: CourseDetail;
  onSaved: (course: CourseDetail) => void;
  onConflict?: (error: unknown) => Promise<void>;
}) {
  const [error, setError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CourseCreateInput>({
    resolver: zodResolver(courseCreateSchema),
    defaultValues: {
      categoryId: course?.category.id ?? '',
      code: course?.code ?? '',
      title: course?.title ?? '',
      description: course?.description ?? '',
      priceAmount: course?.priceAmount ?? 0,
    },
  });
  async function submit(input: CourseCreateInput) {
    setError(undefined);
    try {
      const { code: _code, ...fields } = input;
      const saved = course ? await updateCourse(course.id, fields) : await createCourse(input);
      onSaved(saved);
    } catch (cause) {
      setError(catalogErrorMessage(cause));
      await onConflict?.(cause);
    }
  }
  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit(submit)}>
      <div className={styles.grid}>
        <div className={s.field}>
          <label htmlFor="course-code">Mã khóa học *</label>
          <input
            id="course-code"
            readOnly={Boolean(course)}
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
          aria-invalid={Boolean(errors.description)}
          aria-describedby="course-description-error"
          {...register('description')}
        />
        <div id="course-description-error">
          <FormError message={errors.description?.message} />
        </div>
      </div>
      {error && <ErrorPanel message={error} />}
      <div className={s.actions}>
        <button
          type="submit"
          className={s.button}
          disabled={isSubmitting || (!course && categories.length === 0)}
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
