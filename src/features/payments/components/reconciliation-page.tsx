'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { canManageUsers, useSession } from '@/features/auth/client';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import s from '@/shared/components/management.module.css';
import { formatDate } from '@/shared/lib/date';
import { listReconciliation, paymentErrorMessage, reconcilePayment } from '../api/payments.browser';
import type { ReconciliationPage as ReviewPage } from '../schemas/payment.schema';

export function ReconciliationPage() {
  const { user, state } = useSession();
  if (!user || state !== 'authenticated') return <LoadingState />;
  if (!canManageUsers(user.role))
    return <ErrorPanel message="Khu vực này dành cho quản trị viên." />;
  return <ReviewContent key={user.id} />;
}
function ReviewContent() {
  const params = useSearchParams();
  const router = useRouter();
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(1_000_000)
    .catch(1)
    .parse(params.get('page') ?? 1);
  const [data, setData] = useState<ReviewPage>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<string>();
  const [result, setResult] = useState<string>();
  const [revision, setRevision] = useState(0);
  const locked = useRef(false);
  const mutation = useRef<AbortController | null>(null);
  const [uncertain, setUncertain] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: explicit retry/reconcile refresh.
  useEffect(() => {
    const controller = new AbortController();
    setData(undefined);
    setError(undefined);
    void listReconciliation(page, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setData(value);
          setUncertain(false);
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(paymentErrorMessage(cause));
      });
    return () => controller.abort();
  }, [page, revision]);
  useEffect(() => () => mutation.current?.abort(), []);
  const reconcile = useCallback(
    async (paymentId: string) => {
      if (locked.current || uncertain) return;
      locked.current = true;
      setBusy(paymentId);
      setResult(undefined);
      const controller = new AbortController();
      mutation.current = controller;
      try {
        const status = await reconcilePayment(paymentId, controller.signal);
        if (!controller.signal.aborted)
          setResult(
            `Kết quả từ hệ thống: ${status}. Các giao dịch cần review có thể vẫn còn trong danh sách.`,
          );
      } catch (cause) {
        if (!controller.signal.aborted) setResult(paymentErrorMessage(cause));
      } finally {
        locked.current = false;
        if (!controller.signal.aborted) {
          setBusy(undefined);
          setUncertain(true);
          setRevision((value) => value + 1);
        }
      }
    },
    [uncertain],
  );
  return (
    <div className={s.page}>
      <header className={s.heading}>
        <div>
          <p className={s.eyebrow}>MINDY / PAYMENT REVIEW</p>
          <h1>Đối soát thanh toán</h1>
          <p>
            Các sự kiện cần kiểm tra. Đối soát đọc dữ liệu từ PayOS; không tự cấp quyền hoặc hoàn
            tiền.
          </p>
        </div>
      </header>
      {result && (
        <p className={s.notice} role="status">
          {result}
        </p>
      )}
      {error ? (
        <ErrorPanel message={error} retry={() => setRevision((value) => value + 1)} />
      ) : !data ? (
        <LoadingState label="Đang tải giao dịch cần đối soát…" />
      ) : (
        <>
          {data.items.length === 0 ? (
            <p className={s.notice}>Chưa có sự kiện cần đối soát.</p>
          ) : (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Mã / thời điểm</th>
                    <th>Số tiền</th>
                    <th>Lý do / nguồn</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.providerOrderCode}
                        <br />
                        {item.referenceCode}
                        <br />
                        {formatDate(item.createdAt, true)}
                      </td>
                      <td>
                        {item.amount.toLocaleString('vi-VN')} {item.currency}
                      </td>
                      <td>
                        {item.reason ?? 'Chưa có lý do'}
                        <br />
                        {item.source}
                        {item.actorId && <p>Mã người thao tác: {item.actorId}</p>}
                      </td>
                      <td>
                        {item.paymentId ? (
                          <button
                            type="button"
                            className={s.secondaryButton}
                            disabled={Boolean(busy) || uncertain}
                            onClick={() => void reconcile(item.paymentId as string)}
                          >
                            {busy === item.paymentId ? 'Đang đối soát…' : 'Đối soát với PayOS'}
                          </button>
                        ) : (
                          'Chưa liên kết payment'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className={s.pagination}>
            <span>
              {data.total} sự kiện cần review · Trang {data.page}
            </span>
            <div className={s.actions}>
              <button
                className={s.secondaryButton}
                type="button"
                disabled={page <= 1 || Boolean(busy)}
                onClick={() => router.replace(`?page=${page - 1}`)}
              >
                Trước
              </button>
              <button
                className={s.secondaryButton}
                type="button"
                disabled={page * data.pageSize >= data.total || Boolean(busy)}
                onClick={() => router.replace(`?page=${page + 1}`)}
              >
                Sau
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
