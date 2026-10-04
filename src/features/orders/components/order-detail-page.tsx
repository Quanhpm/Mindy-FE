'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import { ApiError } from '@/shared/lib/http/api-error';
import { getOrder } from '../api/orders.browser';
import { formatRemaining, orderErrorMessage, remainingHold } from '../domain/order-display';
import type { Order } from '../schemas/order.schema';
import { OrderSummary } from './order-summary';
import styles from './orders.module.css';
import { StudentArea } from './student-area';

export function OrderDetailPage({ id }: { id: string }) {
  return (
    <StudentArea>{(userId) => <OrderDetailContent key={`${userId}:${id}`} id={id} />}</StudentArea>
  );
}
function OrderDetailContent({ id }: { id: string }) {
  const [order, setOrder] = useState<Order>();
  const [error, setError] = useState<string>();
  const [denied, setDenied] = useState(false);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(true);
  const [now, setNow] = useState(Date.now());
  const valid = z.uuid().safeParse(id).success;
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision is explicit/server deadline refresh.
  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    setBusy(true);
    setError(undefined);
    void getOrder(id, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setOrder(value);
          setDenied(false);
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(orderErrorMessage(cause));
          setDenied(cause instanceof ApiError && [403, 404].includes(cause.status));
          if (cause instanceof ApiError && [403, 404].includes(cause.status)) setOrder(undefined);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [id, valid, revision]);
  const status = order?.status;
  const deadline = order?.expiresAt;
  useEffect(() => {
    if (status !== 'PENDING' || !deadline) return;
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    let poll: number;
    const refresh = () => {
      setRevision((value) => value + 1);
      poll = window.setTimeout(refresh, 30_000);
    };
    poll = window.setTimeout(refresh, Math.max(0, Date.parse(deadline) - Date.now()));
    return () => {
      window.clearInterval(clock);
      window.clearTimeout(poll);
    };
  }, [status, deadline]);
  const remaining = order ? remainingHold(order, now) : null;
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>THE MINDY JOURNAL / ĐƠN ĐĂNG KÝ</p>
          <h1>Chi tiết đơn của bạn.</h1>
        </div>
        <Link className={styles.textLink} href="/orders">
          ← Các đơn của tôi
        </Link>
      </header>
      {!valid ? (
        <ErrorPanel message="Mã đơn không hợp lệ." />
      ) : error ? (
        <ErrorPanel
          message={error}
          retry={denied ? undefined : () => setRevision((value) => value + 1)}
        />
      ) : !order ? (
        <LoadingState label="Đang đọc đơn đăng ký…" />
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
                  Đã đến hạn giữ chỗ. Trạng thái vẫn theo dữ liệu hệ thống; đang kiểm tra cập nhật.
                </p>
              )}
              <p>
                Chưa có link/QR PayOS hoặc xác nhận tiền mặt. Tạo đơn chưa hoàn tất thanh toán và
                chưa cấp quyền học.
              </p>
              <p className="small">
                Đồng hồ chỉ tham khảo. Hệ thống quyết định trạng thái và thời điểm giải phóng chỗ.
              </p>
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
            onClick={() => setRevision((value) => value + 1)}
          >
            {busy ? 'Đang cập nhật…' : 'Cập nhật trạng thái từ hệ thống'}
          </button>
        </>
      )}
    </div>
  );
}
