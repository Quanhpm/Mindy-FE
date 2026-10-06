'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { announceCartChanged, getCart } from '@/features/cart/client';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import { checkout, listOrders } from '../api/orders.browser';
import { CheckoutFlow, type CheckoutState, initialCheckoutState } from '../domain/checkout-flow';
import { formatAmount } from '../domain/order-display';
import type { PaymentType } from '../schemas/order.schema';
import { OrderSummary } from './order-summary';
import styles from './orders.module.css';
import { StudentArea } from './student-area';

export function CheckoutPage() {
  return <StudentArea>{(userId) => <CheckoutContent key={userId} />}</StudentArea>;
}

function CheckoutContent() {
  const [state, setState] = useState<CheckoutState>(initialCheckoutState);
  const [paymentType, setPaymentType] = useState<PaymentType>('CASH');
  const flow = useRef<CheckoutFlow | null>(null);
  useEffect(() => {
    const active = new CheckoutFlow(
      { getCart, recentOrders: (signal) => listOrders('page=1&pageSize=100', signal), checkout },
      setState,
    );
    flow.current = active;
    void active.load();
    return () => {
      active.dispose();
      if (flow.current === active) flow.current = null;
    };
  }, []);
  useEffect(() => {
    if (state.phase === 'recovered') announceCartChanged();
  }, [state.phase]);

  const result = state.phase === 'success' || state.phase === 'recovered';
  const uncertain = ['checking', 'unknown', 'retryable'].includes(state.phase);
  const busy = ['loading', 'submitting', 'checking'].includes(state.phase);
  const unavailable = Boolean(state.cart?.items.some((item) => !item.isPurchasable));
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>ĐĂNG KÝ LỚP HỌC</p>
          <h1>{result ? 'Đơn đăng ký của bạn.' : 'Bước tiếp theo của bạn.'}</h1>
          <p className="muted">Tạo đơn và giữ chỗ cho các lớp đã chọn.</p>
        </div>
        <Link className={styles.textLink} href="/orders">
          Đơn của tôi →
        </Link>
      </header>
      <p className={styles.notice}>
        Đây là bước tạo đơn và giữ chỗ, chưa hoàn tất thanh toán. PayOS chưa có link hoặc QR; tiền
        mặt chưa có chức năng xác nhận. Quyền học sẽ theo trạng thái được hệ thống cấp.
      </p>
      {state.phase === 'loading' ? (
        <LoadingState label="Đang đọc giỏ hàng và đơn của bạn…" />
      ) : state.phase === 'error' ? (
        <ErrorPanel
          message={state.message ?? 'Chưa thể tải dữ liệu.'}
          retry={() => void flow.current?.load()}
        />
      ) : result ? (
        <section aria-label="Kết quả đăng ký">
          <p className={styles.notice} role="status">
            {state.phase === 'success'
              ? `Đã tạo ${state.orders.length} đơn đăng ký. Vui lòng xem đủ các đơn và trạng thái bên dưới; bước tạo đơn chưa xác nhận thanh toán.`
              : state.message}
          </p>
          <div className={styles.results}>
            {state.orders.map((order) => (
              <OrderSummary key={order.id} order={order} />
            ))}
          </div>
          {state.phase === 'success' && state.message && (
            <p className={styles.notice}>{state.message}</p>
          )}
          <div className={styles.actions}>
            <Link className="button button-primary" href="/orders">
              Xem tất cả đơn
            </Link>
            <Link className="button button-secondary" href="/cart">
              Kiểm tra giỏ hàng
            </Link>
          </div>
        </section>
      ) : (
        <>
          {uncertain && (
            <section className={styles.recovery} aria-label="Kiểm tra kết quả tạo đơn">
              <h2>Kết quả cần được kiểm tra.</h2>
              <p role="status">{state.message}</p>
              <div className={styles.actions}>
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={busy}
                  onClick={() => void flow.current?.reconcile()}
                >
                  {state.phase === 'checking' ? 'Đang kiểm tra…' : 'Kiểm tra lại đơn và giỏ'}
                </button>
                <Link className={styles.textLink} href="/orders">
                  Mở lịch sử đơn
                </Link>
              </div>
              {state.observedOrders.length > 0 && (
                <ul className={styles.recentOrders}>
                  {state.observedOrders.map((order) => (
                    <li key={order.id}>
                      <Link href={`/orders/${order.id}`}>{order.orderCode}</Link>
                      <span>{formatAmount(order.totalAmount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          {!uncertain && state.message && (
            <p className="inline-error" role="alert">
              {state.message}
            </p>
          )}
          {state.cart?.items.length ? (
            <div className={styles.checkoutLayout}>
              <section aria-label="Các lớp được đăng ký" className={styles.cartItems}>
                <h2>Lớp bạn đã chọn</h2>
                {state.cart.items.map((item) => (
                  <article key={item.classId} className={styles.cartItem}>
                    <div>
                      <p className={styles.eyebrow}>
                        {item.deliveryMode === 'ONLINE' ? 'TRỰC TUYẾN' : 'TẠI TRUNG TÂM'}
                      </p>
                      <h3>{item.courseTitle}</h3>
                      <p>
                        {item.className} · {item.classCode}
                      </p>
                      <p className="muted small">
                        {item.startDate.split('-').reverse().join('/')} –{' '}
                        {item.endDate.split('-').reverse().join('/')}
                      </p>
                      {!item.isPurchasable && (
                        <p className="inline-error">
                          Lớp này chưa thể đăng ký. Vui lòng kiểm tra giỏ hàng.
                        </p>
                      )}
                    </div>
                    <strong className={styles.amount}>
                      {formatAmount(item.currentPriceAmount)}
                    </strong>
                  </article>
                ))}
                <Link className={styles.textLink} href="/cart">
                  ← Chỉnh sửa giỏ hàng
                </Link>
              </section>
              <aside className={styles.summary}>
                <p className={styles.eyebrow}>YOUR NEXT CHAPTER</p>
                <h2>Tạo đơn giữ chỗ.</h2>
                <div className={styles.total}>
                  <span>{state.cart.items.length} lớp · Tổng hiện tại</span>
                  <strong>{formatAmount(state.cart.totalAmount)}</strong>
                </div>
                <p className="muted small">
                  Giá và tổng cuối cùng do hệ thống tính tại thời điểm tạo đơn.
                </p>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void flow.current?.submit(paymentType);
                  }}
                >
                  <fieldset
                    disabled={busy || (uncertain && state.phase !== 'retryable')}
                    className={styles.payment}
                  >
                    <legend>Phương thức dự kiến</legend>
                    <label>
                      <input
                        type="radio"
                        name="paymentType"
                        value="CASH"
                        checked={paymentType === 'CASH'}
                        onChange={() => setPaymentType('CASH')}
                      />
                      <span>
                        <strong>Tiền mặt</strong>
                        <small>Tách một đơn cho mỗi mentor.</small>
                      </span>
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="paymentType"
                        value="PAYOS"
                        checked={paymentType === 'PAYOS'}
                        onChange={() => setPaymentType('PAYOS')}
                      />
                      <span>
                        <strong>PayOS</strong>
                        <small>Một đơn cho toàn bộ giỏ. Tạo link PayOS ở chi tiết đơn.</small>
                      </span>
                    </label>
                  </fieldset>
                  <button
                    type="submit"
                    className="button button-primary button-full"
                    disabled={busy || unavailable || !['ready', 'retryable'].includes(state.phase)}
                  >
                    {state.phase === 'submitting'
                      ? 'Đang tạo đơn…'
                      : state.phase === 'retryable'
                        ? 'Tạo đơn lại sau khi kiểm tra'
                        : 'Tạo đơn giữ chỗ'}
                  </button>
                </form>
              </aside>
            </div>
          ) : (
            <section className={styles.empty}>
              <h2>Giỏ hàng hiện đang trống.</h2>
              <p>
                {uncertain
                  ? 'Kết quả tạo đơn chưa được xác định. Hãy kiểm tra lịch sử đơn trước khi đăng ký thêm.'
                  : 'Chọn lớp phù hợp rồi quay lại để tạo đơn.'}
              </p>
              <Link className="button button-primary" href={uncertain ? '/orders' : '/courses'}>
                {uncertain ? 'Xem đơn của tôi' : 'Khám phá khóa học'}
              </Link>
            </section>
          )}
        </>
      )}
    </div>
  );
}
