'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorPanel, FormError } from '@/shared/components/feedback';
import s from '@/shared/components/management.module.css';
import { addCourseUnit, catalogErrorMessage } from '../api/catalog.browser';
import { type CourseUnit, type UnitInput, unitInputSchema } from '../schemas/catalog.schema';
import styles from './catalog.module.css';

export function CourseUnitForm({
  courseId,
  onAdded,
}: {
  courseId: string;
  onAdded: (unit: CourseUnit) => void;
}) {
  const [error, setError] = useState<string>();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UnitInput>({
    resolver: zodResolver(unitInputSchema),
    defaultValues: { title: '', description: '', requiredScorePercent: 80 },
  });
  async function submit(input: UnitInput) {
    setError(undefined);
    try {
      const unit = await addCourseUnit(courseId, input);
      reset();
      onAdded(unit);
    } catch (cause) {
      setError(catalogErrorMessage(cause));
    }
  }
  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit(submit)}>
      <h2>Thêm học phần</h2>
      <p>Học phần mới được nối vào cuối chương trình học.</p>
      <div className={s.field}>
        <label htmlFor="unit-title">Tên học phần *</label>
        <input
          id="unit-title"
          aria-invalid={Boolean(errors.title)}
          aria-describedby="unit-title-error"
          {...register('title')}
        />
        <div id="unit-title-error">
          <FormError message={errors.title?.message} />
        </div>
      </div>
      <div className={s.field}>
        <label htmlFor="unit-description">Mô tả</label>
        <textarea
          id="unit-description"
          rows={8}
          aria-invalid={Boolean(errors.description)}
          aria-describedby="unit-description-error"
          {...register('description')}
        />
        <div id="unit-description-error">
          <FormError message={errors.description?.message} />
        </div>
      </div>
      <div className={s.field}>
        <label htmlFor="unit-score">Điểm yêu cầu (%) *</label>
        <input
          id="unit-score"
          type="number"
          min={0}
          max={100}
          step={0.01}
          aria-invalid={Boolean(errors.requiredScorePercent)}
          aria-describedby="unit-score-error"
          {...register('requiredScorePercent', { valueAsNumber: true })}
        />
        <div id="unit-score-error">
          <FormError message={errors.requiredScorePercent?.message} />
        </div>
      </div>
      {error && <ErrorPanel message={error} />}
      <div className={s.actions}>
        <button type="submit" className={s.button} disabled={isSubmitting}>
          {isSubmitting ? 'Đang thêm…' : 'Thêm học phần'}
        </button>
      </div>
    </form>
  );
}
