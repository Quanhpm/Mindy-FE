'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { FormError } from '@/shared/components/feedback';
import s from '@/shared/components/management.module.css';
import type { CourseCategory } from '../schemas/catalog.schema';
import {
  type BrowseFilterFormInput,
  browseFilterFormSchema,
  type PublicBrowseFilters,
} from '../schemas/public-catalog.schema';
import styles from './public-catalog.module.css';

export function PublicBrowseFiltersForm({
  filters,
  categories,
  includeCategory,
  onApply,
}: {
  filters: PublicBrowseFilters;
  categories?: CourseCategory[];
  includeCategory?: boolean;
  onApply: (fields: BrowseFilterFormInput) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BrowseFilterFormInput>({
    resolver: zodResolver(browseFilterFormSchema),
    defaultValues: {
      categoryId: filters.categoryId ?? '',
      deliveryMode: filters.deliveryMode ?? '',
      startsFrom: filters.startsFrom ?? '',
      startsTo: filters.startsTo ?? '',
    },
  });
  useEffect(() => {
    reset({
      categoryId: filters.categoryId ?? '',
      deliveryMode: filters.deliveryMode ?? '',
      startsFrom: filters.startsFrom ?? '',
      startsTo: filters.startsTo ?? '',
    });
  }, [filters.categoryId, filters.deliveryMode, filters.startsFrom, filters.startsTo, reset]);
  return (
    <form
      className={styles.filters}
      onSubmit={handleSubmit(onApply)}
      noValidate
      aria-label="Bộ lọc khóa học và lớp"
    >
      {includeCategory && (
        <div className={s.field}>
          <label htmlFor="browse-category">Danh mục</label>
          <select id="browse-category" {...register('categoryId')}>
            <option value="">Tất cả danh mục</option>
            {filters.categoryId &&
              !categories?.some((category) => category.id === filters.categoryId) && (
                <option value={filters.categoryId}>Danh mục đang chọn</option>
              )}
            {categories?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <FormError message={errors.categoryId?.message} />
        </div>
      )}
      <div className={s.field}>
        <label htmlFor="browse-mode">Hình thức học</label>
        <select id="browse-mode" {...register('deliveryMode')}>
          <option value="">Tất cả hình thức</option>
          <option value="ONLINE">Trực tuyến</option>
          <option value="OFFLINE">Tại trung tâm</option>
        </select>
      </div>
      <div className={s.field}>
        <label htmlFor="browse-from">Ngày bắt đầu lớp từ</label>
        <input
          id="browse-from"
          type="date"
          aria-invalid={Boolean(errors.startsFrom)}
          aria-describedby="browse-from-error"
          {...register('startsFrom')}
        />
        <div id="browse-from-error">
          <FormError message={errors.startsFrom?.message} />
        </div>
      </div>
      <div className={s.field}>
        <label htmlFor="browse-to">Ngày bắt đầu lớp đến</label>
        <input
          id="browse-to"
          type="date"
          aria-invalid={Boolean(errors.startsTo)}
          aria-describedby="browse-to-error"
          {...register('startsTo')}
        />
        <div id="browse-to-error">
          <FormError message={errors.startsTo?.message} />
        </div>
      </div>
      <div className={styles.filterActions}>
        <button type="submit" className={s.button}>
          Áp dụng bộ lọc
        </button>
        <button
          type="button"
          className={s.secondaryButton}
          onClick={() => {
            const fields: BrowseFilterFormInput = {
              categoryId: '',
              deliveryMode: '',
              startsFrom: '',
              startsTo: '',
            };
            reset(fields);
            onApply(fields);
          }}
        >
          Xóa bộ lọc
        </button>
      </div>
    </form>
  );
}
