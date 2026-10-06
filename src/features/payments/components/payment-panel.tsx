'use client';
import { useEffect, useRef, useState } from 'react';
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
  const controller = useRef<AbortController | null>(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, []);
  async function create() {
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
  }
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
  return (
    <section className={s.panel} aria-label="Thanh toán PayOS">
      <h2>Thanh toán PayOS</h2>
      {payment ? (
        <>
          <p role="status">{paymentStatusLabels[payment.status]}</p>
          <p>
            {payment.amount.toLocaleString('vi-VN')} ₫ · Hạn thanh toán:{' '}
            {formatDate(payment.expiresAt, true)}
          </p>
        </>
      ) : (
        <p>Chưa tạo link thanh toán cho đơn này.</p>
      )}
      {payment?.status === 'REQUIRES_REVIEW' && (
        <p>
          Giao dịch cần được quản trị viên đối soát. Quyền học chưa được xác nhận từ trạng thái này.
        </p>
      )}
      {payment?.status === 'CREATING' && (
        <p>Hệ thống đang xử lý. Kiểm tra lại hoặc tiếp tục tạo link trên cùng đơn.</p>
      )}
      {error && <ErrorPanel message={error} />}
      {uncertain && (
        <p role="status">
          Chưa đọc được kết quả mới nhất. Kiểm tra trạng thái trước khi thử tạo link lại.
        </p>
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
          <figcaption>
            Quét mã bằng ứng dụng ngân hàng để thanh toán đúng số tiền của đơn.
          </figcaption>
        </figure>
      )}
      {link && (
        <a className="button button-primary" href={link} target="_blank" rel="noopener noreferrer">
          Mở PayOS để thanh toán
        </a>
      )}
      {payable &&
        !link &&
        !qr &&
        (!payment || ['CREATING', 'PENDING'].includes(payment.status)) && (
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
      {link && (
        <p className="small">
          {qr
            ? 'Giữ trang này mở để theo dõi kết quả thanh toán.'
            : 'QR chưa có trong dữ liệu hiện tại. Bạn có thể thanh toán trên trang PayOS.'}
        </p>
      )}
    </section>
  );
}
