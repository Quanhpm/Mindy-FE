'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { FormError } from '@/shared/components/feedback';
import s from '@/shared/components/management.module.css';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { useUiMutation } from '@/shared/hooks/use-ui-mutation';
import { addCourseUnit, catalogErrorMessage, getAdminCourse } from '../api/catalog.browser';
import {
  type CourseDetail,
  type CourseUnit,
  type UnitInput,
  unitInputSchema,
} from '../schemas/catalog.schema';
import styles from './catalog.module.css';

export function CourseUnitForm({
  disabled = false,
  onBusyChange,
  courseId,
  onAdded,
  onChecked,
}: {
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  courseId: string;
  onAdded: (unit: CourseUnit, signal: AbortSignal) => void;
  onChecked?: (course: CourseDetail) => void;
}) {
  const mutation = useUiMutation(catalogErrorMessage);
  useEffect(() => {
    onBusyChange?.(mutation.blocked);
    return () => onBusyChange?.(false);
  }, [onBusyChange, mutation.blocked]);
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
    if (disabled) return;
    let requestSignal: AbortSignal;
    await mutation.run(
      (signal) => {
        requestSignal = signal;
        return addCourseUnit(courseId, input, signal);
      },
      (unit) => {
        reset();
        onAdded(unit, requestSignal);
      },
    );
  }
  async function checkResult() {
    await mutation.check(async (signal) => {
      const current = await getAdminCourse(courseId, signal);
      if (!signal.aborted) onChecked?.(current);
      return `Khóa có ${current.units.length} học phần: ${current.units.map((unit) => unit.title).join(', ') || 'Chưa có'}. Kiểm tra trước khi thêm lại.`;
    });
  }

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit(submit)}>
      <h2>Thêm học phần</h2>
      <p>Học phần mới được nối vào cuối chương trình học.</p>
      <div className={s.field}>
        <label htmlFor="unit-title">Tên học phần *</label>
        <input
          id="unit-title"
          disabled={mutation.busy}
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
          disabled={mutation.busy}
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
          disabled={mutation.busy}
          aria-invalid={Boolean(errors.requiredScorePercent)}
          aria-describedby="unit-score-error"
          {...register('requiredScorePercent', { valueAsNumber: true })}
        />
        <div id="unit-score-error">
          <FormError message={errors.requiredScorePercent?.message} />
        </div>
      </div>
      <MutationFeedback
        mutation={mutation}
        onCheck={() => void checkResult()}
        reviewHref={`/management/courses/${courseId}`}
      />
      <div className={s.actions}>
        <button
          type="submit"
          className={s.button}
          disabled={disabled || isSubmitting || mutation.blocked}
        >
          {isSubmitting ? 'Đang thêm…' : 'Thêm học phần'}
        </button>
      </div>
    </form>
  );
}
