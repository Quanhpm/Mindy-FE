'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { PaymentPanel } from '@/features/payments/client';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import { ApiError } from '@/shared/lib/http/api-error';
import { getOrder } from '../api/orders.browser';
import { formatRemaining, orderErrorMessage, remainingHold } from '../domain/order-display';
import type { OrderDetail } from '../schemas/order.schema';
import { OrderSummary } from './order-summary';
import styles from './orders.module.css';
import { StudentArea } from './student-area';

export function OrderDetailPage({ id }: { id: string }) {
  return (
    <StudentArea>{(userId) => <OrderDetailContent key={`${userId}:${id}`} id={id} />}</StudentArea>
  );
}
function OrderDetailContent({ id }: { id: string }) {
  const [order, setOrder] = useState<OrderDetail>();
  const [error, setError] = useState<string>();
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(true);
  const [now, setNow] = useState(Date.now());
  const request = useRef<Promise<boolean> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const valid = z.uuid().safeParse(id).success;
  const refresh = useCallback((): Promise<boolean> => {
    if (request.current) return request.current;
    if (!valid) return Promise.resolve(false);
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    const pending = getOrder(id, abort.signal)
      .then((value) => {
        if (abort.signal.aborted) return false;
        setOrder(value);
        setError(undefined);
        setDenied(false);
        return true;
      })
      .catch((cause: unknown) => {
        if (!abort.signal.aborted) {
          setError(orderErrorMessage(cause));
          const forbidden = cause instanceof ApiError && [403, 404].includes(cause.status);
          setDenied(forbidden);
          if (forbidden) setOrder(undefined);
        }
        return false;
      })
      .finally(() => {
        if (request.current === pending) request.current = null;
        if (!abort.signal.aborted) setBusy(false);
      });
    request.current = pending;
    return pending;
  }, [id, valid]);
  useEffect(() => {
    void refresh();
    return () => {
      controller.current?.abort();
      request.current = null;
    };
  }, [refresh]);
  useEffect(() => {
    if (order?.status !== 'PENDING' || denied) return;
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    const poll = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 5000);
    const visible = () => {
      if (document.visibilityState === 'visible') {
        setNow(Date.now());
        void refresh();
      }
    };
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.clearInterval(clock);
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [order?.status, denied, refresh]);
  const remaining = order ? remainingHold(order, now) : null;
  const payable = order?.status === 'PENDING' && Date.parse(order.expiresAt) > now;
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>ĐƠN ĐĂNG KÝ</p>
          <h1>Chi tiết đơn của bạn.</h1>
        </div>
        <Link className={styles.textLink} href="/orders">
          ← Các đơn của tôi
        </Link>
      </header>
      {!valid ? (
        <ErrorPanel message="Mã đơn không hợp lệ." />
      ) : (
        <>
          {error && (
            <ErrorPanel
              message={error}
              retry={
                denied
                  ? undefined
                  : () => {
                      void refresh();
                    }
              }
            />
          )}
          {!order ? (
            !error && <LoadingState label="Đang đọc đơn đăng ký…" />
          ) : (
            <>
              <OrderSummary order={order} link={false} />
              {order.status === 'PENDING' && (
                <section className={styles.notice} aria-label="Giữ chỗ và thanh toán">
                  <h2>Đơn đang chờ thanh toán.</h2>
                  {remaining !== null && remaining > 0 ? (
                    <p>
                      Thời gian giữ chỗ tham khảo:{' '}
                      <span role="timer">{formatRemaining(remaining)}</span>.
                    </p>
                  ) : (
                    <p>
                      Đã đến hạn giữ chỗ. Trạng thái vẫn theo dữ liệu hệ thống; đang kiểm tra cập
                      nhật.
                    </p>
                  )}
                  <p>Tạo đơn chưa hoàn tất thanh toán và chưa cấp quyền học.</p>
                  {order.paymentType === 'CASH' && (
                    <p>Đơn tiền mặt đang chờ mentor được giao thu tiền xác nhận đã nhận đủ tiền.</p>
                  )}
                  <p className="small">
                    Đồng hồ chỉ tham khảo. Hệ thống quyết định trạng thái và thời điểm giải phóng
                    chỗ.
                  </p>
                </section>
              )}
              {order.paymentType === 'PAYOS' && (
                <PaymentPanel
                  orderId={id}
                  payment={order.payment}
                  payable={Boolean(payable)}
                  fresh={!error}
                  onRefresh={refresh}
                />
              )}
              {order.paymentType === 'CASH' && payable && !error && (
                <section className={styles.notice} aria-label="Xem trước lớp giữ chỗ">
                  <h2>Xem lịch trước khi bắt đầu</h2>
                  <p>Trong thời gian giữ chỗ, bạn có thể xem học phần, lịch và phòng học.</p>
                  <ul>
                    {order.details.map((detail) => (
                      <li key={detail.id}>
                        <Link href={`/learning/classes/${detail.classId}/preview`}>
                          Xem trước lớp {detail.className}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {order.status === 'PAID' && (
                <section className={styles.notice} aria-label="Vào lớp học">
                  <h2>Các lớp trong đơn đã thanh toán</h2>
                  <ul>
                    {order.details.map((detail) => (
                      <li key={detail.id}>
                        <Link href={`/learning/classes/${detail.classId}`}>
                          Vào lớp {detail.className}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p>Quyền truy cập được kiểm tra lại khi mở lớp.</p>
                </section>
              )}
              {order.status === 'EXPIRED' && (
                <p className={styles.notice} role="status">
                  Đơn đã hết hạn theo hệ thống. Bạn có thể kiểm tra lớp còn chỗ và tạo đăng ký mới.
                </p>
              )}
              {order.status === 'CANCELLED' && (
                <p className={styles.notice} role="status">
                  Đơn đã bị hủy theo hệ thống.
                </p>
              )}
              <button
                type="button"
                className="button button-secondary"
                disabled={busy}
                onClick={() => void refresh()}
              >
                {busy ? 'Đang cập nhật…' : 'Cập nhật trạng thái từ hệ thống'}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
