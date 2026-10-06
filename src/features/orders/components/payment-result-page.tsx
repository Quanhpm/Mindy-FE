'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import { ApiError } from '@/shared/lib/http/api-error';
import { providerOrderCodeSchema, resolvePaymentResult } from '../api/orders.browser';
import { orderErrorMessage } from '../domain/order-display';
import styles from './orders.module.css';
import { StudentArea } from './student-area';

export function PaymentResultPage() {
  const params = useSearchParams();
  const codes = params.getAll('orderCode');
  const code = codes.length === 1 ? codes[0] : undefined;
  return (
    <StudentArea>{(userId) => <ResultContent key={`${userId}:${code}`} code={code} />}</StudentArea>
  );
}
function ResultContent({ code }: { code?: string }) {
  const router = useRouter();
  const valid = providerOrderCodeSchema.safeParse(code).success;
  const [error, setError] = useState<string>();
  const [denied, setDenied] = useState(false);
  const [revision, setRevision] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: explicit read retry.
  useEffect(() => {
    if (!valid || !code) return;
    const controller = new AbortController();
    setError(undefined);
    void resolvePaymentResult(code, controller.signal)
      .then((order) => {
        if (!controller.signal.aborted) router.replace(`/orders/${order.id}`);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setDenied(cause instanceof ApiError && [403, 404].includes(cause.status));
          setError(orderErrorMessage(cause));
        }
      });
    return () => controller.abort();
  }, [code, valid, router, revision]);
  return (
    <section className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>Kiểm tra thanh toán.</h1>
          <p>Trạng thái đơn được xác nhận từ hệ thống sau khi bạn trở về từ PayOS.</p>
        </div>
      </header>
      {!valid ? (
        <ErrorPanel message="Thiếu hoặc sai mã thanh toán PayOS." />
      ) : error ? (
        <ErrorPanel message={error} retry={denied ? undefined : () => setRevision((v) => v + 1)} />
      ) : (
        <LoadingState label="Đang tìm đơn và đọc trạng thái thanh toán…" />
      )}
      <Link className={styles.textLink} href="/orders">
        Về các đơn của tôi
      </Link>
    </section>
  );
}
