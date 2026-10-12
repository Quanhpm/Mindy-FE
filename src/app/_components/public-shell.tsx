'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRef } from 'react';
import { safeReturnTo, useSession } from '@/features/auth/client';
import { Brand } from '@/shared/ui/brand';
import { Icon } from '@/shared/ui/icon';
import styles from './public-shell.module.css';

export function PublicShell({ children }: { children: React.ReactNode }) {
  const { user, state, error, reload } = useSession();
  const pathname = usePathname();
  const params = useSearchParams();
  const query = params.toString();
  const returnTo = safeReturnTo(`${pathname}${query ? `?${query}` : ''}`, '/courses');
  const drawer = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const mentor = state === 'authenticated' && user?.role === 'MENTOR';
  const manager = state === 'authenticated' && user?.role === 'MANAGER';
  const courseHref = manager ? '/manager/classes' : mentor ? '/mentor/classes' : '/courses';
  const navigation = (
    <>
      <Link
        href={courseHref}
        aria-current={pathname.startsWith(courseHref) ? 'page' : undefined}
        onClick={() => drawer.current?.close()}
      >
        {manager ? 'Lớp học' : mentor ? 'Lớp giảng dạy' : 'Khóa học'}
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
          {user.role === 'MENTOR' && (
            <Link href="/mentor/cash-orders" onClick={() => drawer.current?.close()}>
              Thu tiền mặt
            </Link>
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
      ) : state === 'loading' ? (
        <span className="session-placeholder" aria-hidden="true" />
      ) : state === 'error' ? (
        <button type="button" className="button button-secondary" onClick={() => void reload()}>
          Thử lại phiên đăng nhập
        </button>
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
          aria-label="Mở trình đơn"
          aria-haspopup="dialog"
          onClick={() => drawer.current?.showModal()}
        >
          <Icon name="menu" />
        </button>
      </header>
      <main id="main-content">
        {state === 'error' && (
          <p className="inline-error" role="alert">
            {error ?? 'Chưa kiểm tra được phiên đăng nhập. Nội dung public vẫn có thể xem.'}
          </p>
        )}
        {children}
      </main>
      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} Trung tâm Mindy</span>
        <span>Cùng nhau tiến bộ mỗi ngày.</span>
      </footer>
      <dialog
        ref={drawer}
        className={styles.drawer}
        aria-label="Trình đơn Mindy"
        onClose={() => trigger.current?.focus()}
      >
        <div className={styles.drawerHeading}>
          <Brand />
          <button
            className="icon-button"
            type="button"
            aria-label="Đóng trình đơn"
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
