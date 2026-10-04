'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import s from '@/shared/components/management.module.css';
import { UnitWorkspace } from '@/shared/components/unit-workspace';
import { ApiError } from '@/shared/lib/http/api-error';
import {
  activateCourse,
  catalogErrorMessage,
  getAdminCourse,
  listAllCategories,
  reorderCourseUnits,
} from '../api/catalog.browser';
import type { CourseCategory, CourseDetail } from '../schemas/catalog.schema';
import { moveUnit } from '../schemas/unit-order';
import styles from './catalog.module.css';
import { CourseFieldsForm } from './course-fields-form';
import { CourseUnitForm } from './course-unit-form';

export function CourseDetailManagement({ id }: { id: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get('tab') === 'fields' ? 'fields' : 'units';
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [error, setError] = useState<string>();
  const [categoryError, setCategoryError] = useState<string>();
  const [mutationError, setMutationError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const [categoryRevision, setCategoryRevision] = useState(0);
  const unitId = params.get('unitId');
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision triggers explicit retry.
  useEffect(() => {
    const controller = new AbortController();
    setError(undefined);
    setCourse(null);
    void getAdminCourse(id, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setCourse(result);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(catalogErrorMessage(cause));
      });
    return () => controller.abort();
  }, [id, revision]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: categoryRevision retries the picker without discarding the course form.
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
  }, [categoryRevision]);
  useEffect(() => {
    if (course && !unitId && tab === 'units')
      router.replace(`/management/courses/${id}?unitId=${course.units[0]?.id ?? 'new'}`, {
        scroll: false,
      });
  }, [course, unitId, tab, id, router]);
  async function recoverConflict(cause: unknown) {
    if (!(cause instanceof ApiError) || cause.status !== 409) return;
    try {
      setCourse(await getAdminCourse(id));
    } catch (readError) {
      setMutationError(`${catalogErrorMessage(cause)} ${catalogErrorMessage(readError)}`);
    }
  }
  async function reorder(unit: string, direction: -1 | 1) {
    if (!course || saving) return;
    setSaving(true);
    setMutationError(undefined);
    setNotice(undefined);
    const current = course.units.map((item) => item.id);
    try {
      setCourse(await reorderCourseUnits(id, current, moveUnit(current, unit, direction)));
      setNotice('Đã lưu thứ tự học phần. Các lớp đã tạo giữ nguyên thứ tự riêng.');
    } catch (cause) {
      setMutationError(catalogErrorMessage(cause));
      await recoverConflict(cause);
    } finally {
      setSaving(false);
    }
  }
  async function activate() {
    if (saving) return;
    setSaving(true);
    setMutationError(undefined);
    setNotice(undefined);
    try {
      setCourse(await activateCourse(id));
      setNotice('Đã kích hoạt khóa học.');
    } catch (cause) {
      setMutationError(catalogErrorMessage(cause));
      await recoverConflict(cause);
    } finally {
      setSaving(false);
    }
  }
  if (error) return <ErrorPanel message={error} retry={() => setRevision((value) => value + 1)} />;
  if (!course) return <LoadingState />;
  const selected = course.units.find((unit) => unit.id === unitId);
  const href = (selectedId: string) => `/management/courses/${id}?unitId=${selectedId}`;
  return (
    <div className={s.page}>
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>MINDY / COURSE MANAGEMENT</p>
          <h1>{course.title}</h1>
          <p>
            {course.code} · {course.isActive ? 'Đang hoạt động' : 'Chưa kích hoạt'}
          </p>
        </div>
        {!course.isActive && (
          <button
            className={s.button}
            type="button"
            disabled={saving || course.units.length === 0}
            onClick={() => void activate()}
          >
            {saving ? 'Đang xử lý…' : 'Kích hoạt khóa học'}
          </button>
        )}
      </div>
      {!course.isActive && course.units.length === 0 && (
        <p className={s.notice}>Thêm ít nhất một học phần trước khi kích hoạt.</p>
      )}
      {notice && (
        <p role="status" className={s.notice}>
          {notice}
        </p>
      )}
      {mutationError && <ErrorPanel message={mutationError} />}
      <nav aria-label="Quản lý khóa học" className={styles.tabs}>
        <Link
          href={href(unitId ?? course.units[0]?.id ?? 'new')}
          scroll={false}
          aria-current={tab === 'units' ? 'page' : undefined}
        >
          Học phần ({course.units.length})
        </Link>
        <Link
          href={`/management/courses/${id}?tab=fields${unitId ? `&unitId=${unitId}` : ''}`}
          scroll={false}
          aria-current={tab === 'fields' ? 'page' : undefined}
        >
          Thông tin khóa học
        </Link>
      </nav>
      {tab === 'fields' ? (
        <>
          <div className={styles.metadata}>
            <span>{course.category.name}</span>
            <span>{course.priceAmount.toLocaleString('vi-VN')} ₫</span>
          </div>
          {categoryError && (
            <ErrorPanel
              message={categoryError}
              retry={() => setCategoryRevision((value) => value + 1)}
            />
          )}
          <CourseFieldsForm
            key={course.id}
            categories={categories}
            course={course}
            onSaved={(saved) => {
              setCourse(saved);
              setNotice('Đã lưu thông tin khóa học.');
            }}
            onConflict={recoverConflict}
          />
        </>
      ) : (
        <UnitWorkspace
          title={course.title}
          backHref="/management/courses"
          backLabel="Danh sách khóa học"
          selectionKey={unitId ?? ''}
          rail={
            <>
              <p>{course.units.length} học phần · Theo thứ tự chương trình</p>
              <Link
                className={s.secondaryButton}
                href={href('new')}
                scroll={false}
                aria-current={unitId === 'new' ? 'true' : undefined}
              >
                Thêm học phần
              </Link>
              {course.units.length === 0 ? (
                <p>Chưa có học phần.</p>
              ) : (
                <ol className={styles.units}>
                  {course.units.map((unit, index) => (
                    <li key={unit.id} className={styles.unit}>
                      <Link
                        href={href(unit.id)}
                        scroll={false}
                        aria-current={unit.id === unitId ? 'true' : undefined}
                      >
                        <small>Học phần {unit.unitNumber}</small>
                        {unit.title}
                      </Link>
                      <div className={styles.orderActions}>
                        <button
                          type="button"
                          aria-label={`Đưa ${unit.title} lên`}
                          disabled={saving || index === 0 || course.units.length > 200}
                          onClick={() => void reorder(unit.id, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={`Đưa ${unit.title} xuống`}
                          disabled={
                            saving || index === course.units.length - 1 || course.units.length > 200
                          }
                          onClick={() => void reorder(unit.id, 1)}
                        >
                          ↓
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              {course.units.length > 200 && <p>Chỉ hỗ trợ sắp xếp tối đa 200 học phần.</p>}
            </>
          }
        >
          {unitId === 'new' ? (
            <CourseUnitForm
              courseId={id}
              onAdded={(unit) => {
                setCourse((current) =>
                  current ? { ...current, units: [...current.units, unit] } : current,
                );
                setNotice('Đã thêm học phần.');
                router.push(href(unit.id), { scroll: false });
                void getAdminCourse(id)
                  .then(setCourse)
                  .catch((cause: unknown) => setMutationError(catalogErrorMessage(cause)));
              }}
            />
          ) : selected ? (
            <article>
              <p className={s.eyebrow}>HỌC PHẦN {selected.unitNumber}</p>
              <h2>{selected.title}</h2>
              <p>Điểm yêu cầu: {selected.requiredScorePercent}%</p>
              <div className={styles.unitDescription}>
                {selected.description || 'Học phần chưa có mô tả.'}
              </div>
            </article>
          ) : (
            <ErrorPanel message="Học phần không thuộc khóa học hoặc không còn khả dụng. Chọn một học phần trong danh sách." />
          )}
        </UnitWorkspace>
      )}
    </div>
  );
}
