'use client';

import Link from 'next/link';
import { type ReactNode, useRef } from 'react';
import { canManageUsers, useSession } from '@/features/auth/client';
import { roleLabels } from '@/shared/api/contracts/identity';
import { Brand } from '@/shared/ui/brand';
import { Icon } from '@/shared/ui/icon';
import s from '../(public)/home.module.css';

function SessionLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { user, state, reload } = useSession();
  if (state === 'loading') return <span className="session-placeholder" aria-hidden="true" />;
  if (state === 'error')
    return (
      <button type="button" className="button button-secondary" onClick={() => void reload()}>
        Thử lại phiên đăng nhập
      </button>
    );
  if (state === 'authenticated' && user)
    return (
      <>
        {canManageUsers(user.role) && (
          <Link href="/management/courses" onClick={onNavigate}>
            Quản trị
          </Link>
        )}
        <Link className={s.loginLink} href="/account" onClick={onNavigate}>
          {user.displayName} · {roleLabels[user.role]}
        </Link>
      </>
    );
  return (
    <>
      <Link className={s.loginLink} href="/login" onClick={onNavigate}>
        Đăng nhập
      </Link>
      <Link className="button button-primary" href="/register" onClick={onNavigate}>
        Đăng ký <Icon name="arrow" size={16} />
      </Link>
    </>
  );
}

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useSession();
  const mentor = user?.role === 'MENTOR';
  const manager = user?.role === 'MANAGER';
  return (
    <nav className={s.navigation} aria-label="Điều hướng Mindy">
      <Link href="/" aria-current="page" onClick={onNavigate}>
        <Icon name="book" />
        Trang chủ
      </Link>
      <Link
        href={manager ? '/manager/classes' : mentor ? '/mentor/classes' : '/courses'}
        onClick={onNavigate}
      >
        <Icon name="search" />
        {manager ? 'Lớp học' : mentor ? 'Lớp giảng dạy' : 'Khám phá khóa học'}
      </Link>
      <Link href="/compiler" onClick={onNavigate}>
        <Icon name="chevron" />
        Thực hành mã nguồn
      </Link>
      <Link href="#hanh-trinh" onClick={onNavigate}>
        <Icon name="shield" />
        Cách bắt đầu
      </Link>
      {onNavigate && <SessionLinks onNavigate={onNavigate} />}
    </nav>
  );
}

export function HomeShell({
  children,
  healthCheck,
}: {
  children: ReactNode;
  healthCheck: ReactNode;
}) {
  const { user } = useSession();
  const mentor = user?.role === 'MENTOR';
  const manager = user?.role === 'MANAGER';
  const drawer = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <div className={s.page}>
      <header className={s.header}>
        <div className={s.headerInner}>
          <div className={s.brand}>
            <Brand />
          </div>
          <div className={s.desktopNavigation}>
            <Navigation />
          </div>
          <div className={s.headerActions}>
            <SessionLinks />
            <button
              ref={trigger}
              className={s.menuButton}
              type="button"
              aria-label="Mở trình đơn"
              aria-haspopup="dialog"
              onClick={() => drawer.current?.showModal()}
            >
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>
      <main id="main-content" className={s.main}>
        {children}
      </main>
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.footerIntro}>
            <div className={s.brand}>
              <Brand />
            </div>
            <p>Một nơi để học. Một hành trình để lớn.</p>
            <span>© {new Date().getFullYear()} Trung tâm Mindy</span>
          </div>
          <nav className={s.footerLinks} aria-label="Điều hướng cuối trang">
            <Link href={manager ? '/manager/classes' : mentor ? '/mentor/classes' : '/courses'}>
              {manager ? 'Lớp học' : mentor ? 'Lớp giảng dạy' : 'Khám phá khóa học'}
            </Link>
            <Link href="/compiler">Góc thực hành</Link>
            <Link href="/register">Tạo tài khoản</Link>
          </nav>
          <div className={s.footerNote}>
            <p>Học hỏi. Kết nối. Trưởng thành.</p>
            <span>Cùng nhau tiến bộ mỗi ngày.</span>
            <details className={s.health}>
              <summary>Kiểm tra kết nối hệ thống</summary>
              {healthCheck}
            </details>
          </div>
        </div>
      </footer>
      <dialog
        ref={drawer}
        className={s.drawer}
        aria-label="Trình đơn Mindy"
        onClose={() => trigger.current?.focus()}
      >
        <div className={s.drawerHeading}>
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
        <Navigation onNavigate={() => drawer.current?.close()} />
      </dialog>
    </div>
  );
}
