'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { ErrorPanel } from '@/shared/components/feedback';
import { formatDate } from '@/shared/lib/date';
import { createPayosPayment, paymentErrorMessage } from '../api/payments.browser';
import { type Payment, paymentStatusLabels } from '../schemas/payment.schema';
import s from './payment-panel.module.css';

export function PaymentPanel({
  orderId,
  payment,
  payable,
  fresh,
  onRefresh,
}: {
  orderId: string;
  payment: Payment | null;
  payable: boolean;
  fresh: boolean;
  onRefresh: () => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState<string>();
  const locked = useRef(false);
  const autoCreateAttempted = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const deferredAbort = useRef<number | null>(null);
  const active = useRef(true);
  useEffect(() => {
    if (deferredAbort.current !== null) {
      window.clearTimeout(deferredAbort.current);
      deferredAbort.current = null;
    }
    active.current = true;
    return () => {
      active.current = false;
      // React Strict Mode replays effects in development. Defer cancellation so
      // the immediate replay can keep the same single-flight mutation alive,
      // while a real unmount still aborts it on the next task.
      deferredAbort.current = window.setTimeout(() => controller.current?.abort(), 0);
    };
  }, []);
  const create = useCallback(async () => {
    if (locked.current || uncertain || !fresh || !payable) return;
    locked.current = true;
    setBusy(true);
    setError(undefined);
    controller.current = new AbortController();
    try {
      await createPayosPayment(orderId, controller.current.signal);
      if (!active.current) return;
      // GET order is authoritative after both successful and unknown mutations.
      setUncertain(true);
      if (await onRefresh()) {
        if (active.current) setUncertain(false);
      }
    } catch (cause) {
      if (!active.current) return;
      setError(paymentErrorMessage(cause));
      setUncertain(true);
      if (await onRefresh()) {
        if (active.current) setUncertain(false);
      }
    } finally {
      locked.current = false;
      if (active.current) setBusy(false);
    }
  }, [fresh, onRefresh, orderId, payable, uncertain]);
  useEffect(() => {
    if (payment || !payable || !fresh || autoCreateAttempted.current) return;
    autoCreateAttempted.current = true;
    void create();
  }, [create, fresh, payable, payment]);
  async function check() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      if (await onRefresh()) {
        if (active.current) {
          setUncertain(false);
          setError(undefined);
        }
      }
    } finally {
      locked.current = false;
      if (active.current) setBusy(false);
    }
  }
  const link =
    fresh && payable && payment?.status === 'PENDING' && !uncertain ? payment.checkoutUrl : null;
  const qr =
    fresh &&
    payable &&
    !uncertain &&
    payment?.status === 'PENDING' &&
    Date.parse(payment.expiresAt) > Date.now() &&
    payment.qrCode?.trim() &&
    new TextEncoder().encode(payment.qrCode).length <= 2953
      ? payment.qrCode
      : null;
  const canCreate =
    payable && !link && !qr && (!payment || ['CREATING', 'PENDING'].includes(payment.status));
  return (
    <section className={s.panel} aria-label="Thanh toán PayOS">
      <header className={s.header}>
        <div>
          <p className={s.eyebrow}>CỔNG THANH TOÁN TRỰC TUYẾN</p>
          <h2>Thanh toán PayOS</h2>
          <p className={s.intro}>Quét mã bằng ứng dụng ngân hàng hoặc mở trang PayOS.</p>
        </div>
        {payment && (
          <span className={s.status} data-status={payment.status} role="status">
            <span aria-hidden="true" />
            {paymentStatusLabels[payment.status]}
          </span>
        )}
      </header>
      {error && <ErrorPanel message={error} />}
      {uncertain && (
        <p className={s.recovery} role="status">
          Chưa đọc được kết quả mới nhất. Kiểm tra trạng thái trước khi thử tạo link lại.
        </p>
      )}
      <div className={s.content} data-has-qr={Boolean(qr)}>
        {payment ? (
          <div className={s.details}>
            <div className={s.amountBlock}>
              <span className={s.amountLabel}>Số tiền cần thanh toán</span>
              <strong>{payment.amount.toLocaleString('vi-VN')} ₫</strong>
            </div>
            <dl className={s.meta}>
              <div>
                <dt>Hạn thanh toán</dt>
                <dd>
                  <time dateTime={payment.expiresAt}>{formatDate(payment.expiresAt, true)}</time>
                </dd>
              </div>
              <div>
                <dt>Phương thức</dt>
                <dd>Chuyển khoản qua PayOS</dd>
              </div>
            </dl>
            {payment.status === 'REQUIRES_REVIEW' && (
              <p className={s.statusNote}>
                Giao dịch cần được quản trị viên đối soát. Quyền học chưa được xác nhận từ trạng
                thái này.
              </p>
            )}
            {payment.status === 'CREATING' && (
              <p className={s.statusNote}>
                Hệ thống đang xử lý. Kiểm tra lại hoặc tiếp tục tạo link trên cùng đơn.
              </p>
            )}
            {payment.status === 'PENDING' && (
              <ol className={s.steps} aria-label="Hướng dẫn thanh toán">
                <li>Mở ứng dụng ngân hàng và chọn quét mã QR.</li>
                <li>Kiểm tra đúng số tiền trước khi xác nhận.</li>
                <li>Giữ trang này mở để hệ thống cập nhật kết quả.</li>
              </ol>
            )}
          </div>
        ) : (
          <div className={s.emptyPayment}>
            <span className={s.emptyIcon} aria-hidden="true">
              QR
            </span>
            <div>
              <h3>{busy ? 'Đang tạo mã thanh toán…' : 'Sẵn sàng tạo mã thanh toán'}</h3>
              <p>
                {busy
                  ? 'Vui lòng chờ trong giây lát, không cần tải lại trang.'
                  : 'Link và mã QR PayOS sẽ được tạo riêng, an toàn cho đơn này.'}
              </p>
            </div>
          </div>
        )}
        {qr && (
          <figure className={s.qr}>
            <div className={s.qrFrame}>
              <QRCode
                value={qr}
                size={240}
                level="L"
                bgColor="var(--mindy-white)"
                fgColor="var(--mindy-ink)"
                title="QR thanh toán PayOS"
                role="img"
              />
            </div>
            <figcaption>Đưa mã QR vào khung quét của ứng dụng ngân hàng.</figcaption>
          </figure>
        )}
        <div className={s.actions}>
          {link && (
            <a
              className="button button-primary"
              href={link}
              target="_blank"
              rel="noopener noreferrer"
            >
              Mở PayOS để thanh toán
              <span aria-hidden="true">↗</span>
            </a>
          )}
          {canCreate && (
            <button
              type="button"
              className="button button-primary"
              disabled={busy || uncertain || !fresh}
              onClick={() => void create()}
            >
              {busy
                ? 'Đang xử lý thanh toán…'
                : payment
                  ? 'Tiếp tục tạo link PayOS'
                  : 'Tạo link PayOS'}
            </button>
          )}
          {uncertain && (
            <button
              type="button"
              className="button button-secondary"
              disabled={busy}
              onClick={() => void check()}
            >
              Kiểm tra kết quả tạo link
            </button>
          )}
          {link && !qr && (
            <p className={s.actionHint}>
              QR chưa có trong dữ liệu hiện tại. Bạn vẫn có thể thanh toán an toàn trên trang PayOS.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
