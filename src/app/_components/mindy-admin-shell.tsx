'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
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
  signingOut,
  onSignOut,
}: {
  children: React.ReactNode;
  user: User;
  navigation: (onNavigate?: () => void) => React.ReactNode;
  error?: string;
  current: string;
  signingOut: boolean;
  onSignOut: () => void;
}) {
  const drawer = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const profile = useRef<HTMLDivElement>(null);
  const profileTrigger = useRef<HTMLButtonElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  useEffect(() => {
    if (!profileOpen) return;
    const outside = (event: PointerEvent | FocusEvent) => {
      if (event.target instanceof Node && !profile.current?.contains(event.target))
        setProfileOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileOpen(false);
        profileTrigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [profileOpen]);
  return (
    <div className={s.page}>
      <aside className={s.sidebar}>
        <Brand />
        <p className={s.sectionLabel}>
          {user.role === 'ADMIN'
            ? 'QUẢN LÝ TRUNG TÂM'
            : user.role === 'MENTOR'
              ? 'KHÔNG GIAN MENTOR'
              : 'KHÔNG GIAN HỌC TẬP'}
        </p>
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
          <Link href={user.role === 'ADMIN' ? '/management/classes' : '/courses'}>
            {user.role === 'ADMIN' ? 'Xem lớp học' : 'Khám phá khóa học'}{' '}
            <Icon name="arrow" size={16} />
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
            <span>
              {user.role === 'ADMIN'
                ? 'Không gian quản trị'
                : user.role === 'MENTOR'
                  ? 'Không gian mentor'
                  : 'Không gian học tập'}
            </span>
            <Icon name="chevron" size={14} />
            <strong>{current}</strong>
          </div>
          <div ref={profile} className={s.profile}>
            <button
              ref={profileTrigger}
              type="button"
              className={s.user}
              aria-label="Mở menu tài khoản"
              aria-expanded={profileOpen}
              aria-controls="profile-dropdown"
              onClick={() => setProfileOpen((value) => !value)}
            >
              <div>
                <strong>{user.displayName}</strong>
                <span>{roleLabels[user.role]}</span>
              </div>
              <Avatar name={user.displayName} />
              <Icon name="chevron" size={16} />
            </button>
            {profileOpen && (
              <div id="profile-dropdown" className={s.profileDropdown}>
                <p>
                  <strong>{user.displayName}</strong>
                  <span>{roleLabels[user.role]}</span>
                </p>
                <Link href="/account" onClick={() => setProfileOpen(false)}>
                  <Icon name="user" size={18} />
                  Tài khoản của tôi
                </Link>
                <Link href="/" onClick={() => setProfileOpen(false)}>
                  <Icon name="book" size={18} />
                  Về trang chủ
                </Link>
                <button type="button" disabled={signingOut} onClick={onSignOut}>
                  <Icon name="logout" size={18} />
                  {signingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
                </button>
              </div>
            )}
          </div>
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
