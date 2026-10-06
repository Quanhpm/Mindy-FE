'use client';

import Link from 'next/link';
import { type ReactNode, useRef } from 'react';
import { Brand } from '@/shared/ui/brand';
import { Icon } from '@/shared/ui/icon';
import s from '../(public)/home.module.css';

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className={s.navigation} aria-label="Điều hướng Mindy">
      <Link href="/" aria-current="page" onClick={onNavigate}>
        <Icon name="book" />
        Trang chủ
      </Link>
      <Link href="/courses" onClick={onNavigate}>
        <Icon name="search" />
        Khám phá khóa học
      </Link>
      <Link href="/compiler" onClick={onNavigate}>
        <Icon name="chevron" />
        Thực hành code
      </Link>
      <Link href="#hanh-trinh" onClick={onNavigate}>
        <Icon name="shield" />
        Cách bắt đầu
      </Link>
      <Link href="/login" onClick={onNavigate}>
        <Icon name="user" />
        Đăng nhập
      </Link>
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
            <Link className={s.loginLink} href="/login">
              Đăng nhập
            </Link>
            <Link className="button button-primary" href="/register">
              Bắt đầu học <Icon name="arrow" size={16} />
            </Link>
            <button
              ref={trigger}
              className={s.menuButton}
              type="button"
              aria-label="Mở menu"
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
            <span>© {new Date().getFullYear()} Mindy Center</span>
          </div>
          <nav className={s.footerLinks} aria-label="Điều hướng cuối trang">
            <Link href="/courses">Khám phá khóa học</Link>
            <Link href="/compiler">Góc thực hành</Link>
            <Link href="/register">Tạo tài khoản</Link>
          </nav>
          <div className={s.footerNote}>
            <p>Learn. Connect. Grow.</p>
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
        aria-label="Menu Mindy"
        onClose={() => trigger.current?.focus()}
      >
        <div className={s.drawerHeading}>
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
        <Navigation onNavigate={() => drawer.current?.close()} />
      </dialog>
    </div>
  );
}
