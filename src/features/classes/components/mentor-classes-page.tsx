'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { z } from 'zod';
import { useSession } from '@/features/auth/client';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import s from '@/shared/components/management.module.css';
import { errorMessage } from '@/shared/lib/http/api-error';
import {
  listManagerClasses,
  listMentorClasses,
  listMentorStudents,
} from '../api/mentor-classes.browser';
import { classStatusLabels, deliveryModeLabels, formatCalendarDate } from '../domain/class-rules';
import {
  type MentorClassPage,
  type MentorRosterPage,
  mentorClassFiltersSchema,
  mentorRosterFiltersSchema,
} from '../schemas/mentor-class.schema';

const orderLabels = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  EXPIRED: 'Hết hạn',
  CANCELLED: 'Đã hủy',
};
const enrollmentLabels = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  ACTIVE: 'Đang học',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};
const paymentLabels = { CASH: 'Tiền mặt', PAYOS: 'PayOS' };
const money = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

export function MentorClassesPage({ classId }: { classId?: string }) {
  return <ClassRosterPage classId={classId} accessRole="MENTOR" />;
}
export function ManagerClassesPage({ classId }: { classId?: string }) {
  return <ClassRosterPage classId={classId} accessRole="MANAGER" />;
}
function ClassRosterPage({
  classId,
  accessRole,
}: {
  classId?: string;
  accessRole: 'MENTOR' | 'MANAGER';
}) {
  const { user, state } = useSession();
  if (state !== 'authenticated' || !user) return <LoadingState />;
  if (user.role !== accessRole)
    return (
      <section className="empty-state">
        <h1>
          {accessRole === 'MANAGER' ? 'Khu vực dành cho quản lý' : 'Khu vực dành cho giảng viên'}
        </h1>
        <p>
          {accessRole === 'MANAGER'
            ? 'Chỉ quản lý có thể xem danh sách này.'
            : 'Chỉ giảng viên được giao lớp mới có thể xem danh sách này.'}
        </p>
        <Link href="/account">Về tài khoản</Link>
      </section>
    );
  if (classId && !z.uuid().safeParse(classId).success)
    return <ErrorPanel message="Mã lớp không hợp lệ." />;
  return (
    <MentorClasses
      accessRole={accessRole}
      key={`${user.id}:${classId ?? 'list'}`}
      mentorId={user.id}
      classId={classId}
    />
  );
}
function MentorClasses({
  mentorId,
  classId,
  accessRole,
}: {
  mentorId: string;
  classId?: string;
  accessRole: 'MANAGER' | 'MENTOR';
}) {
  const manager = accessRole === 'MANAGER';
  const basePath = manager ? '/manager/classes' : '/mentor/classes';
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [navigating, startTransition] = useTransition();
  const query = params.toString();
  const [classes, setClasses] = useState<MentorClassPage>();
  const [roster, setRoster] = useState<MentorRosterPage>();
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  const filters = classId
    ? mentorRosterFiltersSchema.parse(Object.fromEntries(params))
    : mentorClassFiltersSchema.parse(Object.fromEntries(params));
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision explicitly triggers a fresh read.
  useEffect(() => {
    const controller = new AbortController();
    setClasses(undefined);
    setRoster(undefined);
    setError(undefined);
    async function load() {
      try {
        if (classId) {
          const result = await listMentorStudents(classId, query, controller.signal);
          if (!controller.signal.aborted) setRoster(result);
        } else {
          const result = manager
            ? await listManagerClasses(query, controller.signal)
            : await listMentorClasses(query, mentorId, controller.signal);
          if (!controller.signal.aborted) setClasses(result);
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(errorMessage(cause));
      }
    }
    void load();
    return () => controller.abort();
  }, [classId, mentorId, query, revision, manager]);
  function navigate(key: string, value: string) {
    const next = new URLSearchParams();
    for (const [name, current] of Object.entries(filters))
      if (current !== undefined) next.set(name, String(current));
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.set('page', '1');
    startTransition(() => router.push(`${pathname}?${next}`));
  }
  const data = classId ? roster : classes;
  return (
    <div className={s.page}>
      {classId && (
        <Link className={s.secondaryButton} href={basePath}>
          {manager ? 'Về danh sách lớp học' : 'Về lớp giảng dạy'}
        </Link>
      )}
      <header className={s.heading}>
        <div>
          <p className={s.eyebrow}>{manager ? 'QUẢN LÝ' : 'GIẢNG VIÊN'}</p>
          <h1>{classId ? 'Học viên của lớp' : manager ? 'Lớp học' : 'Lớp giảng dạy'}</h1>
          <p>
            {classId
              ? 'Theo dõi đăng ký và thanh toán của học viên.'
              : manager
                ? 'Danh sách các lớp học hiện có tại trung tâm.'
                : 'Các lớp được phân công cho bạn.'}
          </p>
        </div>
        <button
          className={s.secondaryButton}
          type="button"
          onClick={() => setRevision((value) => value + 1)}
        >
          Cập nhật danh sách
        </button>
      </header>
      <div className={s.toolbar}>
        {classId ? (
          <>
            <div className={s.field}>
              <label htmlFor="mentor-payment">Thanh toán</label>
              <select
                disabled={navigating}
                id="mentor-payment"
                value={'paymentType' in filters ? (filters.paymentType ?? '') : ''}
                onChange={(event) => navigate('paymentType', event.target.value)}
              >
                <option value="">Tất cả hình thức</option>
                {Object.entries(paymentLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className={s.field}>
              <label htmlFor="mentor-order">Trạng thái đơn</label>
              <select
                disabled={navigating}
                id="mentor-order"
                value={'orderStatus' in filters ? (filters.orderStatus ?? '') : ''}
                onChange={(event) => navigate('orderStatus', event.target.value)}
              >
                <option value="">Tất cả trạng thái</option>
                {Object.entries(orderLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <div className={s.field}>
            <label htmlFor="mentor-status">Trạng thái lớp</label>
            <select
              disabled={navigating}
              id="mentor-status"
              value={'status' in filters ? (filters.status ?? '') : ''}
              onChange={(event) => navigate('status', event.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(classStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {classId && !manager && (
        <p className={s.notice}>
          Một đơn có thể gồm nhiều lớp. Khi thu tiền mặt, cần xác nhận toàn bộ tổng đơn tại mục Thu
          tiền mặt.
        </p>
      )}
      {error ? (
        <ErrorPanel message={error} retry={() => setRevision((value) => value + 1)} />
      ) : !data ? (
        <LoadingState />
      ) : (
        <>
          {!data.items.length ? (
            <section className={s.panel}>
              <h2>{classId ? 'Chưa có học viên phù hợp.' : 'Chưa có lớp phù hợp.'}</h2>
              <p>Kiểm tra bộ lọc hoặc cập nhật lại danh sách.</p>
            </section>
          ) : (
            <section
              className={s.tableWrap}
              aria-label={classId ? 'Danh sách học viên' : 'Danh sách lớp'}
              // biome-ignore lint/a11y/noNoninteractiveTabindex: enables keyboard scrolling of the wide table.
              tabIndex={0}
            >
              {classes && (
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Lớp</th>
                      <th>Trạng thái</th>
                      <th>Thời gian</th>
                      <th>Hình thức</th>
                      <th>Chỗ trống</th>
                      <th>Học viên</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.name}</strong>
                          <br />
                          {item.code}
                        </td>
                        <td>{classStatusLabels[item.status]}</td>
                        <td>
                          {formatCalendarDate(item.startDate)} – {formatCalendarDate(item.endDate)}
                        </td>
                        <td>{deliveryModeLabels[item.deliveryMode]}</td>
                        <td>
                          {item.availableSeats}/{item.maxStudents}
                        </td>
                        <td>
                          <Link
                            className={s.secondaryButton}
                            href={`${basePath}/${item.id}/students`}
                          >
                            Xem học viên
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {roster && (
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Học viên</th>
                      <th>Đăng ký</th>
                      <th>Đơn</th>
                      <th>Thanh toán</th>
                      <th>Học phí lớp</th>
                      <th>Tổng đơn</th>
                      {!manager && <th>Thu tiền mặt</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {roster.items.map((item) => (
                      <tr key={item.enrollmentId}>
                        <td>{item.studentName}</td>
                        <td>{enrollmentLabels[item.enrollmentStatus]}</td>
                        <td>
                          {item.orderCode}
                          <br />
                          {orderLabels[item.orderStatus]}
                        </td>
                        <td>{paymentLabels[item.paymentType]}</td>
                        <td>{money(item.classAmount)}</td>
                        <td>
                          {money(item.orderTotalAmount)}
                          <br />
                          {item.orderClassCount} lớp
                        </td>
                        {!manager && (
                          <td>
                            {item.canConfirmCash &&
                            item.paymentType === 'CASH' &&
                            item.orderStatus === 'PENDING' ? (
                              <Link className={s.secondaryButton} href="/mentor/cash-orders">
                                Mở thu tiền mặt
                              </Link>
                            ) : (
                              'Không có thao tác thu tiền'
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )}
          <nav className={s.pagination} aria-label="Phân trang danh sách">
            <span>
              Trang {data.page} · {data.total} {classId ? 'đăng ký' : 'lớp'}
            </span>
            <div className={s.actions}>
              <button
                type="button"
                className={s.secondaryButton}
                disabled={navigating || filters.page <= 1}
                onClick={() => navigate('page', String(filters.page - 1))}
              >
                Trang trước
              </button>
              <button
                type="button"
                className={s.secondaryButton}
                disabled={navigating || data.page * data.pageSize >= data.total}
                onClick={() => navigate('page', String(filters.page + 1))}
              >
                Trang sau
              </button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
