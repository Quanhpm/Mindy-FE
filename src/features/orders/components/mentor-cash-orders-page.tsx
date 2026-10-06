'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '@/features/auth/client';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import { ApiError, errorMessage } from '@/shared/lib/http/api-error';
import { confirmCashOrder, listMentorCashOrders } from '../api/orders.browser';
import { formatAmount } from '../domain/order-display';
import {
  type Order,
  type OrderPage,
  orderFiltersSchema,
  orderStatusLabels,
} from '../schemas/order.schema';
import s from './cash-orders.module.css';

export function MentorCashOrdersPage() {
  const { user, state } = useSession();
  if (state !== 'authenticated' || !user) return <LoadingState />;
  if (user.role !== 'MENTOR')
    return (
      <section className="empty-state">
        <h1>Khu vực dành cho mentor</h1>
        <p>Mentor được giao thu tiền mới có thể xem và xác nhận các đơn này.</p>
        <Link href="/account">Về tài khoản</Link>
      </section>
    );
  return <CashOrders key={user.id} mentorId={user.id} />;
}
function CashOrders({ mentorId }: { mentorId: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const page = orderFiltersSchema.parse(Object.fromEntries(params)).page;
  const [data, setData] = useState<OrderPage>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [selected, setSelected] = useState<string>();
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const mutation = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const read = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    read.current?.abort();
    const controller = new AbortController();
    read.current = controller;
    setReading(true);
    setData(undefined);
    setError(undefined);
    try {
      const result = await listMentorCashOrders(page, controller.signal);
      if (result.items.some((order) => order.mentorId !== mentorId))
        throw new ApiError(502, 'INVALID_RESPONSE', 'Danh sách đơn không thuộc mentor hiện tại.');
      if (!controller.signal.aborted) {
        setData(result);
        setBlocked(false);
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(errorMessage(cause));
        setBlocked(true);
      }
    } finally {
      if (!controller.signal.aborted) setReading(false);
    }
  }, [page, mentorId]);
  useEffect(() => {
    setSelected(undefined);
    setNotice(undefined);
    void refresh();
    return () => {
      read.current?.abort();
      mutation.current?.abort();
    };
  }, [refresh]);
  async function confirm(order: Order) {
    if (
      locked.current ||
      busy ||
      reading ||
      blocked ||
      Number(amount) !== order.totalAmount ||
      !amount.trim()
    )
      return;
    locked.current = true;
    const controller = new AbortController();
    mutation.current = controller;
    setBusy(true);
    setNotice(undefined);
    try {
      const paid = await confirmCashOrder(order.id, Number(amount), controller.signal);
      if (controller.signal.aborted) return;
      setData((current) =>
        current
          ? { ...current, items: current.items.map((item) => (item.id === paid.id ? paid : item)) }
          : current,
      );
      setSelected(undefined);
      setNotice(`Đã xác nhận thu đủ tiền cho đơn ${paid.orderCode}.`);
    } catch (cause) {
      if (!controller.signal.aborted) {
        setBlocked(true);
        setNotice(
          `${errorMessage(cause)} Hãy cập nhật danh sách trước khi thử lại; kết quả thu tiền có thể đã được ghi nhận.`,
        );
        setSelected(undefined);
      }
    } finally {
      locked.current = false;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <div className={s.page}>
      <header className={s.heading}>
        <div>
          <p>THU TIỀN MẶT</p>
          <h1>Đơn được giao cho bạn.</h1>
          <span>Kiểm tra từng đơn và chỉ xác nhận sau khi đã nhận đủ tiền.</span>
        </div>
        <button
          className="button button-secondary"
          type="button"
          disabled={busy || reading}
          onClick={() => void refresh()}
        >
          Cập nhật danh sách
        </button>
      </header>
      {notice && (
        <p className={s.notice} role="status">
          {notice}
        </p>
      )}
      {error ? (
        <ErrorPanel message={error} retry={() => void refresh()} />
      ) : !data ? (
        <LoadingState label="Đang đọc đơn tiền mặt…" />
      ) : !data.items.length ? (
        <section className={s.empty}>
          <h2>Chưa có đơn tiền mặt.</h2>
          <p>Đơn sẽ xuất hiện khi học viên chọn tiền mặt cho lớp bạn được giao thu tiền.</p>
        </section>
      ) : (
        <div className={s.list}>
          {data.items.map((order) => (
            <article className={s.order} key={order.id}>
              <div className={s.orderHeading}>
                <div>
                  <h2>{order.orderCode}</h2>
                  <span className={s.status}>{orderStatusLabels[order.status]}</span>
                </div>
                <strong>{formatAmount(order.totalAmount)}</strong>
              </div>
              <ul>
                {order.details.map((detail) => (
                  <li key={detail.id}>
                    <div>
                      <strong>{detail.className}</strong>
                      <span>{detail.courseTitle}</span>
                    </div>
                    <span>{formatAmount(detail.totalAmount)}</span>
                  </li>
                ))}
              </ul>
              {order.status === 'PENDING' && Date.parse(order.expiresAt) > Date.now() ? (
                selected === order.id ? (
                  <form
                    className={s.confirm}
                    onSubmit={(event) => {
                      event.preventDefault();
                      void confirm(order);
                    }}
                  >
                    <div className="field">
                      <label htmlFor={`amount-${order.id}`}>Số tiền đã nhận (VND)</label>
                      <input
                        id={`amount-${order.id}`}
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        disabled={busy}
                        required
                      />
                      <span>Cần thu đủ {formatAmount(order.totalAmount)}.</span>
                    </div>
                    <div className={s.actions}>
                      <button
                        className="button button-primary"
                        type="submit"
                        disabled={
                          busy ||
                          reading ||
                          blocked ||
                          !amount.trim() ||
                          Number(amount) !== order.totalAmount
                        }
                      >
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
                    disabled={busy || reading || blocked}
                    onClick={() => {
                      setSelected(order.id);
                      setAmount('');
                    }}
                  >
                    Ghi nhận thu tiền
                  </button>
                )
              ) : (
                <p className={s.closed}>
                  {order.status === 'PAID'
                    ? 'Đã ghi nhận thanh toán.'
                    : 'Đơn không còn đủ điều kiện thu tiền.'}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
      {data && (
        <footer className={s.pagination}>
          <span>
            {data.total} đơn · Trang {page}
          </span>
          <div className={s.actions}>
            <button
              className="button button-secondary"
              disabled={busy || page <= 1}
              type="button"
              onClick={() => router.replace(`/mentor/cash-orders?page=${page - 1}`)}
            >
              Trước
            </button>
            <button
              className="button button-secondary"
              disabled={busy || page * data.pageSize >= data.total}
              type="button"
              onClick={() => router.replace(`/mentor/cash-orders?page=${page + 1}`)}
            >
              Sau
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
