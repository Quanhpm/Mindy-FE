'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRef } from 'react';
import { safeReturnTo, useSession } from '@/features/auth/client';
import { Brand } from '@/shared/ui/brand';
import { Icon } from '@/shared/ui/icon';
import styles from './public-shell.module.css';

export function PublicShell({ children }: { children: React.ReactNode }) {
  const { user, state } = useSession();
  const pathname = usePathname();
  const params = useSearchParams();
  const query = params.toString();
  const returnTo = safeReturnTo(`${pathname}${query ? `?${query}` : ''}`, '/courses');
  const drawer = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const navigation = (
    <>
      <Link
        href="/courses"
        aria-current={pathname.startsWith('/courses') ? 'page' : undefined}
        onClick={() => drawer.current?.close()}
      >
        Khóa học
      </Link>
      {state === 'authenticated' && user ? (
        <>
          {user.role === 'STUDENT' && (
            <>
              <Link href="/cart" onClick={() => drawer.current?.close()}>
                <Icon name="cart" size={18} />
                Giỏ hàng
              </Link>
              <Link href="/orders" onClick={() => drawer.current?.close()}>
                Đơn đăng ký
              </Link>
            </>
          )}
          {user.role === 'ADMIN' && (
            <Link href="/management/courses" onClick={() => drawer.current?.close()}>
              Quản trị
            </Link>
          )}
          <Link href="/account" onClick={() => drawer.current?.close()}>
            Tài khoản
          </Link>
        </>
      ) : (
        <Link
          href={`/login?next=${encodeURIComponent(returnTo)}`}
          onClick={() => drawer.current?.close()}
        >
          Đăng nhập
        </Link>
      )}
    </>
  );
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Brand />
        <nav className={styles.desktopNav} aria-label="Điều hướng public">
          {navigation}
        </nav>
        <button
          ref={trigger}
          className={`icon-button ${styles.menu}`}
          type="button"
          aria-label="Mở menu"
          aria-haspopup="dialog"
          onClick={() => drawer.current?.showModal()}
        >
          <Icon name="menu" />
        </button>
      </header>
      <main id="main-content">{children}</main>
      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} Mindy Center</span>
        <span>Cùng nhau tiến bộ mỗi ngày.</span>
      </footer>
      <dialog
        ref={drawer}
        className={styles.drawer}
        aria-label="Menu Mindy"
        onClose={() => trigger.current?.focus()}
      >
        <div className={styles.drawerHeading}>
          <Brand />
          <button
            className="icon-button"
            type="button"
            aria-label="Đóng menu"
            onClick={() => drawer.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <nav aria-label="Điều hướng mobile">{navigation}</nav>
      </dialog>
    </div>
  );
}
