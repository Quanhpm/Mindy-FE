'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { canPurchaseClasses, safeReturnTo, useSession } from '@/features/auth/client';
import { ErrorPanel } from '@/shared/components/feedback';
import { Icon } from '@/shared/ui/icon';
import { addCartItem, announceCartChanged, getCart } from '../api/cart.browser';
import { cartErrorMessage, unknownMutationResult } from '../domain/cart-display';
import { CART_MAX_ITEMS, type Cart } from '../schemas/cart.schema';
import styles from './cart.module.css';

export type AddToCartButtonProps = {
  classId: string;
  returnTo: string;
  disabled?: boolean;
  unavailableReason?: string;
};
function StudentAddButton({
  classId,
  disabled = false,
  unavailableReason,
}: Omit<AddToCartButtonProps, 'returnTo'>) {
  const [cart, setCart] = useState<Cart>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [needsRead, setNeedsRead] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const sending = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);
  const exists = cart?.items.some((item) => item.classId === classId) ?? false;
  const atLimit = Boolean(cart && cart.items.length >= CART_MAX_ITEMS && !exists);
  async function add() {
    if (sending.current || disabled || exists || atLimit || needsRead) return;
    const active = new AbortController();
    controller.current = active;
    sending.current = true;
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    let acknowledged = false;
    try {
      await addCartItem(classId, active.signal);
      acknowledged = true;
    } catch (failure) {
      if (active.signal.aborted) return;
      setError(
        unknownMutationResult(failure)
          ? 'Kết quả thêm lớp chưa rõ. Giỏ hàng sẽ được đọc lại trước khi bạn thao tác tiếp.'
          : cartErrorMessage(failure),
      );
    }
    try {
      const current = await getCart(active.signal);
      if (active.signal.aborted) return;
      setCart(current);
      setNeedsRead(false);
      if (acknowledged)
        setMessage(
          current.items.some((item) => item.classId === classId)
            ? 'Đã thêm lớp vào giỏ hàng.'
            : 'Đã tải lại giỏ hàng. Lớp hiện không có trong giỏ.',
        );
      announceCartChanged();
    } catch (failure) {
      if (active.signal.aborted) return;
      setNeedsRead(true);
      setError(
        `${acknowledged ? 'Đã nhận yêu cầu thêm lớp. ' : ''}Chưa tải lại được giỏ hàng. ${cartErrorMessage(failure)}`,
      );
    } finally {
      if (!active.signal.aborted) {
        sending.current = false;
        setBusy(false);
      }
    }
  }
  async function readAgain() {
    if (sending.current) return;
    const active = new AbortController();
    controller.current = active;
    sending.current = true;
    setBusy(true);
    try {
      const current = await getCart(active.signal);
      if (active.signal.aborted) return;
      setCart(current);
      setNeedsRead(false);
      setError(undefined);
      setMessage('Đã đọc lại giỏ hàng.');
    } catch (failure) {
      if (!active.signal.aborted) setError(cartErrorMessage(failure));
    } finally {
      if (!active.signal.aborted) {
        sending.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <div className={styles.addControl} data-cart-add-control>
      {exists ? (
        <Link href="/cart" className="button button-secondary">
          <Icon name="cart" size={18} />
          Đã có trong giỏ · Xem giỏ
        </Link>
      ) : (
        <button
          type="button"
          className="button button-primary"
          disabled={busy || disabled || atLimit || needsRead}
          onClick={() => void add()}
        >
          <Icon name="cart" size={18} />
          {busy ? 'Đang thêm…' : 'Thêm vào giỏ'}
        </button>
      )}
      {(disabled || atLimit) && (
        <p className={styles.help}>
          {atLimit
            ? 'Giỏ hàng đã có 20 lớp.'
            : (unavailableReason ?? 'Lớp hiện không thể đăng ký.')}
        </p>
      )}
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
      {needsRead && (
        <button
          type="button"
          className="button button-secondary"
          disabled={busy}
          onClick={() => void readAgain()}
        >
          Đọc lại giỏ hàng
        </button>
      )}
      {message && (
        <p role="status" className={styles.help}>
          {message}
        </p>
      )}
    </div>
  );
}
export function AddToCartButton(props: AddToCartButtonProps) {
  const { user, state, error, reload } = useSession();
  if (props.disabled)
    return (
      <div className={styles.addControl} data-cart-add-control>
        <button type="button" className="button button-secondary" disabled>
          Thêm vào giỏ
        </button>
        <p className={styles.help}>{props.unavailableReason ?? 'Lớp hiện không thể đăng ký.'}</p>
      </div>
    );
  if (state === 'loading')
    return (
      <button type="button" className="button button-secondary" disabled>
        Đang kiểm tra tài khoản…
      </button>
    );
  if (state === 'error')
    return (
      <ErrorPanel message={error ?? 'Chưa thể kiểm tra tài khoản.'} retry={() => void reload()} />
    );
  if (state !== 'authenticated' || !user) {
    const next = safeReturnTo(props.returnTo, '/courses');
    return (
      <Link href={`/login?${new URLSearchParams({ next })}`} className="button button-primary">
        Đăng nhập để thêm vào giỏ
      </Link>
    );
  }
  if (!canPurchaseClasses(user.role))
    return <p className={styles.help}>Đăng ký lớp dành cho tài khoản học viên.</p>;
  return <StudentAddButton key={`${user.id}:${props.classId}`} {...props} />;
}
