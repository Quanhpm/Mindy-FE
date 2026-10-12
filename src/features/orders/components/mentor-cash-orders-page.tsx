'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '@/features/auth/client';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import { formatDate } from '@/shared/lib/date';
import { ApiError, errorMessage } from '@/shared/lib/http/api-error';
import { Icon } from '@/shared/ui/icon';
import {
  confirmCashOrder,
  listMentorClasses,
  listMentorClassStudents,
} from '../api/orders.browser';
import { formatAmount } from '../domain/order-display';
import {
  enrollmentStatusLabels,
  type MentorClassPage,
  type MentorRosterPage,
  type MentorRosterStudent,
  mentorCashFiltersSchema,
  mentorClassStatusLabels,
} from '../schemas/mentor-roster.schema';
import { orderStatusLabels } from '../schemas/order.schema';
import s from './cash-orders.module.css';

export function MentorCashOrdersPage() {
  const { user, state } = useSession();
  if (state !== 'authenticated' || !user) return <LoadingState />;
  if (user.role !== 'MENTOR')
    return (
      <section className="empty-state">
        <h1>Khu vực dành cho mentor</h1>
        <p>Mentor được giao lớp mới có thể xem học viên và xác nhận thu tiền.</p>
        <Link href="/account">Về tài khoản</Link>
      </section>
    );
  return <CashOrders key={user.id} mentorId={user.id} />;
}

