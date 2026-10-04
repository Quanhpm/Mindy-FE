'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import { listOrders } from '../api/orders.browser';
import { orderErrorMessage } from '../domain/order-display';
import {
  type OrderPage,
  orderFiltersSchema,
  orderStatuses,
  orderStatusLabels,
} from '../schemas/order.schema';
import { OrderSummary } from './order-summary';
import styles from './orders.module.css';
import { StudentArea } from './student-area';

export function OrdersPage() {
  return <StudentArea>{(userId) => <OrdersContent key={userId} />}</StudentArea>;
}
function OrdersContent() {
  const params = useSearchParams();
  const router = useRouter();
  const filters = orderFiltersSchema.parse({
    page: params.get('page') ?? 1,
    pageSize: params.get('pageSize') ?? 20,
    status: params.get('status') ?? undefined,
  });
  const query = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
    ...(filters.status ? { status: filters.status } : {}),
  }).toString();
  const [data, setData] = useState<OrderPage>();
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision is explicit retry.
  useEffect(() => {
    const controller = new AbortController();
    setData(undefined);
    setError(undefined);
    void listOrders(query, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(orderErrorMessage(cause));
      });
    return () => controller.abort();
  }, [query, revision]);
  function change(key: string, value: string): void {
    const next = new URLSearchParams(query);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.set('page', '1');
    router.replace(`/orders?${next}`, { scroll: false });
  }
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>THE MINDY JOURNAL / ĐƠN CỦA TÔI</p>
          <h1>Những bước đã chọn.</h1>
          <p className="muted">Các đơn đăng ký thuộc tài khoản của bạn.</p>
        </div>
        <Link className={styles.textLink} href="/cart">
          Về giỏ hàng →
        </Link>
      </header>
      <div className={styles.filters}>
        <div className={`field ${styles.filterField}`}>
          <label htmlFor="order-status">Trạng thái đơn</label>
          <select
            id="order-status"
            value={filters.status ?? ''}
            onChange={(event) => change('status', event.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            {orderStatuses.map((status) => (
              <option key={status} value={status}>
                {orderStatusLabels[status]}
              </option>
            ))}
          </select>
        </div>
        <div className={`field ${styles.filterField}`}>
          <label htmlFor="order-page-size">Số đơn mỗi trang</label>
          <select
            id="order-page-size"
            value={filters.pageSize}
            onChange={(event) => change('pageSize', event.target.value)}
          >
            {[...new Set([10, 20, 50, 100, filters.pageSize])]
              .sort((a, b) => a - b)
              .map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
          </select>
        </div>
      </div>
      {error ? (
        <ErrorPanel message={error} retry={() => setRevision((value) => value + 1)} />
      ) : !data ? (
        <LoadingState label="Đang đọc đơn của bạn…" />
      ) : !data.items.length ? (
        <section className={styles.empty}>
          <h2>Chưa có đơn phù hợp.</h2>
          <p>Đơn mới sẽ xuất hiện sau khi bạn tạo đơn giữ chỗ từ giỏ hàng.</p>
          <Link className="button button-primary" href="/courses">
            Khám phá khóa học
          </Link>
        </section>
      ) : (
        <div className={styles.results}>
          {data.items.map((order) => (
            <OrderSummary key={order.id} order={order} />
          ))}
        </div>
      )}
      {data && (
        <div className={styles.pagination}>
          <span>
            {data.total} đơn · Trang {data.page}
          </span>
          <div className={styles.actions}>
            <button
              className="button button-secondary"
              type="button"
              disabled={filters.page <= 1}
              onClick={() => change('page', String(filters.page - 1))}
            >
              Trước
            </button>
            <button
              className="button button-secondary"
              type="button"
              disabled={filters.page * filters.pageSize >= data.total}
              onClick={() => change('page', String(filters.page + 1))}
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
