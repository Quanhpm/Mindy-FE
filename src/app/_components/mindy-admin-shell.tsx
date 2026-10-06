'use client';
import Link from 'next/link';
import { useRef } from 'react';
import { roleLabels, type User } from '@/shared/api/contracts/identity';
import { Brand } from '@/shared/ui/brand';
import { Icon } from '@/shared/ui/icon';
import { Avatar } from '@/shared/ui/user-display';
import s from './mindy-admin-shell.module.css';

export function MindyAdminShell({
  children,
  user,
  navigation,
  error,
  current,
}: {
  children: React.ReactNode;
  user: User;
  navigation: (onNavigate?: () => void) => React.ReactNode;
  error?: string;
  current: string;
}) {
  const drawer = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <div className={s.page}>
      <aside className={s.sidebar}>
        <Brand />
        <p className={s.sectionLabel}>QUẢN LÝ TRUNG TÂM</p>
        <nav className={s.navigation} aria-label="Điều hướng chính">
          {navigation()}
        </nav>
        <div className={s.tip}>
          <Icon name="book" size={24} />
          <h2>
            Mỗi lớp học,
            <br />
            một khởi đầu.
          </h2>
          <p>Chuẩn bị lộ trình và kết nối người học cùng Mindy.</p>
          <Link href="/management/classes">
            Xem lớp học <Icon name="arrow" size={16} />
          </Link>
        </div>
        <small>© {new Date().getFullYear()} Mindy Coding</small>
      </aside>
      <div className={s.body}>
        <header className={s.topbar}>
          <div className={s.breadcrumb}>
            <button
              ref={trigger}
              type="button"
              className={`icon-button ${s.menu}`}
              aria-label="Mở menu"
              aria-haspopup="dialog"
              onClick={() => drawer.current?.showModal()}
            >
              <Icon name="menu" />
            </button>
            <span>Không gian quản trị</span>
            <Icon name="chevron" size={14} />
            <strong>{current}</strong>
          </div>
          <Link href="/account" className={s.user}>
            <div>
              <strong>{user.displayName}</strong>
              <span>{roleLabels[user.role]}</span>
            </div>
            <Avatar name={user.displayName} />
          </Link>
        </header>
        <main id="main-content" className={s.workspace}>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          {children}
        </main>
      </div>
      <dialog
        ref={drawer}
        className={s.drawer}
        aria-label="Menu Mindy"
        onClose={() => trigger.current?.focus()}
      >
        <div className={s.drawerHeading}>
          <Brand />
          <button
            type="button"
            className="icon-button"
            aria-label="Đóng menu"
            onClick={() => drawer.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <nav className={s.navigation} aria-label="Điều hướng mobile">
          {navigation(() => drawer.current?.close())}
        </nav>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
      </dialog>
    </div>
  );
}