function CashOrders({ mentorId }: { mentorId: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const filters = mentorCashFiltersSchema.parse(Object.fromEntries(params));
  const { classId, classPage, studentPage, orderStatus } = filters;
  const [classes, setClasses] = useState<MentorClassPage>();
  const [roster, setRoster] = useState<MentorRosterPage>();
  const [classesError, setClassesError] = useState<string>();
  const [rosterError, setRosterError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [selected, setSelected] = useState<string>();
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [classesReading, setClassesReading] = useState(false);
  const [rosterReading, setRosterReading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const classesRead = useRef<AbortController | null>(null);
  const rosterRead = useRef<AbortController | null>(null);
  const mutation = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const amountInput = useRef<HTMLInputElement>(null);

  const setQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) next.delete(key);
        else next.set(key, value);
      }
      router.replace(`/mentor/cash-orders?${next}`);
    },
    [params, router],
  );

  const readClasses = useCallback(async (): Promise<boolean> => {
    classesRead.current?.abort();
    const controller = new AbortController();
    classesRead.current = controller;
    setClassesReading(true);
    setClassesError(undefined);
    try {
      const result = await listMentorClasses(classPage, controller.signal);
      if (result.items.some((item) => item.mentor.id !== mentorId))
        throw new ApiError(502, 'INVALID_RESPONSE', 'Danh sách lớp không thuộc mentor hiện tại.');
      if (controller.signal.aborted) return false;
      setClasses(result);
      return true;
    } catch (cause) {
      if (!controller.signal.aborted) {
        setClasses(undefined);
        setClassesError(errorMessage(cause));
      }
      return false;
    } finally {
      if (!controller.signal.aborted) setClassesReading(false);
    }
  }, [classPage, mentorId]);

  const readRoster = useCallback(async (): Promise<boolean> => {
    rosterRead.current?.abort();
    if (!classId) {
      setRoster(undefined);
      setRosterError(undefined);
      setRosterReading(false);
      return true;
    }
    const controller = new AbortController();
    rosterRead.current = controller;
    setRosterReading(true);
    setRoster(undefined);
    setRosterError(undefined);
    try {
      const result = await listMentorClassStudents(
        classId,
        studentPage,
        orderStatus,
        controller.signal,
      );
      if (controller.signal.aborted) return false;
      setRoster(result);
      setBlocked(false);
      return true;
    } catch (cause) {
      if (!controller.signal.aborted) {
        setRosterError(errorMessage(cause));
        setBlocked(true);
      }
      return false;
    } finally {
      if (!controller.signal.aborted) setRosterReading(false);
    }
  }, [classId, orderStatus, studentPage]);

  useEffect(() => {
    void readClasses();
    return () => classesRead.current?.abort();
  }, [readClasses]);

  useEffect(() => {
    setSelected(undefined);
    setAmount('');
    setNotice(undefined);
    mutation.current?.abort();
    void readRoster();
    return () => rosterRead.current?.abort();
  }, [readRoster]);

  useEffect(() => {
    if (selected) amountInput.current?.focus();
  }, [selected]);

  useEffect(() => {
    const firstClass = classes?.items[0];
    if (!classId && firstClass && classes.page === classPage && !classesReading)
      setQuery({ classId: firstClass.id, studentPage: '1', orderStatus: null });
  }, [classId, classPage, classes, classesReading, setQuery]);

  useEffect(
    () => () => {
      classesRead.current?.abort();
      rosterRead.current?.abort();
      mutation.current?.abort();
    },
    [],
  );

  async function refresh() {
    const reads = [readClasses()];
    if (classId) reads.push(readRoster());
    await Promise.all(reads);
  }

  async function confirm(student: MentorRosterStudent) {
    if (
      locked.current ||
      busy ||
      rosterReading ||
      blocked ||
      !student.canConfirmCash ||
      !amount.trim() ||
      Number(amount) !== student.orderTotalAmount
    )
      return;
    locked.current = true;
    const controller = new AbortController();
    mutation.current = controller;
    setBusy(true);
    setNotice(undefined);
    try {
      const paid = await confirmCashOrder(
        student.orderId,
        student.orderTotalAmount,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      const refreshed = await readRoster();
      if (controller.signal.aborted) return;
      setSelected(undefined);
      setAmount('');
      setNotice(
        refreshed
          ? `Đã xác nhận thu đủ tiền cho đơn ${paid.orderCode}.`
          : `Đơn ${paid.orderCode} đã được xác nhận, nhưng chưa đọc lại được danh sách học viên.`,
      );
    } catch (cause) {
      if (!controller.signal.aborted) {
        setBlocked(true);
        setNotice(
          `${errorMessage(cause)} Hãy cập nhật danh sách học viên trước khi thử lại; kết quả thu tiền có thể đã được ghi nhận.`,
        );
        setSelected(undefined);
      }
    } finally {
      locked.current = false;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  const selectedClass = classes?.items.find((item) => item.id === classId);
  const reading = classesReading || rosterReading;
  return (
    <div className={s.page}>
      <header className={s.heading}>
        <div>
          <p>THU TIỀN MẶT</p>
          <h1>Học viên trong lớp của bạn.</h1>
          <span>Chọn lớp, kiểm tra đúng học viên và chỉ xác nhận sau khi đã nhận đủ tiền.</span>
        </div>
        <button
          className="button button-secondary"
          type="button"
          disabled={busy || reading}
          onClick={() => void refresh()}
        >
          <Icon name="clock" size={18} />
          Cập nhật danh sách
        </button>
      </header>

      {notice && (
        <p className={s.notice} role="status">
          {notice}
        </p>
      )}

      {classesError ? (
        <ErrorPanel message={classesError} retry={() => void readClasses()} />
      ) : !classes ? (
        <LoadingState label="Đang đọc các lớp được giao…" />
      ) : !classes.items.length ? (
        <section className={s.empty}>
          <h2>Chưa có lớp được giao.</h2>
          <p>Lớp sẽ xuất hiện khi quản trị viên phân công bạn làm mentor.</p>
        </section>
      ) : (
        <section className={s.classPanel} aria-labelledby="mentor-class-title">
          <div className={s.classHero}>
            <div className={s.classIdentity}>
              <span className={s.classIcon}>
                <Icon name="book" size={24} />
              </span>
              <div>
                <p className={s.kicker}>LỚP ĐANG XEM</p>
                <h2 id="mentor-class-title">{selectedClass?.name ?? 'Đang chọn lớp đầu tiên…'}</h2>
                {selectedClass && <span>{selectedClass.code}</span>}
              </div>
            </div>
            <div className={s.classPicker}>
              <label htmlFor="mentor-class">Đổi lớp phụ trách</label>
              <select
                id="mentor-class"
                value={classId ?? ''}
                disabled={busy || classesReading}
                onChange={(event) =>
                  setQuery({
                    classId: event.target.value || null,
                    studentPage: '1',
                    orderStatus: null,
                  })
                }
              >
                <option value="" disabled>
                  Chọn một lớp
                </option>
                {classId && !selectedClass && <option value={classId}>Lớp đang được chọn</option>}
                {classes.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {selectedClass && (
            <dl className={s.classMeta}>
              <div>
                <dt>Trạng thái</dt>
                <dd>
                  <span className={s.classStatus} data-status={selectedClass.status}>
                    {mentorClassStatusLabels[selectedClass.status]}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Hình thức</dt>
                <dd>{selectedClass.deliveryMode === 'ONLINE' ? 'Trực tuyến' : 'Tại trung tâm'}</dd>
              </div>
              <div>
                <dt>Thời gian</dt>
                <dd>
                  {selectedClass.startDate} – {selectedClass.endDate}
                </dd>
              </div>
              <div>
                <dt>Sĩ số</dt>
                <dd>
                  {selectedClass.maxStudents - selectedClass.availableSeats}/
                  {selectedClass.maxStudents} học viên
                </dd>
              </div>
            </dl>
          )}
          <div className={s.classPagination}>
            <span>
              Hiển thị {classes.items.length} / {classes.total} lớp · Trang {classPage}
            </span>
            <div className={s.actions}>
              <button
                className="button button-secondary"
                aria-label="Trang lớp trước"
                type="button"
                disabled={busy || classPage <= 1}
                onClick={() =>
                  setQuery({
                    classPage: String(classPage - 1),
                    classId: null,
                    studentPage: '1',
                    orderStatus: null,
                  })
                }
              >
                Trước
              </button>
              <button
                className="button button-secondary"
                aria-label="Trang lớp sau"
                type="button"
                disabled={busy || classPage * classes.pageSize >= classes.total}
                onClick={() =>
                  setQuery({
                    classPage: String(classPage + 1),
                    classId: null,
                    studentPage: '1',
                    orderStatus: null,
                  })
                }
              >
                Sau
              </button>
            </div>
          </div>
        </section>
      )}

      {classId && (
        <section className={s.rosterSection} aria-labelledby="cash-roster-title">
          <div className={s.rosterToolbar}>
            <div>
              <p className={s.kicker}>HỌC VIÊN THANH TOÁN TIỀN MẶT</p>
              <h2 id="cash-roster-title">{selectedClass?.name ?? 'Danh sách học viên'}</h2>
            </div>
            <div className="field">
              <label htmlFor="cash-order-status">Trạng thái đơn</label>
              <select
                id="cash-order-status"
                value={orderStatus ?? ''}
                disabled={busy || rosterReading}
                onChange={(event) =>
                  setQuery({ orderStatus: event.target.value || null, studentPage: '1' })
                }
              >
                <option value="">Tất cả trạng thái</option>
                <option value="PENDING">Chờ thanh toán</option>
                <option value="PAID">Đã thanh toán</option>
                <option value="EXPIRED">Đã hết hạn</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>
          </div>

          {rosterError ? (
            <ErrorPanel message={rosterError} retry={() => void readRoster()} />
          ) : !roster ? (
            <LoadingState label="Đang đọc học viên trong lớp…" />
          ) : !roster.items.length ? (
            <section className={s.empty}>
              <h2>Không có học viên phù hợp.</h2>
              <p>Thử chọn trạng thái đơn khác hoặc cập nhật lại danh sách.</p>
            </section>
          ) : (
            <div className={s.list}>
              {roster.items.map((student) => (
                <article className={s.student} key={student.enrollmentId}>
                  <div className={s.studentHeading}>
                    <div className={s.studentIdentity}>
                      <span className={s.studentAvatar}>
                        <Icon name="user" size={22} />
                      </span>
                      <div>
                        <p className={s.kicker}>HỌC VIÊN</p>
                        <h3>{student.studentName}</h3>
                        <span>{enrollmentStatusLabels[student.enrollmentStatus]}</span>
                      </div>
                    </div>
                    <span className={s.status} data-status={student.orderStatus}>
                      {orderStatusLabels[student.orderStatus]}
                    </span>
                  </div>

                  <dl className={s.studentMeta}>
                    <div>
                      <dt>Mã đơn</dt>
                      <dd>{student.orderCode}</dd>
                    </div>
                    <div className={s.orderId}>
                      <dt>Order ID dùng để xác nhận</dt>
                      <dd>
                        <code>{student.orderId}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>Học phí của lớp này</dt>
                      <dd>{formatAmount(student.classAmount)}</dd>
                    </div>
                    <div>
                      <dt>Số lớp trong đơn</dt>
                      <dd>{student.orderClassCount} lớp</dd>
                    </div>
                    <div>
                      <dt>{student.paidAt ? 'Đã thanh toán lúc' : 'Hạn giữ chỗ'}</dt>
                      <dd>{formatDate(student.paidAt ?? student.expiresAt, true)}</dd>
                    </div>
                  </dl>

                  <div className={s.paymentSummary}>
                    <div>
                      <span>Tổng tiền cần thu</span>
                      <strong>{formatAmount(student.orderTotalAmount)}</strong>
                    </div>
                    <span className={s.paymentRule}>
                      <Icon name={student.canConfirmCash ? 'check' : 'clock'} size={18} />
                      {student.canConfirmCash
                        ? 'Chỉ xác nhận sau khi đã nhận đủ tiền'
                        : 'Đơn không cần xác nhận thêm'}
                    </span>
                  </div>

                  {student.orderClassCount > 1 && student.canConfirmCash && (
                    <p className={s.amountHint}>
                      Đơn này gồm {student.orderClassCount} lớp. Cần nhận đủ toàn bộ{' '}
                      <strong>{formatAmount(student.orderTotalAmount)}</strong>, không chỉ học phí
                      của lớp đang xem.
                    </p>
                  )}

                  {student.canConfirmCash ? (
                    selected === student.orderId ? (
                      <form
                        className={s.confirm}
                        onSubmit={(event) => {
                          event.preventDefault();
                          void confirm(student);
                        }}
                      >
                        <div className="field">
                          <label htmlFor={`amount-${student.orderId}`}>
                            Tổng số tiền đã nhận (VND)
                          </label>
                          <input
                            ref={amountInput}
                            id={`amount-${student.orderId}`}
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            value={amount}
                            onChange={(event) => setAmount(event.target.value)}
                            disabled={busy}
                            required
                          />
                          <span>Cần thu đủ {formatAmount(student.orderTotalAmount)}.</span>
                        </div>
                        <div className={s.actions}>
                          <button
                            className="button button-primary"
                            type="submit"
                            disabled={
                              busy ||
                              rosterReading ||
                              blocked ||
                              !amount.trim() ||
                              Number(amount) !== student.orderTotalAmount
                            }
                          >
                            <Icon name="check" size={18} />
                            {busy ? 'Đang xác nhận…' : 'Xác nhận đã thu đủ'}
                          </button>
                          <button
                            type="button"
                            className="button button-secondary"
                            disabled={busy}
                            onClick={() => setSelected(undefined)}
                          >
                            Hủy
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        className="button button-primary"
                        disabled={busy || rosterReading || blocked}
                        onClick={() => {
                          setSelected(student.orderId);
                          setAmount('');
                        }}
                      >
                        <Icon name="check" size={18} />
                        Ghi nhận thu tiền cho {student.studentName}
                      </button>
                    )
                  ) : (
                    <p className={s.closed}>
                      {student.orderStatus === 'PAID'
                        ? 'Đơn đã được ghi nhận thanh toán.'
                        : 'Đơn hiện không đủ điều kiện xác nhận tiền mặt.'}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}

          {roster && (
            <footer className={s.pagination}>
              <span>
                {roster.total} học viên · Trang {studentPage}
              </span>
              <div className={s.actions}>
                <button
                  className="button button-secondary"
                  disabled={busy || studentPage <= 1}
                  type="button"
                  onClick={() => setQuery({ studentPage: String(studentPage - 1) })}
                >
                  Trước
                </button>
                <button
                  className="button button-secondary"
                  disabled={busy || studentPage * roster.pageSize >= roster.total}
                  type="button"
                  onClick={() => setQuery({ studentPage: String(studentPage + 1) })}
                >
                  Sau
                </button>
              </div>
            </footer>
          )}
        </section>
      )}

      {!classId && classes?.items.length ? (
        <section className={s.empty}>
          <h2>Chọn một lớp để bắt đầu.</h2>
          <p>Danh sách chỉ hiển thị học viên có đơn thanh toán tiền mặt trong lớp đã chọn.</p>
        </section>
      ) : null}
    </div>
  );
}
