'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { canPurchaseClasses, useSession } from '@/features/auth/client';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import { Icon } from '@/shared/ui/icon';
import { announceCartChanged, getCart, removeCartItem } from '../api/cart.browser';
import {
  cartErrorMessage,
  formatCartAmount,
  formatCartDate,
  unknownMutationResult,
} from '../domain/cart-display';
import type { Cart } from '../schemas/cart.schema';
import styles from './cart.module.css';

function StudentCart() {
  const [cart, setCart] = useState<Cart>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [busyId, setBusyId] = useState<string>();
  const load = useRef<AbortController | null>(null);
  const mutation = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const mounted = useRef(false);
  const reload = useCallback(async () => {
    load.current?.abort();
    const controller = new AbortController();
    load.current = controller;
    const version = ++generation.current;
    setLoading(true);
    setError(undefined);
    try {
      const current = await getCart(controller.signal);
      if (mounted.current && !controller.signal.aborted && version === generation.current)
        setCart(current);
    } catch (failure) {
      if (mounted.current && !controller.signal.aborted && version === generation.current) {
        setCart(undefined);
        setError(cartErrorMessage(failure));
      }
    } finally {
      if (mounted.current && !controller.signal.aborted && version === generation.current)
        setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void reload();
    const changed = () => {
      if (!mutation.current) void reload();
    };
    window.addEventListener('mindy:cart-changed', changed);
    return () => {
      mounted.current = false;
      generation.current += 1;
      load.current?.abort();
      mutation.current?.abort();
      window.removeEventListener('mindy:cart-changed', changed);
    };
  }, [reload]);
  async function remove(classId: string) {
    if (mutation.current) return;
    const controller = new AbortController();
    mutation.current = controller;
    load.current?.abort();
    generation.current += 1;
    setBusyId(classId);
    setLoading(false);
    setMessage(undefined);
    setError(undefined);
    let failureMessage: string | undefined;
    let acknowledged = false;
    try {
      await removeCartItem(classId, controller.signal);
      acknowledged = true;
    } catch (failure) {
      if (controller.signal.aborted) return;
      failureMessage = unknownMutationResult(failure)
        ? 'Kết quả xóa lớp chưa rõ. Đã đọc lại giỏ; kiểm tra trước khi thao tác tiếp.'
        : cartErrorMessage(failure);
    }
    try {
      const current = await getCart(controller.signal);
      if (!mounted.current || controller.signal.aborted) return;
      setCart(current);
      setError(failureMessage);
      if (acknowledged) setMessage('Đã xóa lớp khỏi giỏ hàng.');
      announceCartChanged();
    } catch (failure) {
      if (!mounted.current || controller.signal.aborted) return;
      setCart(undefined);
      setError(
        `${failureMessage ?? (acknowledged ? 'Đã xóa lớp. ' : '')} Chưa tải lại được giỏ hàng. ${cartErrorMessage(failure)}`,
      );
    } finally {
      if (mounted.current && !controller.signal.aborted) {
        mutation.current = null;
        setBusyId(undefined);
      }
    }
  }
  const unavailable = cart?.items.some((item) => !item.isPurchasable) ?? false;
  return (
    <section className={styles.page}>
      <div className={styles.masthead}>
        <span>THE MINDY JOURNAL / GIỎ HÀNG</span>
        <span>MỘT KHỞI ĐẦU MỚI</span>
      </div>
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">HÀNH TRÌNH BẠN ĐÃ CHỌN</p>
          <h1>Giỏ hàng của bạn.</h1>
          <p className={styles.help}>
            Mỗi lớp là một suất học dành cho bạn. Giỏ hàng có tối đa 20 lớp.
          </p>
        </div>
        <Link href="/courses" className={styles.textLink}>
          Tiếp tục khám phá <Icon name="arrow" size={18} />
        </Link>
      </div>
      {error && (
        <ErrorPanel
          message={error}
          retry={() => {
            if (!mutation.current) void reload();
          }}
        />
      )}
      {message && (
        <p role="status" className="success-notice">
          {message}
        </p>
      )}
      {loading ? (
        <LoadingState label="Đang mở giỏ hàng của bạn…" />
      ) : (
        cart &&
        (cart.items.length > 0 ? (
          <div className={styles.layout}>
            <section aria-label="Lớp trong giỏ hàng">
              <div className={styles.listHeading}>
                <span>LỚP ĐÃ CHỌN</span>
                <span>{cart.items.length} lớp</span>
              </div>
              {cart.items.map((item) => (
                <article className={styles.item} key={item.classId} aria-label={item.className}>
                  <div className={styles.itemInfo}>
                    <p className="eyebrow">
                      {item.classCode} /{' '}
                      {item.deliveryMode === 'ONLINE' ? 'TRỰC TUYẾN' : 'TẠI TRUNG TÂM'}
                    </p>
                    <h2>
                      <Link href={`/classes/${item.classId}`}>{item.className}</Link>
                    </h2>
                    <Link href={`/courses/${item.courseId}`} className={styles.courseLink}>
                      {item.courseTitle}
                    </Link>
                    <p className={styles.help}>
                      {formatCartDate(item.startDate)} – {formatCartDate(item.endDate)} · 1 suất học
                    </p>
                    {!item.isPurchasable && (
                      <p className={styles.unavailable}>
                        Lớp hiện không thể đăng ký. Hãy bỏ lớp này trước khi tạo đơn.
                      </p>
                    )}
                    <button
                      type="button"
                      className={styles.removeButton}
                      disabled={Boolean(busyId)}
                      aria-label={`Xóa ${item.className} khỏi giỏ`}
                      onClick={() => void remove(item.classId)}
                    >
                      <Icon name="trash" size={16} />
                      {busyId === item.classId ? 'Đang xóa…' : 'Xóa khỏi giỏ'}
                    </button>
                  </div>
                  <div className={styles.price}>
                    <strong>{formatCartAmount(item.currentPriceAmount)}</strong>
                    <span>Học phí hiện tại</span>
                    <span>Giá khi thêm: {formatCartAmount(item.priceSnapshot)}</span>
                    {item.priceSnapshot !== item.currentPriceAmount && (
                      <p className={styles.changedPrice}>Học phí đã thay đổi.</p>
                    )}
                  </div>
                </article>
              ))}
            </section>
            <aside className={styles.aside} aria-label="Tóm tắt giỏ hàng">
              <div className={styles.summary}>
                <p className="eyebrow">YOUR NEXT CHAPTER</p>
                <h2>Khởi đầu của bạn.</h2>
                <div className={styles.summaryRow}>
                  <span>Số lớp</span>
                  <strong>{cart.items.length}</strong>
                </div>
                <div className={styles.total}>
                  <span>Tổng học phí hiện tại</span>
                  <strong data-cart-total>{formatCartAmount(cart.totalAmount)}</strong>
                </div>
                {unavailable || busyId ? (
                  <button type="button" className="button button-primary button-full" disabled>
                    Tiếp tục tạo đơn
                  </button>
                ) : (
                  <Link href="/checkout" className="button button-primary button-full">
                    Tiếp tục tạo đơn <Icon name="arrow" size={18} />
                  </Link>
                )}
                <p className={styles.help}>
                  {unavailable
                    ? 'Bỏ các lớp không thể đăng ký để tiếp tục.'
                    : 'Giá và chỗ học được kiểm tra lại khi tạo đơn. Thêm vào giỏ chưa giữ chỗ.'}
                </p>
              </div>
            </aside>
          </div>
        ) : (
          <section className={styles.empty} aria-label="Giỏ hàng trống">
            <Icon name="cart" size={40} />
            <p className="eyebrow">MỘT KHOẢNG TRỐNG CHO ĐIỀU MỚI</p>
            <h2>Chọn một lớp để bắt đầu.</h2>
            <p>Giỏ hàng của bạn đang trống.</p>
            <Link href="/courses" className="button button-primary">
              Khám phá khóa học <Icon name="arrow" size={18} />
            </Link>
          </section>
        ))
      )}
    </section>
  );
}
export function CartPage() {
  const { user, state, error, reload } = useSession();
  if (state === 'error')
    return (
      <ErrorPanel message={error ?? 'Chưa thể kiểm tra tài khoản.'} retry={() => void reload()} />
    );
  if (state !== 'authenticated' || !user) return <LoadingState label="Đang kiểm tra tài khoản…" />;
  if (!canPurchaseClasses(user.role))
    return (
      <section className="empty-state">
        <h1>Giỏ hàng dành cho học viên</h1>
        <p>Tài khoản hiện tại không có quyền đăng ký lớp.</p>
        <Link href="/courses" className="button button-secondary">
          Khám phá khóa học
        </Link>
      </section>
    );
  return <StudentCart key={user.id} />;
}
